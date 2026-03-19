# AI-Governed Enterprise Knowledge Assistant
## Complete Technical Project Document — Single Source of Truth

**Project:** AI Ideathon 2026
**Organization:** Stewart Title Guaranty Company
**Cloud Platform:** Google Cloud Platform (GCP)
**Document Version:** 1.0
**Last Updated:** 2026-03-19
**Repository:** https://github.com/meetpstewart/AI_Ideathon

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [GCP Services & Configuration](#6-gcp-services--configuration)
7. [Repository Structure](#7-repository-structure)
8. [Data Ingestion Pipeline](#8-data-ingestion-pipeline)
9. [Embedding Generation](#9-embedding-generation)
10. [RAG Pipeline — Deep Dive](#10-rag-pipeline--deep-dive)
11. [Backend Implementation](#11-backend-implementation)
12. [Frontend Implementation](#12-frontend-implementation)
13. [Slack Bot Integration](#13-slack-bot-integration)
14. [API Reference](#14-api-reference)
15. [Deployment Guide](#15-deployment-guide)
16. [Security & Governance](#16-security--governance)
17. [Key AI/ML Concepts Implemented](#17-keyaiml-concepts-implemented)
18. [Feature Inventory](#18-feature-inventory)
19. [End-to-End Workflow](#19-end-to-end-workflow)
20. [Session Analytics](#20-session-analytics)
21. [UI Design System](#21-ui-design-system)
22. [Troubleshooting Reference](#22-troubleshooting-reference)
23. [Job Responsibilities & Skills Demonstrated](#23-job-responsibilities--skills-demonstrated)
24. [Future Enhancements Roadmap](#24-future-enhancements-roadmap)
25. [Glossary](#25-glossary)

---

## 1. Executive Summary

The **AI-Governed Enterprise Knowledge Assistant** is a production-grade, cloud-native AI application built during AI Ideathon 2026 for Stewart Title Guaranty Company. It transforms static enterprise documentation into a governed, interactive knowledge base powered by Retrieval-Augmented Generation (RAG).

The system allows employees and stakeholders to ask natural language questions about cloud infrastructure documentation and receive accurate, cited, traceable answers — without relying on hallucination-prone generic AI models. Every response is grounded exclusively in approved enterprise documents.

**Key outcomes delivered:**
- AI answers grounded 100% in approved documentation
- Citation-level traceability for every response
- Governed, auditable AI without model training on enterprise data
- Multi-channel access: Web UI + Slack bot
- Real-time session analytics and feedback collection
- Enterprise-grade Stewart branding and UI/UX

---

## 2. Problem Statement

### The Enterprise Documentation Challenge

Enterprise organizations like Stewart Title face a critical challenge with internal documentation:

| Pain Point | Impact |
|---|---|
| Documentation spread across hundreds of files | Employees waste time searching |
| Knowledge locked in PDFs and Word documents | Inaccessible to non-technical users |
| Dependence on Subject Matter Experts (SMEs) | Bottleneck; knowledge loss risk |
| Generic AI (ChatGPT, etc.) answers from training data | Hallucination risk; outdated info |
| No traceability on AI answers | Compliance and governance risk |
| No usage analytics | No visibility into knowledge gaps |

### Why Generic AI Fails for Enterprise

When users ask an off-the-shelf LLM about internal infrastructure:
- It answers from its training data (which doesn't include your internal docs)
- It may hallucinate convincing but wrong technical details
- There is no way to audit or cite where an answer came from
- It cannot answer about proprietary, unpublished content

### The Governed AI Requirement

Stewart's enterprise context requires:
- **Deterministic sourcing**: All answers must come from approved documents only
- **Citation traceability**: Every claim must be traceable to a specific document
- **No training on enterprise data**: Zero data leakage to external AI systems
- **Confidence scoring**: Explicit indication when the system is uncertain
- **Auditability**: Track what was asked and what was answered

---

## 3. Solution Overview

### What Was Built

A **RAG-based (Retrieval-Augmented Generation) AI assistant** that:

1. Indexes approved enterprise documents in Google Discovery Engine
2. Retrieves semantically relevant document chunks for any user query
3. Passes only retrieved content to Gemini 2.5 Flash for answer generation
4. Returns the answer with explicit numbered citations, confidence level, and source metadata
5. Suggests follow-up questions based on conversation context
6. Tracks feedback and session analytics
7. Integrates with Slack for chat-based access

### Core Design Principles

1. **RAG-First Architecture** — The model never answers from its parametric memory; only retrieved documents are used
2. **Governance Before Generation** — Documents are approved and indexed before any query can use them
3. **Confidence Transparency** — Every response is labeled FULL_SUPPORT, PARTIAL_SUPPORT, or NO_SUPPORT
4. **No Model Training** — Enterprise data is never used to fine-tune or train any model
5. **Citation-Level Accountability** — Every factual claim in an answer is tied to a specific numbered source
6. **Multi-Turn Memory** — Conversation history is maintained per session for contextually aware follow-ups

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interfaces                          │
│                                                                 │
│   ┌──────────────────────┐     ┌─────────────────────────┐     │
│   │   React Web UI        │     │    Slack Bot (/ask)      │     │
│   │   (Vite + React 19)  │     │   (Slash Command)        │     │
│   └──────────┬───────────┘     └───────────┬─────────────┘     │
└──────────────┼─────────────────────────────┼───────────────────┘
               │ HTTPS POST /ask              │ HTTPS POST /slack/ask
               ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Google Cloud Run                              │
│                                                                 │
│              FastAPI Backend (Python 3.11)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    /ask  endpoint                       │   │
│  │                                                         │   │
│  │  1. Receive query + conversation_history               │   │
│  │  2. Call Discovery Engine (semantic search)            │   │
│  │  3. Extract context blocks + numbered citations        │   │
│  │  4. Build prompt with context + history                │   │
│  │  5. Call Gemini 2.5 Flash                              │   │
│  │  6. Parse answer + follow-up questions                 │   │
│  │  7. Calculate confidence score                         │   │
│  │  8. Return structured JSON response                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
           ┌───────────┴────────────┐
           ▼                        ▼
┌─────────────────────┐   ┌──────────────────────────┐
│  Google Discovery   │   │  Vertex AI               │
│  Engine             │   │  Gemini 2.5 Flash        │
│                     │   │                          │
│  - Document index   │   │  - Answer generation     │
│  - Semantic search  │   │  - Follow-up questions   │
│  - Extractive       │   │  - Context-aware         │
│    answers          │   │    multi-turn responses  │
│  - GCS-backed       │   │                          │
└─────────────────────┘   └──────────────────────────┘
           ▲
           │ (indexed from)
┌─────────────────────┐
│  Google Cloud       │
│  Storage            │
│                     │
│  gs://ai-ideathon-  │
│  2026-vectors       │
│                     │
│  Approved Documents:│
│  - PDF files        │
│  - DOCX files       │
└─────────────────────┘
```

### 4.2 Document Processing Pipeline (Offline)

```
Approved Documents (PDF/DOCX)
         │
         ▼
    ingest.py
    ─────────────────────
    - python-docx → .docx
    - pypdf → .pdf
    - Outputs: [{document_name, content}]
         │
         ▼
    chunker.py
    ─────────────────────
    - tiktoken tokenization
    - 700-token chunks
    - 100-token overlap
    - Outputs: [{chunk_id, document_name, content}]
         │
         ▼
    embed.py
    ─────────────────────
    - Google text-embedding-004
    - Per-chunk embeddings
    - Outputs: embeddings.jsonl
         │
         ▼
    Google Cloud Storage
    gs://ai-ideathon-2026-vectors/embeddings.jsonl
         │
         ▼
    Discovery Engine Index
    (ingested and indexed for semantic retrieval)
```

### 4.3 Request Lifecycle (Online)

```
User types question in Web UI or /ask in Slack
         │
         ▼
POST /ask { query, conversation_history }
         │
         ▼
Discovery Engine SearchRequest
  ├── serving_config: default_serving_config
  ├── query: <user question>
  ├── page_size: 3
  └── extractive_content_spec
        ├── max_extractive_answer_count: 1
        └── max_extractive_segment_count: 2
         │
         ▼
Discovery Engine returns results
  ├── result[0]: document { title, link, extractive_segments[] }
  ├── result[1]: ...
  └── result[2]: ...
         │
         ▼
Build context_blocks with numbered citations [1], [2], [3]...
Build numbered_sources list for frontend
Build conversation_block from last 6 messages (3 turns)
         │
         ▼
Build Gemini prompt:
  ├── System instructions (citation rules, formatting)
  ├── Conversation history block
  ├── Numbered source blocks
  ├── Current question
  └── FOLLOW_UP_QUESTIONS instruction
         │
         ▼
Gemini 2.5 Flash generates response
         │
         ▼
parse_follow_up_questions() splits on FOLLOW_UP_QUESTIONS: marker
normalize_citations() converts [1,2] → [1] [2]
extract_citations() finds all [N] references in answer
calculate_confidence() from citation count
         │
         ▼
Return JSON:
  {
    question, answer,
    confidence,          ← FULL/PARTIAL/NO_SUPPORT
    grounded_documents,  ← count of cited docs
    citations,           ← [1, 2]
    sources,             ← [{id, title, uri, snippet}]
    follow_up_questions  ← ["Q1?", "Q2?", "Q3?"]
  }
```

---

## 5. Technology Stack

### 5.1 Backend

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Language | Python | 3.11 | Backend runtime |
| Web Framework | FastAPI | Latest | Async REST API |
| ASGI Server | Uvicorn | Latest | Production HTTP server |
| AI Orchestration | Vertex AI SDK | Latest | Gemini model access |
| Search Engine | Google Discovery Engine | v1 | Document retrieval/RAG |
| Form Handling | python-multipart | Latest | Slack Form data parsing |
| HTTP Client | urllib (stdlib) | Built-in | Slack response posting |

### 5.2 Frontend

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 19.2.0 | UI component library |
| Build Tool | Vite | 7.3.1 | Fast dev server + bundler |
| Markdown | react-markdown | 10.1.0 | Render AI responses as markdown |
| Icons | react-icons | 5.5.0 | UI icon components |
| Language | JavaScript (ESM) | ES2022+ | Frontend logic |
| Styling | Inline CSS (React) | — | Styled components pattern |

### 5.3 GCP Services

| Service | Purpose |
|---|---|
| Cloud Run | Serverless container hosting for FastAPI backend |
| Vertex AI Generative Models | Gemini 2.5 Flash for answer generation |
| Vertex AI Discovery Engine | Document indexing + semantic search + RAG |
| Google Cloud Storage | Document and embedding file storage |
| Artifact Registry | Docker container image registry |
| Cloud Build | CI/CD container build pipeline |

### 5.4 Dev Tools & Infrastructure

| Tool | Purpose |
|---|---|
| Docker | Containerization |
| Git + GitHub | Version control |
| ESLint | Frontend code linting |
| tiktoken | Token-aware text chunking |
| python-docx | Word document parsing |
| pypdf | PDF document parsing |
| Slack API | Bot/slash command integration |

---

## 6. GCP Services & Configuration

### 6.1 Project Configuration

```
Project ID:      ai-ideathon-2026
Project Number:  655994006172
Region:          us-central1
Multi-Region:    us (for Discovery Engine)
```

### 6.2 Enabled APIs

```
aiplatform.googleapis.com        ← Vertex AI
discoveryengine.googleapis.com   ← Discovery Engine / Agent Builder
run.googleapis.com               ← Cloud Run
cloudbuild.googleapis.com        ← Cloud Build
storage.googleapis.com           ← Cloud Storage
artifactregistry.googleapis.com  ← Container Registry
```

### 6.3 Cloud Run

```
Service Name:    ai-knowledge-backend
Service URL:     https://ai-knowledge-backend-655994006172.us-central1.run.app
Region:          us-central1
Auth:            Allow unauthenticated (demo mode)
Container Port:  8080
Runtime:         Python 3.11-slim (Docker)
```

### 6.4 Vertex AI Discovery Engine

```
Collection:       default_collection
Data Store ID:    ai-documents-connector_1772155619185_gcs_store
Serving Config:   default_serving_config
Location:         us
API Endpoint:     us-discoveryengine.googleapis.com

Full Serving Config Path:
projects/655994006172/locations/us/collections/default_collection/
dataStores/ai-documents-connector_1772155619185_gcs_store/
servingConfigs/default_serving_config
```

### 6.5 Vertex AI Generative Model

```
Model:     publishers/google/models/gemini-2.5-flash
Init:      vertexai.init(project="ai-ideathon-2026", location="us-central1")
```

### 6.6 Google Cloud Storage

```
Bucket:     gs://ai-ideathon-2026-vectors
Contents:   embeddings.jsonl
Purpose:    Document embeddings; Discovery Engine data source
```

### 6.7 Embedding Model

```
Model:      text-embedding-004
Provider:   Vertex AI / Google
Dimensions: 768
Use:        Offline document embedding generation
```

---

## 7. Repository Structure

```
AI_Ideathon/
│
├── ai-backend/                         # Production FastAPI backend
│   ├── main.py                         # Core RAG API (353 lines)
│   ├── requirements.txt                # Python dependencies
│   └── Dockerfile                      # Container image definition
│
├── ai-frontend/                        # React web application
│   ├── src/
│   │   ├── App.jsx                     # Main app component (752 lines)
│   │   ├── main.jsx                    # React entry point
│   │   ├── index.css                   # Global styles
│   │   ├── App.css                     # Legacy styles
│   │   └── assets/
│   │       └── stewart-logo.svg        # Official Stewart brand logo (SVG)
│   ├── public/
│   │   └── vite.svg
│   ├── index.html                      # HTML shell
│   ├── package.json                    # npm dependencies
│   ├── vite.config.js                  # Vite bundler config
│   └── eslint.config.js                # ESLint flat config
│
├── ingestion/                          # Offline document processing
│   ├── ingest.py                       # PDF + DOCX text extraction
│   └── chunker.py                      # Token-aware semantic chunking
│
├── vector/                             # Offline embedding generation
│   ├── embed.py                        # Generates embeddings via Google API
│   └── embeddings.jsonl                # Pre-computed embeddings output
│
├── data/
│   └── approved_docs/                  # Source enterprise documents
│       ├── OC_Infra_Funda.pdf
│       ├── App Service_v1.docx
│       ├── App Service_v1_(1).docx
│       ├── Cloud-Infrastructure_Aris.docx
│       ├── Cloud-Infrastructure_Aris_(1).docx
│       └── Cloud-Infrastructure_Aris.pdf
│
├── main.py                             # Root embedding service (legacy)
├── requirements.txt                    # Root Python dependencies
├── test_pipeline.py                    # Pipeline validation script
├── Dockerfile                          # Root Dockerfile
├── PROJECT_TECHNICAL_DOCUMENT.md       # This document
└── .claude/
    └── settings.local.json             # Claude Code configuration
```

---

## 8. Data Ingestion Pipeline

### 8.1 Document Loading (`ingestion/ingest.py`)

The ingestion layer handles two document formats:

**DOCX Extraction:**
```python
from docx import Document

def extract_docx_text(file_path):
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
```

**PDF Extraction:**
```python
from pypdf import PdfReader

def extract_pdf_text(file_path):
    reader = PdfReader(file_path)
    return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
```

**Document Loader:**
```python
def load_documents(folder_path):
    # Scans folder for .docx and .pdf files
    # Returns: [{"document_name": str, "content": str}]
```

### 8.2 Semantic Chunking (`ingestion/chunker.py`)

Chunking is critical for RAG quality. Too-large chunks lose precision; too-small chunks lose context.

**Configuration:**
```python
CHUNK_SIZE = 700   # tokens per chunk
OVERLAP    = 100   # overlapping tokens between adjacent chunks
ENCODING   = "cl100k_base"  # tiktoken encoding (same as GPT-4)
```

**Why 700 tokens?**
- Large enough to contain a complete concept or answer
- Small enough to be semantically precise for retrieval
- Fits well within the Discovery Engine extractive answer limits

**Why 100 token overlap?**
- Prevents answers from being split across chunk boundaries
- Ensures continuity when a fact spans two natural paragraphs

**Output format:**
```json
{
  "chunk_id": "Cloud-Infrastructure_Aris.pdf_chunk_3",
  "document_name": "Cloud-Infrastructure_Aris.pdf",
  "content": "The Exadata System Configuration has the following RAM capacities: Quarter Rack: 1440 GB, Half Rack: 2880 GB..."
}
```

---

## 9. Embedding Generation

### 9.1 Process (`vector/embed.py`)

**Model:** `text-embedding-004` (Google / Vertex AI)
- 768-dimensional dense vector embeddings
- Optimized for semantic retrieval tasks
- Free tier available within GCP

**Process:**
1. Load all documents via `ingest.py`
2. Chunk all documents via `chunker.py`
3. For each chunk, call `embed_content(model="models/text-embedding-004", content=chunk)`
4. Append embedding vector + metadata to JSONL file

**Output (`embeddings.jsonl`):**
```json
{"id": "doc_chunk_0", "embedding": [0.021, -0.043, ...768 values], "metadata": {"document_name": "...", "content": "..."}}
{"id": "doc_chunk_1", "embedding": [...], "metadata": {...}}
```

### 9.2 Discovery Engine Indexing

After embeddings are generated and uploaded to GCS:
1. The Discovery Engine data store is configured to point to `gs://ai-ideathon-2026-vectors`
2. Discovery Engine automatically indexes the documents
3. The index supports both keyword and semantic (vector) search
4. At query time, Discovery Engine returns extractive segments — verbatim passages pulled directly from source documents

---

## 10. RAG Pipeline — Deep Dive

### 10.1 What is RAG?

**Retrieval-Augmented Generation (RAG)** is an AI architecture pattern that:

1. **Retrieves** relevant documents/passages based on a user query
2. **Augments** the prompt to the language model with the retrieved content
3. **Generates** an answer using only the provided context — not the model's training memory

**Without RAG (Pure LLM):**
```
User Query → LLM → Answer (from training data = may be wrong/hallucinated)
```

**With RAG:**
```
User Query → Document Search → Relevant Context → LLM + Context → Grounded Answer
```

### 10.2 Why RAG for Enterprise?

| Concern | RAG Solution |
|---|---|
| Hallucination | Model only sees retrieved docs; cannot invent facts not present |
| Stale data | Swap document store; no retraining required |
| Confidentiality | Documents stay in your GCP project; never sent to train external models |
| Traceability | Every answer comes with source citations |
| Compliance | Full audit trail of what documents informed what answers |

### 10.3 Discovery Engine vs Vector Database

This project uses **Google Discovery Engine** instead of a manual vector database (e.g., Pinecone, Weaviate) for several reasons:

| Feature | Discovery Engine | Manual Vector DB |
|---|---|---|
| Managed infrastructure | Fully managed | Requires hosting |
| Search quality | Hybrid (semantic + keyword) | Vector only |
| Extractive answers | Built-in | Custom implementation |
| GCP integration | Native | Requires connector |
| Setup complexity | Low | High |
| Enterprise SLA | Backed by Google | Depends on provider |

### 10.4 Extractive vs Abstractive Answers

**Extractive answers** (used here via Discovery Engine):
- Verbatim passages pulled directly from source documents
- Higher trustworthiness: the text is literally what's in the document
- Lower creativity: exact wording from docs

**Abstractive answers** (done by Gemini):
- The LLM synthesizes/paraphrases the extractive content
- Better readability and multi-source synthesis
- This project uses both: Discovery Engine extracts, Gemini synthesizes

### 10.5 Confidence Scoring Logic

```python
def calculate_confidence(citation_ids):
    if not citation_ids:          return "NO_SUPPORT"     # No docs cited
    if len(citation_ids) >= 2:    return "FULL_SUPPORT"   # 2+ docs cited
    return "PARTIAL_SUPPORT"                               # 1 doc cited
```

**Rationale:**
- **FULL_SUPPORT**: Answer is corroborated by multiple independent documents — high confidence
- **PARTIAL_SUPPORT**: Answer sourced from a single document — moderate confidence
- **NO_SUPPORT**: Answer could not be grounded in any document — low confidence, fallback message

### 10.6 Multi-Turn Conversation Memory

The backend maintains conversation context per session:

```python
def build_conversation_block(history):
    recent = history[-6:]  # Last 6 messages = 3 full turns
    lines = []
    for msg in recent:
        label = "User" if msg.role == "user" else "Assistant"
        lines.append(f"{label}: {msg.content}")
    return "\n".join(lines)
```

This block is injected into the Gemini prompt:
```
Conversation so far (for context only — do NOT cite from it):
User: What are the RMI ports?
Assistant: The RMI ports are...

Current Question:
What about the registry port specifically?
```

The model uses prior context to resolve pronouns, follow-up references, and topic continuity.

### 10.7 Citation Normalization

Gemini sometimes outputs grouped citations like `[1, 2, 3]` instead of separate `[1] [2] [3]`. The backend normalizes this:

```python
def normalize_citations(answer_text: str):
    def replace_group(match):
        numbers = re.findall(r"\d+", match.group(1))
        return " ".join(f"[{n}]" for n in numbers)
    return re.sub(r"\[(.*?)\]", replace_group, answer_text)
```

This ensures the frontend can always reliably parse and render individual clickable citation superscripts.

### 10.8 Follow-Up Question Generation

The prompt instructs Gemini to generate 3 follow-up questions using a structured marker:

```
After your answer, suggest exactly 3 short follow-up questions...

FOLLOW_UP_QUESTIONS:
1. First follow-up question?
2. Second follow-up question?
3. Third follow-up question?
```

The parser splits the response on the `FOLLOW_UP_QUESTIONS:` marker:

```python
def parse_follow_up_questions(raw: str):
    marker = "FOLLOW_UP_QUESTIONS:"
    if marker not in raw:
        return raw.strip(), []
    parts = raw.split(marker, 1)
    answer = parts[0].strip()
    questions = [re.sub(r"^[\d]+[.)]\s*|^[-*]\s*", "", line).strip()
                 for line in parts[1].splitlines()
                 if line.strip().endswith("?")]
    return answer, questions[:3]
```

---

## 11. Backend Implementation

### 11.1 File: `ai-backend/main.py`

#### Initialization

```python
app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],   # Open for demo; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vertexai.init(project=PROJECT_ID, location="us-central1")
model = GenerativeModel("publishers/google/models/gemini-2.5-flash")
```

#### Pydantic Request Models

```python
class ConversationMessage(BaseModel):
    role: str      # "user" or "assistant"
    content: str

class QueryRequest(BaseModel):
    query: str
    conversation_history: List[ConversationMessage] = []
```

Using Pydantic BaseModel provides:
- Automatic request validation
- JSON serialization/deserialization
- API documentation (auto-generated Swagger at `/docs`)
- Type safety at runtime

#### Discovery Engine Search

```python
search_request = discoveryengine_v1.SearchRequest(
    serving_config=SERVING_CONFIG,
    query=request.query,
    page_size=3,
    content_search_spec=discoveryengine_v1.SearchRequest.ContentSearchSpec(
        extractive_content_spec=ExtractiveContentSpec(
            max_extractive_answer_count=1,
            max_extractive_segment_count=2,
        )
    )
)
```

- `page_size=3`: Returns top 3 most relevant documents
- `max_extractive_segment_count=2`: Up to 2 verbatim passages per document
- Results are numbered sequentially to create the citation index

#### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

- `python:3.11-slim`: Minimal Python image (~150MB vs ~900MB for full image)
- Port 8080: Required by Cloud Run
- `--no-cache-dir`: Reduces image size by not caching pip downloads

#### requirements.txt

```
fastapi
uvicorn
python-multipart
google-cloud-discoveryengine
google-cloud-aiplatform
```

- `python-multipart`: Required by FastAPI to parse `Form(...)` parameters (used in `/slack/ask`)
- No version pinning (demo project); pin versions for production stability

---

## 12. Frontend Implementation

### 12.1 Application Structure (`App.jsx`)

The entire frontend is a single-page React application with four tabs:

```
App
├── Header (Stewart navbar + utility bar)
├── Hero Banner (teal gradient)
├── Body
│   ├── Sidebar (navigation + session info)
│   └── Main Content
│       ├── Chat Tab (default active)
│       ├── Analytics Tab
│       ├── Docs Tab (coming soon)
│       └── Settings Tab (coming soon)
└── Footer (Stewart branded)
```

### 12.2 State Management

```javascript
const [question, setQuestion]                       = useState("");          // Input field
const [messages, setMessages]                       = useState([]);          // Chat history
const [loading, setLoading]                         = useState(false);       // Loading state
const [activeNav, setActiveNav]                     = useState("Chat");      // Active tab
const [conversationHistory, setConversationHistory] = useState([]);          // Backend context
```

**Message object schema:**
```javascript
{
  type: "user" | "bot",
  text: string,
  sources: [{id, title, uri, snippet}],     // bot only
  confidence: "FULL_SUPPORT" | ...,         // bot only
  grounded: number,                         // bot only
  followUps: string[],                      // bot only
  feedback: "up" | "down" | null,           // bot only
  id: number                                // timestamp-based ID
}
```

### 12.3 API Integration

```javascript
const response = await fetch(
  "https://ai-backend-655994006172.us-central1.run.app/ask",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: q,
      conversation_history: conversationHistory   // Previous turns sent on every request
    }),
  }
);
```

### 12.4 Key UI Components

#### Citation Renderer
Parses `[1]` markers in markdown and renders them as clickable superscript anchors that scroll to the corresponding source card:
```javascript
const MarkdownWithCitations = ({ text }) => (
  <ReactMarkdown components={{ text({ children }) {
    const parts = children.split(/(\[\d+\])/g);
    // Renders [1] as clickable <sup> elements
  }}}>
    {text}
  </ReactMarkdown>
);
```

#### Confidence Badge
Color-coded pill indicator:
- 🟢 FULL_SUPPORT — green (#16a34a)
- 🟡 PARTIAL_SUPPORT — amber (#d97706)
- 🔴 NO_SUPPORT — Stewart red (#9B1B30)

#### Follow-Up Question Chips
Clickable pill buttons rendered after every bot response. Clicking a chip immediately triggers a new query with that text pre-filled and submitted.

#### Feedback Buttons
Per-message thumbs up/down buttons. State is local (per message ID). Feedback data feeds the Analytics tab.

#### Loading Animation
Three bouncing dots (CSS `@keyframes bounce`) while awaiting backend response, with staggered animation delay per dot for a wave effect.

---

## 13. Slack Bot Integration

### 13.1 Architecture

```
User types /ask <question> in Slack channel
        │
        ▼
Slack API sends HTTP POST to /slack/ask
Form data: { text, response_url, user_name }
        │
        ▼
FastAPI returns immediate response (< 3 seconds, Slack timeout requirement):
"⏳ user asked: <question> — Searching the knowledge base..."
        │
        ▼ (background task spawned)
_run_slack_query(query, response_url)
        │
        ├── Calls ask_question() — same RAG pipeline as web UI
        │
        ▼
Formats response for Slack:
  - Confidence emoji (🟢🟡🔴)
  - Clean answer text (citations stripped)
  - Source list
  - Follow-up suggestions
        │
        ▼
POST to response_url (Slack delayed response API)
with {"response_type": "in_channel", "text": formatted_message}
```

### 13.2 Why Background Tasks?

Slack requires a response within **3 seconds** of receiving the slash command. Our RAG pipeline (Discovery Engine + Gemini) takes 5–15 seconds. The solution:

1. **Immediately** return a "searching..." acknowledgment (< 100ms)
2. **Asynchronously** run the full RAG pipeline as a FastAPI `BackgroundTask`
3. Post the full answer back to Slack via the `response_url` callback

This pattern is standard for building responsive Slack integrations with slow backends.

### 13.3 Slack App Configuration

```json
{
  "display_information": {
    "name": "Knowledge Assistant",
    "background_color": "#00535E"
  },
  "features": {
    "slash_commands": [{
      "command": "/ask",
      "url": "https://ai-knowledge-backend-655994006172.us-central1.run.app/slack/ask",
      "description": "Ask the Knowledge Assistant a question"
    }]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["commands", "chat:write", "chat:write.public"]
    }
  }
}
```

### 13.4 Environment Variable

```bash
SLACK_BOT_TOKEN=xoxb-...   # Set as Cloud Run environment variable
```

The token is stored as a Cloud Run environment variable (not in code) for security.

---

## 14. API Reference

### `GET /`

**Health check endpoint.**

Response:
```json
{"status": "running"}
```

---

### `POST /ask`

**Main RAG query endpoint.**

Request body:
```json
{
  "query": "What is the RAM capacity for Exadata Quarter Rack?",
  "conversation_history": [
    {"role": "user", "content": "Tell me about Exadata configurations"},
    {"role": "assistant", "content": "Exadata offers several rack configurations..."}
  ]
}
```

Response:
```json
{
  "question": "What is the RAM capacity for Exadata Quarter Rack?",
  "answer": "The Exadata Quarter Rack has a RAM capacity of 1440 GB [1].",
  "confidence": "FULL_SUPPORT",
  "grounded_documents": 2,
  "citations": [1, 2],
  "sources": [
    {
      "id": 1,
      "anchor_id": "source-1",
      "title": "Cloud Infrastructure",
      "uri": "gs://ai-ideathon-2026-vectors/...",
      "snippet": "The Quarter Rack configuration includes 1440 GB RAM..."
    }
  ],
  "follow_up_questions": [
    "What is the storage capacity of the Quarter Rack?",
    "How does the Half Rack compare to the Quarter Rack?",
    "What are the CPU specifications for Exadata configurations?"
  ]
}
```

---

### `POST /slack/ask`

**Slack slash command handler.**

Form parameters (sent by Slack):
```
text         = "What is the RAM capacity?"
response_url = "https://hooks.slack.com/commands/..."
user_name    = "meet.mvp77"
```

Immediate response (< 3 seconds):
```json
{
  "response_type": "in_channel",
  "text": "⏳ *meet.mvp77 asked:* What is the RAM capacity?\n_Searching the knowledge base..._"
}
```

Delayed response (posted to response_url):
```
🟢 *FULL SUPPORT*

The Exadata Quarter Rack has a RAM capacity of 1440 GB.

*Sources:*
• [1] Cloud Infrastructure

*You might also ask:*
› What is the storage capacity for Exadata?
› How does the Half Rack differ from the Quarter Rack?
› What are the CPU core counts per rack configuration?
```

---

## 15. Deployment Guide

### 15.1 Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- GitHub account

### 15.2 One-Time GCP Setup

```bash
# Set project
gcloud config set project ai-ideathon-2026

# Enable required APIs
gcloud services enable \
  aiplatform.googleapis.com \
  discoveryengine.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com

# Create GCS bucket
gsutil mb -l us-central1 gs://ai-ideathon-2026-vectors

# Create Discovery Engine data store (via GCP Console or gcloud)
# Agent Builder > Create Data Store > Cloud Storage > point to bucket
```

### 15.3 Document Ingestion & Embedding

```bash
# Install dependencies
pip install python-docx pypdf tiktoken google-generativeai

# Place approved documents in data/approved_docs/
# Run ingestion and embedding
python vector/embed.py

# Upload embeddings to GCS
gsutil cp vector/embeddings.jsonl gs://ai-ideathon-2026-vectors/

# Trigger Discovery Engine re-indexing via Console or API
```

### 15.4 Backend Deployment

```bash
cd ai-backend

# Deploy to Cloud Run
gcloud run deploy ai-knowledge-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "SLACK_BOT_TOKEN=xoxb-your-token-here"

# Verify health
curl https://ai-knowledge-backend-655994006172.us-central1.run.app/
# Expected: {"status": "running"}
```

### 15.5 Frontend Development

```bash
cd ai-frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Access at http://localhost:5173

# Build for production
npm run build
# Output in dist/
```

### 15.6 Frontend Deployment Options

**Option A: GitHub Pages / Netlify / Vercel (Recommended for demo)**
```bash
# Netlify drop: drag and drop dist/ folder to netlify.com/drop
# Vercel: vercel deploy --prod from ai-frontend/
```

**Option B: Cloud Run (same infra)**
```bash
# Add nginx Dockerfile to ai-frontend
gcloud run deploy ai-knowledge-frontend \
  --source ai-frontend/ \
  --region us-central1 \
  --allow-unauthenticated
```

**Option C: GitHub Codespaces (current dev setup)**
- Runs via `npm run dev` with port forwarding
- Access at the Codespace preview URL

### 15.7 Slack Bot Setup

1. Go to https://api.slack.com/apps
2. Click **Create an App** → **From a manifest**
3. Paste the manifest from Section 13.3
4. Click **Install App** → Install to Workspace
5. Copy the **Bot User OAuth Token** (`xoxb-...`)
6. Set it as `SLACK_BOT_TOKEN` in Cloud Run environment variables
7. In any channel, type `/ask <question>`

---

## 16. Security & Governance

### 16.1 Data Governance

| Principle | Implementation |
|---|---|
| No model training | Enterprise documents never used to train/fine-tune any model |
| Data isolation | All data stays within GCP project `ai-ideathon-2026` |
| Approved-only sourcing | Only documents in the indexed data store can appear in answers |
| No external data calls | Backend does not make calls to any third-party data services |

### 16.2 Authentication & Authorization

| Layer | Current (Demo) | Recommended (Production) |
|---|---|---|
| Cloud Run | Public (unauthenticated) | IAP or service account |
| CORS | Allow all origins | Restrict to specific frontend domain |
| Slack token | Cloud Run env var | GCP Secret Manager |
| Discovery Engine | Service account (Cloud Run identity) | Fine-grained IAM |

### 16.3 Secrets Management

```bash
# Production: Store Slack token in Secret Manager
gcloud secrets create slack-bot-token --data-file=token.txt

# Reference in Cloud Run
gcloud run deploy ... \
  --set-secrets "SLACK_BOT_TOKEN=slack-bot-token:latest"
```

### 16.4 AI Governance Features

- **Confidence scoring**: Every response indicates how well-supported it is
- **Citation enforcement**: Prompt instructs model to ONLY cite numbered sources provided
- **Fallback behavior**: If no documents retrieved, returns a structured "not found" response (not a hallucination)
- **Citation validation**: Backend filters out any citation IDs that don't correspond to real retrieved documents
- **Conversation isolation**: History is per-session, per-browser tab; no cross-user data sharing

---

## 17. Key AI/ML Concepts Implemented

### 17.1 Retrieval-Augmented Generation (RAG)
Combining a retrieval system with a generative model. The retrieval grounds the generation in factual, up-to-date, source-traceable content.

### 17.2 Semantic Search
Moving beyond keyword matching to understanding the meaning of queries. Discovery Engine uses vector embeddings to find semantically similar content even if exact keywords don't match.

### 17.3 Text Embeddings
Dense numerical vector representations of text where semantic similarity maps to geometric proximity. Used to index documents and find relevant passages at query time.

### 17.4 Token-Aware Chunking
Splitting documents using token counts (not character counts) to align with LLM context window constraints. Using overlapping chunks to prevent information loss at boundaries.

### 17.5 Extractive vs Abstractive QA
- **Extractive**: Returning verbatim spans from source documents (Discovery Engine)
- **Abstractive**: Synthesizing answers by paraphrasing/combining sources (Gemini)
- This project uses extractive retrieval feeding abstractive generation

### 17.6 Prompt Engineering
Structured system prompts with explicit rules, contextual sections, and output format instructions. Including citation format rules, conversation history injection, and follow-up generation markers.

### 17.7 Grounding
Constraining LLM output to be derived from specific provided context, reducing hallucination risk.

### 17.8 Multi-Turn Conversational AI
Maintaining conversation history and injecting prior turns into each new prompt, enabling contextually coherent follow-up questions and reference resolution.

### 17.9 Confidence Calibration
Quantifying uncertainty in AI responses based on source availability. Communicating confidence levels transparently to users.

### 17.10 Citation Tracking & Traceability
Systematically mapping numbered citations in generated text back to specific source documents with metadata (title, URI, snippet).

### 17.11 Async Task Handling
Using FastAPI BackgroundTasks to decouple slow compute (RAG pipeline) from time-constrained API responses (Slack 3-second timeout).

---

## 18. Feature Inventory

| Feature | Description | Component |
|---|---|---|
| RAG Q&A | Ask questions, get grounded answers | Backend `/ask`, Frontend Chat tab |
| Citation rendering | Clickable `[1]` superscripts linked to source cards | `MarkdownWithCitations` |
| Confidence scoring | FULL / PARTIAL / NO SUPPORT badges | `ConfidenceBadge`, backend `calculate_confidence()` |
| Source cards | Expandable document snippets with titles and links | Chat tab `<details>` |
| Multi-turn memory | Conversation history sent to backend per session | `conversationHistory` state |
| Follow-up questions | 3 clickable question chips after each answer | `FollowUpChips`, `parse_follow_up_questions()` |
| Feedback collection | Thumbs up/down per bot message | `FeedbackButtons`, `handleFeedback()` |
| Session analytics | Real-time stats derived from messages state | `AnalyticsView` component |
| Confidence breakdown | Visual bar chart of full/partial/no support | Analytics tab |
| Satisfaction rate | % positive feedback with progress bar | Analytics tab |
| Top sources chart | Most referenced documents this session | Analytics tab |
| Clear conversation | Reset chat and history | Sidebar button |
| Suggested starters | Pre-built question chips on empty chat | Empty state UI |
| Loading animation | Bouncing dots while waiting for response | CSS `@keyframes bounce` |
| Disabled submit | Send button grayed out while loading | Input state check |
| Slack bot | `/ask` slash command in any Slack channel | `/slack/ask` endpoint |
| Slack follow-ups | Follow-up suggestions included in Slack responses | `_run_slack_query()` |
| Stewart branding | Exact brand colors, logo, navbar, footer | Full UI |
| Responsive layout | Grid and flex layouts adapt to screen size | CSS |

---

## 19. End-to-End Workflow

### Complete User Journey

```
1. SETUP (One-time, offline)
   ├── Engineer uploads approved PDF/DOCX docs to data/approved_docs/
   ├── Runs embed.py → generates embeddings.jsonl
   ├── Uploads embeddings.jsonl to GCS bucket
   ├── Discovery Engine indexes the data store
   └── Cloud Run backend deployed with SLACK_BOT_TOKEN set

2. WEB FLOW
   ├── User opens browser → React SPA loads
   ├── Chat tab shown with 3 starter question chips
   ├── User types question or clicks chip
   ├── Frontend sends POST /ask with query + conversation_history
   ├── Backend queries Discovery Engine for top 3 relevant docs
   ├── Backend builds numbered citation context block
   ├── Backend builds conversation context (last 3 turns)
   ├── Backend calls Gemini 2.5 Flash with structured prompt
   ├── Gemini returns answer + FOLLOW_UP_QUESTIONS block
   ├── Backend parses, normalizes citations, calculates confidence
   ├── Frontend receives JSON response
   ├── UI renders: answer (markdown), confidence badge, source cards, follow-up chips, feedback buttons
   ├── conversationHistory state updated with this turn
   ├── User clicks follow-up chip → cycle repeats
   ├── User clicks 👍/👎 → feedback tracked locally
   └── User clicks Analytics tab → live session stats shown

3. SLACK FLOW
   ├── User types /ask <question> in Slack channel
   ├── Slack POSTs to /slack/ask with text + response_url
   ├── FastAPI immediately returns "⏳ Searching..." (< 3s)
   ├── Background task: full RAG pipeline runs
   ├── Response formatted for Slack (no markdown citations, emoji confidence)
   └── Response POSTed back to Slack via response_url
```

---

## 20. Session Analytics

### Data Model

All analytics are computed in real-time from the `messages` state array — no separate analytics backend required.

```javascript
const analyticsData = (() => {
  const botMessages = messages.filter(m => m.type === "bot" && m.confidence);
  const total    = botMessages.length;
  const full     = botMessages.filter(m => m.confidence === "FULL_SUPPORT").length;
  const partial  = botMessages.filter(m => m.confidence === "PARTIAL_SUPPORT").length;
  const none     = botMessages.filter(m => m.confidence === "NO_SUPPORT").length;
  const thumbsUp = messages.filter(m => m.feedback === "up").length;
  const thumbsDown = messages.filter(m => m.feedback === "down").length;
  const turns    = conversationHistory.filter(m => m.role === "user").length;

  // Tally source appearances
  const sourceCounts = {};
  botMessages.forEach(m => {
    (m.sources || []).forEach(s => {
      sourceCounts[s.title] = (sourceCounts[s.title] || 0) + 1;
    });
  });
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  return { total, full, partial, none, thumbsUp, thumbsDown, turns, topSources };
})();
```

### Analytics Metrics Displayed

| Metric | Description |
|---|---|
| Questions Asked | Total turns in conversation |
| Answers Generated | Total bot responses |
| Helpful Ratings | Count of 👍 feedback |
| Unhelpful Ratings | Count of 👎 feedback |
| Fully Grounded | Count + % of FULL_SUPPORT answers |
| Partially Grounded | Count + % of PARTIAL_SUPPORT answers |
| Not Supported | Count + % of NO_SUPPORT answers |
| Satisfaction Rate | `thumbsUp / (thumbsUp + thumbsDown) * 100` |
| Top Documents | Most frequently cited source documents |

---

## 21. UI Design System

### 21.1 Brand Colors

```javascript
TEAL        = "#005670"   // Primary — Stewart teal (headers, buttons, accents)
TEAL_DARK   = "#003d50"   // Hero banner gradient start
TEAL_LIGHT  = "#e6f2f6"   // Chip backgrounds, AI avatar, hover states
RED         = "#9B1B30"   // Stewart crimson (logo, accents, NO_SUPPORT badge)
WHITE       = "#FFFFFF"   // Cards, chat bubbles, input backgrounds
GRAY_BG     = "#f5f7f8"   // Page background
GRAY_BORDER = "#e0e0e0"   // Card and input borders
TEXT_DARK   = "#231F20"   // Primary text (matches Stewart charcoal)
TEXT_MID    = "#555555"   // Secondary text, labels
FOOTER_BG   = "#111111"   // Dark footer
```

### 21.2 Typography

- Font family: `'Segoe UI', Arial, sans-serif` (matches Stewart.com)
- Heading sizes: 34px (hero), 20px (section), 14px (nav)
- Body: 14px, line-height 1.55–1.65
- Labels/badges: 11–12px, letter-spacing 0.04–0.14em

### 21.3 Component Patterns

- **Cards**: `border-radius: 10-12px`, `box-shadow: 0 1px-2px rgba(0,0,0,0.05-0.08)`
- **Badges**: `border-radius: 999px` (pill shape), color-coded by semantic meaning
- **Buttons**: Hover state via `onMouseEnter`/`onMouseLeave` (inline style toggle)
- **Active state**: `border-left: 4px solid RED` on sidebar nav items

### 21.4 Logo Implementation

The official Stewart SVG logo is stored at `src/assets/stewart-logo.svg` and imported directly:
```javascript
import stewartLogo from "./assets/stewart-logo.svg";

// Navbar
<img src={stewartLogo} alt="Stewart" style={{ height: "36px" }} />

// Footer (inverted white)
<img src={stewartLogo} alt="Stewart" style={{ height: "28px", filter: "brightness(0) invert(1)", opacity: 0.85 }} />
```

The `filter: brightness(0) invert(1)` CSS trick converts the colored logo to white for the dark footer without needing a separate white variant asset.

---

## 22. Troubleshooting Reference

### Cloud Run Container Failed to Start
**Symptom:** `The user-provided container failed to start and listen on the PORT`
**Common causes:**
1. Missing `python-multipart` — FastAPI Form data requires this package
2. Import error in `main.py` — check Cloud Run logs
3. Port mismatch — Dockerfile must use `--port 8080`

**Debug:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-knowledge-backend" \
  --limit=50 --project=ai-ideathon-2026 --format="value(textPayload)"
```

### Slack `/ask` Not Responding
**Symptom:** "The app did not respond" in Slack
**Cause:** Backend returned non-200 or took > 3 seconds without an immediate response
**Solution:** Ensure background task pattern is working; check Cloud Run logs

### gcloud Auth Expired in Cloud Shell
**Symptom:** `You do not currently have an active account selected`
**Solution:**
```bash
gcloud auth login --no-launch-browser
gcloud config set project ai-ideathon-2026
```

### Discovery Engine Returns No Results
**Symptom:** All answers say "not available in approved documentation"
**Causes:**
1. Data store not indexed (re-trigger ingestion)
2. Wrong `DATA_STORE_ID` in `main.py`
3. Documents not uploaded to GCS

### Frontend API Calls Failing (CORS)
**Symptom:** Browser console shows CORS errors
**Solution:** Backend has `allow_origins=["*"]` — should not CORS-block any frontend; check that the API URL in `App.jsx` matches the deployed Cloud Run URL

---

## 23. Job Responsibilities & Skills Demonstrated

The following skills, responsibilities, and knowledge domains are directly demonstrated through this project:

### Cloud Engineering
- Provisioned and configured Google Cloud Platform project from scratch
- Enabled and utilized 5+ GCP APIs
- Deployed containerized applications to Cloud Run
- Configured GCS buckets for document and embedding storage
- Worked with Vertex AI services (Generative Models, Embeddings, Discovery Engine)
- Managed service account authentication and IAM policies
- Used Cloud Build for container CI/CD
- Wrote gcloud CLI commands for deployment automation

### AI / ML Engineering
- Designed and implemented end-to-end RAG (Retrieval-Augmented Generation) pipeline
- Applied text embedding models (text-embedding-004) for document vectorization
- Implemented semantic chunking with token-aware overlap strategy
- Engineered prompts for structured output (citations, follow-ups, confidence)
- Integrated Google Discovery Engine for hybrid semantic/keyword search
- Implemented multi-turn conversational memory management
- Designed AI governance controls (confidence scoring, citation validation, fallback responses)
- Applied extractive and abstractive QA techniques

### Backend Engineering (Python)
- Built production-grade REST API using FastAPI
- Designed Pydantic request/response models with type validation
- Implemented async background tasks for non-blocking Slack integration
- Wrote regex-based parsers for citation normalization and follow-up extraction
- Used Python standard library (urllib, re, json) for HTTP and text processing
- Containerized Python application with Docker (slim images, non-root process)
- Managed Python dependencies with requirements.txt

### Frontend Engineering (React)
- Built full single-page application with React 19 and Vite
- Managed complex multi-type state (messages, conversation history, analytics, feedback)
- Implemented derived/computed state (analytics from messages array)
- Built reusable functional components (ConfidenceBadge, FollowUpChips, FeedbackButtons)
- Integrated markdown rendering with custom citation superscript components
- Applied React hooks: useState, useRef, useEffect
- Implemented responsive layouts with CSS Grid and Flexbox
- Applied brand identity (Stewart color system, SVG logo, typography)
- Handled async API calls with fetch + async/await + error handling

### Integration Engineering
- Integrated Slack API using slash commands and delayed responses
- Configured Slack App via JSON manifest
- Managed OAuth tokens as secure environment variables
- Implemented webhook-based async response pattern for Slack timeout compliance
- Formatted Slack block messages with emoji, bold text, and structured sections

### DevOps / Infrastructure
- Wrote Dockerfiles for Python containerization
- Used Cloud Build for automated container builds
- Managed environment variables securely in Cloud Run
- Followed gitflow with meaningful commit messages
- Maintained clean repository structure separating concerns

### Documentation & Communication
- Authored comprehensive technical documentation (this document)
- Documented API endpoints with request/response schemas
- Wrote architectural diagrams in ASCII/text format
- Documented deployment procedures step-by-step
- Created a single-source-of-truth document for project recreation

### AI Product Design
- Designed user experience for enterprise AI tools
- Applied governance patterns to AI product (confidence, citations, fallbacks)
- Built feedback collection mechanisms for continuous improvement loops
- Created session analytics for product usage insights
- Designed multi-channel access strategy (web + Slack)

---

## 24. Future Enhancements Roadmap

### Near-Term (High Priority)

| Feature | Description | Effort |
|---|---|---|
| Response streaming | Stream Gemini tokens to frontend as they're generated | Medium |
| Document upload UI | Allow users to upload new docs through the web UI | Medium |
| Persistent audit log | Write all queries/responses to BigQuery or Firestore | Medium |
| Authentication | Add Google OAuth or SSO via IAP for access control | Medium |

### Medium-Term

| Feature | Description | Effort |
|---|---|---|
| Microsoft Teams bot | `/ask` command in Teams channels | Medium |
| Multi-language support | Support queries in Spanish, French, etc. | Low |
| Export to PDF | Download current conversation as PDF | Low |
| Document coverage map | Visual heatmap of which docs are queried most | Medium |
| Scheduled re-indexing | Auto-ingest new documents added to GCS | Medium |

### Long-Term

| Feature | Description | Effort |
|---|---|---|
| Fine-tuned embeddings | Domain-specific embedding model for better retrieval | High |
| Hybrid search tuning | Tune keyword/semantic balance in Discovery Engine | Medium |
| Cross-session analytics | Aggregate analytics across all users (BigQuery) | High |
| Admin document manager | Web UI to approve/remove documents from the index | High |
| Confidence calibration | Empirically tune confidence thresholds | Medium |
| A/B testing framework | Test different prompts and measure answer quality | High |

---

## 25. Glossary

| Term | Definition |
|---|---|
| RAG | Retrieval-Augmented Generation — AI pattern combining document search with generative models |
| LLM | Large Language Model — a deep learning model trained on text (e.g., Gemini, GPT-4) |
| Embedding | A dense numerical vector representation of text capturing semantic meaning |
| Chunking | Splitting long documents into smaller overlapping segments for indexing |
| Grounding | Constraining LLM output to a specific set of provided documents |
| Hallucination | When an LLM generates plausible-sounding but factually incorrect information |
| Confidence Scoring | A metric indicating how well an AI answer is supported by source documents |
| Citation | A numbered reference `[1]` linking a claim in an answer to a specific source document |
| Discovery Engine | Google Cloud's enterprise search and RAG service (formerly Vertex AI Search) |
| Extractive Answer | A verbatim passage pulled directly from a source document |
| Abstractive Answer | A synthesized/paraphrased answer generated by combining source content |
| Serving Config | A Discovery Engine configuration specifying search behavior and ranking |
| Cloud Run | Google Cloud's serverless container execution environment |
| FastAPI | A modern Python web framework for building REST APIs with automatic validation |
| Pydantic | Python data validation library used by FastAPI for request/response models |
| CORS | Cross-Origin Resource Sharing — browser security policy for cross-domain API calls |
| Background Task | An async operation executed after the HTTP response is already returned |
| response_url | Slack's callback URL for posting delayed responses to slash commands |
| Token | The basic unit of text processed by LLMs (roughly 0.75 words in English) |
| tiktoken | OpenAI's tokenizer library, used here for token-accurate chunking |
| IAM | Identity and Access Management — GCP's permission system |
| GCS | Google Cloud Storage — object storage for files |
| SSO | Single Sign-On — enterprise authentication system |

---

*This document was generated as part of AI Ideathon 2026. It represents the complete technical record of the AI-Governed Enterprise Knowledge Assistant project, designed to enable full project recreation and serve as a professional reference for all skills and responsibilities demonstrated.*

*© 2026 Stewart Title Guaranty Company — AI Ideathon Project*
