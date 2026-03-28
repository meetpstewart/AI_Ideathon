# AI Ideathon 2026 — Project Submission
## Stewart Title Guaranty Company

**Submitted by:** Meet P.
**Submission Date:** March 31, 2026
**Project Name:** AI-Governed Enterprise Knowledge Assistant
**Live Demo:** https://aiideathon.vercel.app
**Source Code:** https://github.com/meetpstewart/AI_Ideathon

---

## 1. Problem Statement

Enterprise documentation at Stewart is spread across hundreds of PDF and Word files — difficult to search, dependent on subject matter experts, and inaccessible to most employees. When teams attempt to use general-purpose AI tools (like ChatGPT) to answer internal questions, they face two critical risks:

- **Hallucination** — the AI answers from its training data, not from Stewart's actual documents, producing plausible but potentially wrong information
- **No traceability** — there is no way to verify or audit where an AI answer came from, violating enterprise governance and compliance standards

**The core problem:** *How do we give employees fast, accurate answers from internal documentation — without hallucination risk and with full traceability?*

---

## 2. Solution Overview

The **AI-Governed Enterprise Knowledge Assistant** is a RAG-based (Retrieval-Augmented Generation) AI system that answers employee questions strictly from approved Stewart documentation — with every answer cited, traceable, and confidence-rated.

### How It Works (in plain language)

> A user asks: *"What is the RAM capacity for Exadata Quarter Rack?"*
>
> Instead of asking an AI to guess from its training data, the system first **searches our approved documents** for the most relevant passages, then hands those passages to the AI and says: *"Answer using only this."* The AI responds with the answer and a citation pointing back to the exact document it used.

### What Makes It Different

| Feature | Generic AI (ChatGPT, etc.) | Our System |
|---|---|---|
| Source of answers | AI training data (internet) | Approved Stewart documents only |
| Hallucination risk | High | Eliminated by design |
| Traceability | None | Every answer cited to source document |
| Confidence rating | None | FULL / PARTIAL / NO SUPPORT |
| Enterprise governance | None | Built-in — no data leaves GCP |
| Conversation memory | Session-based | Multi-turn with context |
| Access channels | Web only | Web UI + Slack bot |

### Key Features Delivered

- **Cited answers** — every response includes numbered citations `[1]` linked to source documents
- **Confidence scoring** — answers rated FULL SUPPORT, PARTIAL SUPPORT, or NO SUPPORT based on document coverage
- **Multi-turn conversation** — follow-up questions maintain full context (last 3 turns)
- **Suggested follow-ups** — AI proactively suggests 3 related questions after each answer
- **Thumbs up/down feedback** — per-answer helpfulness rating
- **Session analytics** — real-time dashboard showing confidence breakdown, satisfaction rate, top referenced documents
- **Slack bot integration** — `/ask` slash command works in any Slack channel
- **Stewart-branded UI** — full enterprise design with official branding, colors, and logo

---

## 3. Architecture Design

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + Vite, hosted on Vercel | Web UI — chat, analytics, branding |
| Backend | Python FastAPI on Google Cloud Run | REST API, RAG orchestration |
| AI Search | Google Discovery Engine (Vertex AI) | Semantic document search + retrieval |
| AI Generation | Gemini 2.5 Flash (Vertex AI) | Answer synthesis + follow-up generation |
| Embeddings | text-embedding-004 (Vertex AI) | Document vectorization (offline) |
| Storage | Google Cloud Storage | Approved documents + embeddings |
| Messaging | Slack API (slash commands) | Bot integration for `/ask` |

### Google Cloud Services Used

| GCP Service | Role in the System |
|---|---|
| **Vertex AI — Gemini 2.5 Flash** | Generates grounded answers from retrieved document context |
| **Vertex AI — Discovery Engine** | Indexes documents and performs semantic search at query time |
| **Vertex AI — text-embedding-004** | Converts document chunks to vectors for semantic indexing |
| **Cloud Run** | Hosts the FastAPI backend as a serverless, auto-scaling container |
| **Cloud Storage (GCS)** | Stores approved documents and generated embeddings |
| **Cloud Build** | Builds Docker container images on deployment |
| **Artifact Registry** | Stores built container images |
| **Cloud IAM** | Controls service-to-service authentication |

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   User Interfaces                   │
│                                                     │
│    React Web App               Slack Bot            │
│  aiideathon.vercel.app        /ask command          │
└────────────────┬────────────────────┬───────────────┘
                 │  HTTPS             │  HTTPS
                 ▼                    ▼
┌─────────────────────────────────────────────────────┐
│              Google Cloud Run                       │
│           FastAPI Backend (Python 3.11)             │
│                                                     │
│   POST /ask               POST /slack/ask           │
│   ─────────               ──────────────            │
│   1. Receive query        1. Return instant ACK     │
│   2. Search Discovery     2. Run RAG in background  │
│      Engine               3. Post result to Slack   │
│   3. Build cited prompt                             │
│   4. Call Gemini                                    │
│   5. Return response                                │
└───────────────┬─────────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│  Discovery   │    │  Vertex AI       │
│  Engine      │    │  Gemini 2.5 Flash│
│              │    │                  │
│  Semantic    │    │  Grounded answer │
│  search      │    │  + follow-ups    │
│  Top 3 docs  │    │  generation      │
└──────┬───────┘    └──────────────────┘
       │
       ▼ (indexed from)
┌──────────────────────────────┐
│     Google Cloud Storage     │
│  gs://ai-ideathon-2026-vectors│
│                              │
│  Approved Documents:         │
│  - Cloud Infrastructure PDFs │
│  - App Service DOCX files    │
│  - OC Infrastructure guides  │
└──────────────────────────────┘
```

### RAG Pipeline — How Answers Are Generated

```
User Question
    │
    ▼
Discovery Engine searches indexed documents
    │
    ▼
Top 3 most relevant document passages retrieved
    │
    ▼
Numbered context block built:
  [1] Source: Cloud Infrastructure — "The Quarter Rack has 1440 GB RAM..."
  [2] Source: App Service Guide — "..."
    │
    ▼
Gemini prompt constructed:
  "Answer ONLY using the numbered sources below.
   Use citation format [1]. Do not use knowledge outside these sources."
    │
    ▼
Gemini generates answer + 3 follow-up questions
    │
    ▼
Citations extracted, validated, confidence calculated
    │
    ▼
Response returned:
  {
    answer: "The Quarter Rack has 1440 GB RAM [1].",
    confidence: "FULL_SUPPORT",
    sources: [{id:1, title:"Cloud Infrastructure", snippet:"..."}],
    follow_up_questions: ["What about the Half Rack?", ...]
  }
```

### Document Ingestion Pipeline (Offline)

```
Approved PDFs / DOCX files
    ↓
Text extraction (python-docx, pypdf)
    ↓
Token-aware chunking — 700 tokens, 100-token overlap (tiktoken)
    ↓
Embedding generation — text-embedding-004 (Vertex AI)
    ↓
Stored in GCS → Indexed by Discovery Engine
```

### Deployment Architecture

```
Developer pushes code to GitHub (main branch)
    │
    ├──→ Vercel detects push → auto-builds React app → deploys to CDN
    │
    └──→ Engineer runs gcloud deploy → Cloud Build builds Docker image
                                    → Cloud Run serves new revision
```

---

## 4. Working Demonstration

### Live URLs

| | URL |
|---|---|
| **Web Application** | https://aiideathon.vercel.app |
| **Backend Health Check** | https://ai-knowledge-backend-655994006172.us-central1.run.app |
| **Slack** | `/ask` in AI_Documentation_Assistant workspace |

### Demo Script

**Step 1 — Open the web app**
> Navigate to https://aiideathon.vercel.app

**Step 2 — Ask a question from the starter chips or type your own**
> Click: *"What are the RMI ports for distributed installation?"*
> - Observe: Answer appears with `[1]` citations
> - Observe: FULL/PARTIAL SUPPORT badge shown
> - Observe: Source document card expandable below
> - Observe: 3 follow-up question chips appear

**Step 3 — Click a follow-up chip**
> Click one of the suggested follow-up questions
> - Observe: Conversation continues with context from previous turn
> - Observe: Answer references the previous discussion (multi-turn memory)

**Step 4 — Rate the answer**
> Click 👍 or 👎 on any response

**Step 5 — View Analytics**
> Click **Analytics** in the left sidebar
> - Observe: Questions asked, answers generated
> - Observe: Confidence breakdown bar chart
> - Observe: Satisfaction rate from feedback
> - Observe: Most referenced documents list

**Step 6 — Slack demo**
> In the Slack workspace, type in any channel:
> ```
> /ask What is the total RAM capacity for Exadata System Configuration?
> ```
> - Observe: Immediate acknowledgment message (< 1 second)
> - Observe: Full answer posted with confidence emoji, sources, and follow-up suggestions

### Governance & Safety Demo Points

- Ask a question **not covered** in the documents → System responds: *"The information is not available in the approved documentation."* — it does not hallucinate
- Show the **NO SUPPORT** confidence badge when triggered
- Show **source cards** — every claim traceable to an exact document with title and link

---

## Summary

This project demonstrates a **production-deployed, enterprise-grade AI system** built entirely on Google Cloud Platform in the timeframe of the AI Ideathon. It directly addresses a real business problem at Stewart — knowledge accessibility and AI governance — using industry-standard patterns (RAG, grounding, citation tracking) deployed on GCP-native infrastructure.

The system is **live, accessible, and fully functional** at https://aiideathon.vercel.app and via the Slack bot — not a prototype or mockup.

---

*AI Ideathon 2026 — Stewart Title Guaranty Company*
