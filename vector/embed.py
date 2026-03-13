import json
import os
import google.generativeai as genai

from ingestion.ingest import load_documents
from ingestion.chunker import chunk_text

# Configure API key
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# Use official embedding model
model = "text-embedding-004"

docs = load_documents("data/approved_docs")

all_chunks = []
for doc in docs:
    chunks = chunk_text(doc)
    all_chunks.extend(chunks)

print(f"Total chunks to embed: {len(all_chunks)}")

output_file = "vector/embeddings.jsonl"

with open(output_file, "w") as f:
    for i, chunk in enumerate(all_chunks):

        response = genai.embed_content(
            model=model,
            content=chunk["content"],
            task_type="retrieval_document"
        )

        embedding = response["embedding"]

        record = {
            "id": chunk["chunk_id"],
            "embedding": embedding,
            "metadata": {
                "document_name": chunk["document_name"],
                "content": chunk["content"]
            }
        }

        f.write(json.dumps(record) + "\n")
        print(f"Embedded chunk {i+1}/{len(all_chunks)}")

print("Embedding generation + file export completed.")
