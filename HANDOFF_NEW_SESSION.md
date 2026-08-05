# Handoff Notes — Continuing This Project in a New Claude Session

Paste this file (and point Claude at the repo) when starting a fresh session on a personal machine/account. It covers what a new session won't be able to infer just by reading the code: decisions made, what's next, and things that broke in ways worth not repeating.

**Deep technical reference already lives in the repo — read these first, this file doesn't repeat them:**
- `PROJECT_TECHNICAL_DOCUMENT.md` — original architecture/setup doc
- `LANGFUSE_RAGAS_INTEGRATION.md` — full Langfuse tracing + RAGAS evaluation reference, including the entire dependency-pinning saga and why each pin exists
- `BLOG_LANGFUSE_TRACING.md` / `BLOG_POST_DRAFT.md` — blog material already drafted about the tracing build-out

## What this project is

An AI-Governed Enterprise Knowledge Assistant — a RAG chatbot answering questions from approved cloud infrastructure docs (ARIS PPM + Oracle Cloud Infrastructure Fundamentals), with citations. Built for an internal Ideathon, now also being used as a portfolio/interview-demo project.

**Stack:** FastAPI backend on Cloud Run (`ai-backend/main.py`) → Vertex AI Search (Discovery Engine / "Agent Platform") for retrieval → Gemini 2.5 Flash for generation. React/Vite frontend (`ai-frontend/`) on Vercel. Langfuse for tracing/eval scores. GitHub-hosted.

## Current status (as of 2026-08-05)

- ✅ Core RAG pipeline working (retrieval + generation + citations + confidence badge)
- ✅ Langfuse tracing on every `/ask` call (trace → retrieval span → generation span)
- ✅ RAGAS evaluation pipeline (`evaluation/run_ragas_eval.py`) — golden 10-question set, scores faithfulness/answer relevancy/context precision/context recall, pushes scores back to Langfuse per trace
- ✅ In-app Observability tab (frontend) showing live traces + RAGAS scores, so you don't need to open Langfuse's own dashboard to demo it
- ✅ MCP server (`mcp-server/server.py`) exposing the RAG pipeline as a tool for Claude Desktop / other agents — config verified loading correctly in Claude Desktop, but the actual tool call has never been successfully tested end-to-end because the previous machine's corporate SSL-inspecting proxy blocked the outbound HTTPS call. **This might just work cleanly on a personal machine with no corporate proxy** — worth retesting there before assuming anything's broken.
- ✅ **Just migrated off the original GCP project** (`stewart-ai-ideathon-2026`, free trial expired) to a new one (`enterprise-rag-504415`). New data store uses Vertex AI Search's Layout Parser + image/table annotation (an upgrade — may partially fix a known gap, see below).
- 🔄 **In progress:** migrating this GitHub repo from the company account (`meetpstewart/AI_Ideathon`) to a personal account (`meetp2022/Enterprise_AI_Knowledge_Assistant_2`), and moving the local folder off the company OneDrive path, because company account access is ending.

## Roadmap — what's next, in agreed priority order

This came out of a discussion about which upgrades would be most valuable to demonstrate in technical interviews:

1. ~~Langfuse tracing~~ — done
2. ~~RAGAS evaluation~~ — done
3. ~~MCP server~~ — done (untested end-to-end, see above)
4. **LangGraph planner — next up, not started.** The current pipeline is linear (always retrieve → always generate, even for "hi" or vague questions). The plan: add a router/planner step that classifies each question into one of three paths — (a) retrieve + answer as today, (b) answer directly with no retrieval for greetings/meta-questions, (c) ask a clarifying follow-up question when the query is too vague to retrieve well. This is considered the biggest lift but the most architecturally meaningful upgrade (turns it from "a RAG chatbot" into "a system with an orchestration/decision layer").
5. **MLflow experiment tracking — after LangGraph.** Track chunking/top-k/prompt-template experiments against the RAGAS metrics already established. Deliberately sequenced last since it needs existing quality metrics to compare against — doing it first would just be tracking parameters with nothing meaningful to evaluate them by.

## Known gaps / open items

- **Diagram/figure reading gap** (originally identified): the *old* custom ingestion pipeline (`ingestion/ingest.py`, `vector/embed.py`) only extracts plain text, never images/diagrams — but this pipeline turned out to be dead code for live queries; the real retrieval path is entirely Vertex AI Search's own managed ingestion from the GCS bucket. The new data store enables Layout Parser + image/table annotation, which may substantially fix this — **not yet verified** whether diagram-related questions actually work better now. Worth testing.
- **Feedback buttons (👍/👎) still don't do anything** — confirmed early in this project that they only update local React state, never sent anywhere. Never implemented the fix (would need a `POST /feedback` endpoint + persistent storage, e.g. Firestore).
- **No proper auditability beyond Langfuse** — there's no separate database logging Q&A pairs; Langfuse traces are effectively the audit trail. Fine for now, just worth knowing there's no redundancy if Langfuse access were ever lost.
- **Gemini quota on the new GCP project is much lower than the old one was** — hit repeated 429s running the eval script's 10 questions back-to-back. Added retry-with-backoff + spacing in the eval script as a workaround, but if usage grows, request a Vertex AI quota increase (GCP Console → IAM & Admin → Quotas → search "Generate Content requests per minute").
- **Old GCP project (`stewart-ai-ideathon-2026`)** — dead/inaccessible, not decommissioned yet, but poses no billing risk since the trial expired (no auto-conversion to paid). Optional cleanup: delete it via Console → IAM & Admin → Manage Resources.

## Gotchas worth not re-learning the hard way

- **New GCP projects need far more explicit IAM grants than old established ones.** Migrating hit four separate missing-role errors in a row before `gcloud run deploy --source .` fully worked: `roles/aiplatform.user`, `roles/discoveryengine.viewer`, `roles/logging.logWriter`, `roles/artifactregistry.writer` — all needed on the default compute service account (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`).
- **Cloud Shell sessions are per-Google-account, not shared** — switching Google accounts mid-session doesn't carry over the cloned repo or authenticated `gcloud` state; each account gets its own persistent home directory/VM.
- **Cloud Shell's `gcloud` active account can silently deactivate mid-session** — hit "You do not currently have an active account selected" multiple times despite being credentialed; fix is `gcloud config set account <email>` (or full restart if that fails).
- **`gcloud run deploy --set-env-vars` replaces the entire env var set; `--update-env-vars` merges.** Always use `--update-env-vars` on redeploys unless you intend to wipe existing ones (e.g. `SLACK_BOT_TOKEN`).
- **Unpinned fast-moving LLM-tooling dependencies will break you.** `langfuse` had a breaking v2→v3 API change; `ragas`'s dependency tree (`langchain-core`/`langchain-community`/`langchain-openai`/`langchain-google-vertexai`/`openai`) needed a whole cascade of version caps to avoid mutual incompatibility. All current pins are documented with reasoning in `LANGFUSE_RAGAS_INTEGRATION.md` §5 — don't loosen them without re-reading that section.
- **A data store with "advanced chunking config" enabled rejects `max_extractive_answer_count`** in the Discovery Engine search request — only `max_extractive_segment_count` is allowed. Already fixed in current code, just explains why it's structured that way.
- **Vertex AI Search's console has been renamed** — it's now called "Agent Platform" (search for it in the GCP Console search bar), with the relevant sub-product being "Search" under the "Build" menu, not "RAG Engine" (a different, newer product with a different API that this project's code doesn't use).
- **Corporate-proxy SSL issues (npm, pip, MCP Inspector) were specific to the old Stewart-managed machine.** These should likely just disappear on a personal device — don't assume they'll recur, but don't be surprised if a *different* local environment quirk shows up instead.

## How this user likes to work (optional context, carry over if useful)

- Prefers direct action over lengthy confirmation — moves fast, says "yes"/"let's do it" and expects execution, not more questions, once a plan is clear.
- Wants to be consulted before anything touching certificates, security settings, or Claude Desktop's own configuration — explicitly declined a proposed cert-trust fix earlier and asked to skip local testing instead.
- Cares about this project's portfolio/interview value, not just functional correctness — several build-outs (Langfuse, RAGAS, MCP) were explicitly framed around "what's a good story for a technical interview," not just "does it work."
- Has requested blog-post material as an explicit deliverable more than once — see `BLOG_POST_DRAFT.md` for the established tone/style if writing more.
