from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from google.cloud import discoveryengine_v1
from vertexai.generative_models import GenerativeModel
import vertexai
import re


# =========================
# App Initialization
# =========================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Demo mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# CONFIG
# =========================

PROJECT_NUMBER = "655994006172"
PROJECT_ID = "ai-ideathon-2026"
LOCATION = "us"
DATA_STORE_ID = "ai-documents-connector_1772155619185_gcs_store"

SERVING_CONFIG = (
    f"projects/{PROJECT_NUMBER}/locations/{LOCATION}/collections/default_collection/"
    f"dataStores/{DATA_STORE_ID}/servingConfigs/default_serving_config"
)

vertexai.init(project=PROJECT_ID, location="us-central1")
model = GenerativeModel("publishers/google/models/gemini-2.5-flash")


class QueryRequest(BaseModel):
    query: str


# =========================
# Utility Functions
# =========================

def normalize_citations(answer_text: str):
    """
    Converts grouped citations like:
    [1, 3, 5] → [1] [3] [5]
    """
    def replace_group(match):
        numbers = re.findall(r"\d+", match.group(1))
        return " ".join(f"[{n}]" for n in numbers)

    return re.sub(r"\[(.*?)\]", replace_group, answer_text)


def extract_citations(answer_text: str):
    """
    Extract single-number citations like [1]
    """
    matches = re.findall(r"\[(\d+)\]", answer_text)
    return sorted(set(int(m) for m in matches))


def calculate_confidence(citation_ids):
    if not citation_ids:
        return "NO_SUPPORT"
    if len(citation_ids) >= 2:
        return "FULL_SUPPORT"
    return "PARTIAL_SUPPORT"


# =========================
# Health Check
# =========================

@app.get("/")
def health():
    return {"status": "running"}


# =========================
# RAG Endpoint
# =========================

@app.post("/ask")
def ask_question(request: QueryRequest):

    search_client = discoveryengine_v1.SearchServiceClient(
        client_options={"api_endpoint": "us-discoveryengine.googleapis.com"}
    )

    search_request = discoveryengine_v1.SearchRequest(
        serving_config=SERVING_CONFIG,
        query=request.query,
        page_size=3,
        content_search_spec=discoveryengine_v1.SearchRequest.ContentSearchSpec(
            extractive_content_spec=discoveryengine_v1.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                max_extractive_answer_count=1,
                max_extractive_segment_count=2,
            )
        )
    )

    response = search_client.search(search_request)

    context_blocks = []
    numbered_sources = []
    citation_index = 1

    for result in response.results:
        doc = result.document
        derived_data = doc.derived_struct_data or {}

        title = derived_data.get("title")
        link = derived_data.get("link")
        extractive_segments = derived_data.get("extractive_segments", [])

        for segment in extractive_segments:
            content = segment.get("content")

            if content:
                # Add numbered context block
                context_blocks.append(f"""
[{citation_index}]
Source: {title}
Content:
{content}
""")

                # Clean snippet for UI preview
                cleaned = content.strip().replace("\n", " ")
                short_snippet = (
                    cleaned[:200] + "..."
                    if len(cleaned) > 200
                    else cleaned
                )

                numbered_sources.append({
                    "id": citation_index,
                    "anchor_id": f"source-{citation_index}",
                    "title": title,
                    "uri": link,
                    "snippet": short_snippet
                })

                citation_index += 1

    context_text = "\n\n".join(context_blocks)

    # If nothing retrieved
    if not context_text.strip():
        return {
            "question": request.query,
            "answer": "The information is not available in the approved documentation.",
            "confidence": "NO_SUPPORT",
            "grounded_documents": 0,
            "citations": [],
            "sources": []
        }

    # =========================
    # Prompt
    # =========================

    prompt = f"""
You are a cloud infrastructure documentation assistant.

Answer ONLY using the numbered sources below.

Rules:
- Use ONLY citation numbers that exist.
- Use SINGLE citation format like [1]
- Do NOT group citations like [1,2]
- Use bullet points when listing multiple items.
- Provide clear, structured answers.
- If unsupported, say:
"The information is not available in the approved documentation."

Sources:
{context_text}

Question:
{request.query}
"""

    gemini_response = model.generate_content(prompt)
    answer = gemini_response.text.strip()

    # Normalize grouped citations
    answer = normalize_citations(answer)

    citation_ids = extract_citations(answer)

    # Remove invalid citations
    valid_ids = {src["id"] for src in numbered_sources}
    citation_ids = [cid for cid in citation_ids if cid in valid_ids]

    cited_sources = [
        src for src in numbered_sources
        if src["id"] in citation_ids
    ]

    confidence = calculate_confidence(citation_ids)

    return {
        "question": request.query,
        "answer": answer,
        "confidence": confidence,
        "grounded_documents": len(cited_sources),
        "citations": citation_ids,
        "sources": cited_sources
    }