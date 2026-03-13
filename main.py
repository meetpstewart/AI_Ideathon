from fastapi import FastAPI
import vertexai
from vertexai.language_models import TextEmbeddingModel
from google.cloud import storage
from google.cloud import aiplatform
from google.auth import default
from google.auth.transport.requests import Request
import requests
import json

from ingestion.ingest import load_documents
from ingestion.chunker import chunk_text


# ==============================
# CONFIGURATION
# ==============================

PROJECT_ID = "ai-ideathon-2026"
LOCATION = "us-central1"

BUCKET_NAME = "ai-ideathon-2026-vectors"

INDEX_ENDPOINT_ID = "3739335691973165056"
DEPLOYED_INDEX_ID = "ai_doc_deployed"

PUBLIC_ENDPOINT_DOMAIN = "1798999864.us-central1-655994006172.vdb.vertexai.goog"


# ==============================
# INITIALIZATION
# ==============================

app = FastAPI()

vertexai.init(project=PROJECT_ID, location=LOCATION)
aiplatform.init(project=PROJECT_ID, location=LOCATION)

embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-004")


# ==============================
# HEALTH CHECK
# ==============================

@app.get("/")
def health():
    return {"status": "AI Knowledge Assistant Running"}


# ==============================
# GENERATE EMBEDDINGS + UPLOAD TO GCS
# ==============================

@app.post("/generate-embeddings")
def generate_embeddings():

    docs = load_documents("data/approved_docs")

    all_chunks = []
    for doc in docs:
        chunks = chunk_text(doc)
        all_chunks.extend(chunks)

    output_file = "/tmp/embeddings.json"

    with open(output_file, "w") as f:
        for chunk in all_chunks:
            embedding = embedding_model.get_embeddings(
                [chunk["content"]]
            )[0].values

            record = {
                "id": chunk["chunk_id"],
                "embedding": embedding,
                "metadata": {
                    "document_name": chunk["document_name"],
                    "content": chunk["content"],
                },
            }

            f.write(json.dumps(record) + "\n")

    # Upload to GCS
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob("embeddings.json")
    blob.upload_from_filename(output_file)

    return {
        "total_chunks": len(all_chunks),
        "message": "Embeddings generated and uploaded to GCS",
        "gcs_path": f"gs://{BUCKET_NAME}/embeddings.json",
    }


# ==============================
# SEMANTIC SEARCH (PUBLIC REST)
# ==============================

@app.post("/search")
def search(query: str):

    # 1️⃣ Generate query embedding
    query_embedding = embedding_model.get_embeddings([query])[0].values

    # 2️⃣ Get access token from Cloud Run service account
    credentials, _ = default()
    credentials.refresh(Request())
    access_token = credentials.token

    # 3️⃣ Build REST URL for Matching Engine
    url = f"https://{PUBLIC_ENDPOINT_DOMAIN}/v1/match"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "deployedIndexId": DEPLOYED_INDEX_ID,
        "queries": [
            {
                "embedding": query_embedding,
                "neighborCount": 5,
            }
        ],
    }

    response = requests.post(url, headers=headers, json=payload)

    return response.json()
