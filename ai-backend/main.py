from fastapi import FastAPI, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from google.cloud import discoveryengine_v1
from vertexai.generative_models import GenerativeModel
import vertexai
import re
import os
import httpx


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

SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN", "")

SERVING_CONFIG = (
    f"projects/{PROJECT_NUMBER}/locations/{LOCATION}/collections/default_collection/"
    f"dataStores/{DATA_STORE_ID}/servingConfigs/default_serving_config"
)

vertexai.init(project=PROJECT_ID, location="us-central1")
model = GenerativeModel("publishers/google/models/gemini-2.5-flash")


# =========================
# Request / Response Models
# =========================

class ConversationMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class QueryRequest(BaseModel):
    query: str
    conversation_history: List[ConversationMessage] = []


# =========================
# Utility Functions
# =========================

def normalize_citations(answer_text: str):
    """Converts grouped citations like [1, 3, 5] → [1] [3] [5]"""
    def replace_group(match):
        numbers = re.findall(r"\d+", match.group(1))
        return " ".join(f"[{n}]" for n in numbers)
    return re.sub(r"\[(.*?)\]", replace_group, answer_text)


def extract_citations(answer_text: str):
    """Extract single-number citations like [1]"""
    matches = re.findall(r"\[(\d+)\]", answer_text)
    return sorted(set(int(m) for m in matches))


def calculate_confidence(citation_ids):
    if not citation_ids:
        return "NO_SUPPORT"
    if len(citation_ids) >= 2:
        return "FULL_SUPPORT"
    return "PARTIAL_SUPPORT"


def build_conversation_block(history: List[ConversationMessage]) -> str:
    """Format the last 6 messages (3 turns) as conversation context."""
    if not history:
        return ""
    recent = history[-6:]
    lines = []
    for msg in recent:
        label = "User" if msg.role == "user" else "Assistant"
        lines.append(f"{label}: {msg.content}")
    return "\n".join(lines)


def parse_follow_up_questions(raw: str):
    """
    Splits the model output on the FOLLOW_UP_QUESTIONS marker.
    Returns (answer, [q1, q2, q3]).
    """
    marker = "FOLLOW_UP_QUESTIONS:"
    if marker not in raw:
        return raw.strip(), []

    parts = raw.split(marker, 1)
    answer = parts[0].strip()
    questions_block = parts[1].strip()

    questions = []
    for line in questions_block.splitlines():
        line = line.strip()
        # Strip leading "1. " / "- " / "* "
        cleaned = re.sub(r"^[\d]+[.)]\s*|^[-*]\s*", "", line).strip()
        if cleaned and cleaned.endswith("?"):
            questions.append(cleaned)

    return answer, questions[:3]


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
                context_blocks.append(f"""
[{citation_index}]
Source: {title}
Content:
{content}
""")
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
            "sources": [],
            "follow_up_questions": []
        }

    # =========================
    # Build Conversation Context
    # =========================

    conversation_block = build_conversation_block(request.conversation_history)
    conversation_section = ""
    if conversation_block:
        conversation_section = f"""
Conversation so far (for context only — do NOT cite from it):
{conversation_block}

"""

    # =========================
    # Prompt
    # =========================

    prompt = f"""
You are a cloud infrastructure documentation assistant.

{conversation_section}Answer ONLY using the numbered sources below.

Rules:
- Use ONLY citation numbers that exist in the sources provided.
- Use SINGLE citation format like [1] — do NOT group like [1,2].
- Use bullet points when listing multiple items.
- Provide clear, structured answers.
- Take into account the conversation history above to give contextually relevant answers.
- If unsupported by the sources, say: "The information is not available in the approved documentation."

Sources:
{context_text}

Current Question:
{request.query}

After your answer, suggest exactly 3 short follow-up questions the user is likely to ask next, based on this conversation and topic. Format them exactly as:

FOLLOW_UP_QUESTIONS:
1. First follow-up question?
2. Second follow-up question?
3. Third follow-up question?
"""

    gemini_response = model.generate_content(prompt)
    raw_output = gemini_response.text.strip()

    # Parse answer and follow-up questions
    answer, follow_up_questions = parse_follow_up_questions(raw_output)

    # Normalize grouped citations in answer
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
        "sources": cited_sources,
        "follow_up_questions": follow_up_questions
    }


# =========================
# Slack Integration
# =========================

def _run_slack_query(query: str, response_url: str):
    """Background task: run RAG pipeline and post result back to Slack."""
    result = ask_question(QueryRequest(query=query))

    confidence_emoji = {
        "FULL_SUPPORT": ":large_green_circle:",
        "PARTIAL_SUPPORT": ":large_yellow_circle:",
        "NO_SUPPORT": ":red_circle:",
    }.get(result["confidence"], ":white_circle:")

    # Clean citations like [1] from answer text for Slack readability
    clean_answer = re.sub(r"\[\d+\]", "", result["answer"]).strip()

    # Build source lines
    source_lines = ""
    if result["sources"]:
        source_lines = "\n\n*Sources:*\n" + "\n".join(
            f"• [{src['id']}] {src['title']}" for src in result["sources"]
        )

    # Build follow-up suggestions
    followup_lines = ""
    if result["follow_up_questions"]:
        followup_lines = "\n\n*You might also ask:*\n" + "\n".join(
            f"› {q}" for q in result["follow_up_questions"]
        )

    text = (
        f"{confidence_emoji} *{result['confidence'].replace('_', ' ')}*\n\n"
        f"{clean_answer}"
        f"{source_lines}"
        f"{followup_lines}"
    )

    httpx.post(response_url, json={
        "response_type": "in_channel",
        "text": text,
    })


@app.post("/slack/ask")
async def slack_ask(
    background_tasks: BackgroundTasks,
    text: Optional[str] = Form(default=""),
    response_url: Optional[str] = Form(default=None),
    user_name: Optional[str] = Form(default="User"),
):
    query = (text or "").strip()
    if not query:
        return {"response_type": "ephemeral", "text": "Please provide a question. Usage: `/ask <your question>`"}

    if response_url:
        background_tasks.add_task(_run_slack_query, query, response_url)
        return {
            "response_type": "in_channel",
            "text": f":hourglass_flowing_sand: *{user_name} asked:* {query}\n_Searching the knowledge base..._"
        }

    # Fallback: synchronous (no response_url)
    result = ask_question(QueryRequest(query=query))
    clean_answer = re.sub(r"\[\d+\]", "", result["answer"]).strip()
    return {"response_type": "in_channel", "text": clean_answer}
