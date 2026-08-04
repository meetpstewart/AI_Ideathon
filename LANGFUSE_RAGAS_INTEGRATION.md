# Langfuse Tracing + RAGAS Evaluation — Technical Reference

Single source of truth for how observability (Langfuse) and quality evaluation (RAGAS) are wired into the AI Knowledge Assistant. Covers architecture, exact code locations, dependency pins (and why), deployment steps, and known issues.

---

## 1. Why this exists

Before this integration, the RAG pipeline (`ai-backend/main.py`) had:
- **No audit trail** — `/ask` retrieved documents, called Gemini, and returned an answer, but never logged the question, retrieved sources, or generated answer anywhere. Only Cloud Run's infra-level logs existed (status codes/latency, not content).
- **No quality measurement** — the "confidence" badge (`FULL_SUPPORT`/`PARTIAL_SUPPORT`/`NO_SUPPORT`) is a hand-rolled heuristic based on citation count, not a real evaluation of faithfulness or relevance.
- **A feedback UI that did nothing** — the 👍/👎 buttons only updated local React state, never persisted or sent anywhere.

Two additions close these gaps:
1. **Langfuse tracing** — every `/ask` call now produces a structured trace (retrieval span + generation span), giving a permanent, queryable record of what was asked and answered.
2. **RAGAS evaluation** — a fixed "golden" question set is scored offline for faithfulness, answer relevancy, context precision, and context recall, with scores written back onto the matching Langfuse trace.

A third piece, an **in-app Observability tab**, surfaces both of the above directly in the product UI so they can be demoed without switching to the Langfuse dashboard.

---

## 2. Architecture overview

```
┌─────────────┐     POST /ask      ┌──────────────────────────────┐
│  Frontend    │ ─────────────────▶│  ai-backend/main.py (FastAPI) │
│ (App.jsx)    │                    │                               │
└─────────────┘                    │  1. langfuse.trace()          │
                                    │     name="ask_question"       │
                                    │  2. trace.span()               │──▶ Vertex AI Search
                                    │     "vertex-ai-search-retrieval"│    (Discovery Engine)
                                    │  3. trace.generation()          │──▶ Gemini 2.5 Flash
                                    │     "gemini-generation"          │
                                    │  4. trace.update(output=...)    │
                                    │  5. langfuse.flush()            │
                                    └──────────────┬───────────────┘
                                                   │ (sends events async)
                                                   ▼
                                     ┌──────────────────────────┐
                                     │   Langfuse Cloud          │
                                     │   (cloud.langfuse.com)    │
                                     │   - Traces                │
                                     │   - Spans / Generations   │
                                     │   - Scores                │
                                     └────────────┬──────────────┘
                                                   │
                    ┌──────────────────────────────┼───────────────────────────┐
                    ▼                              ▼                           ▼
      ┌───────────────────────┐    ┌───────────────────────────┐   ┌────────────────────┐
      │ evaluation/            │    │ GET /observability/recent │   │ Langfuse Dashboard  │
      │ run_ragas_eval.py       │    │ (main.py, proxies         │   │ (external UI, for   │
      │ - runs golden set       │───▶│  Langfuse's public API)   │──▶│  deep-dive debugging)│
      │ - scores w/ RAGAS       │    │ - returns recent traces    │   └────────────────────┘
      │ - pushes scores back    │    │   + attached RAGAS scores │
      │   via langfuse.score()  │    └─────────────┬──────────────┘
      └───────────────────────┘                    │
                                                    ▼
                                      ┌───────────────────────────┐
                                      │ Frontend Observability tab │
                                      │ (App.jsx, ObservabilityView)│
                                      └───────────────────────────┘
```

---

## 3. Langfuse tracing

### 3.1 Client initialization

**File:** [`ai-backend/main.py`](ai-backend/main.py) (near the top, module level)

```python
LANGFUSE_PUBLIC_KEY = os.environ.get("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET_KEY = os.environ.get("LANGFUSE_SECRET_KEY", "")
LANGFUSE_HOST = os.environ.get("LANGFUSE_BASE_URL") or os.environ.get("LANGFUSE_HOST") or "https://cloud.langfuse.com"

langfuse = Langfuse(
    public_key=LANGFUSE_PUBLIC_KEY,
    secret_key=LANGFUSE_SECRET_KEY,
    host=LANGFUSE_HOST,
    debug=True,
)
```

- Client config is passed **explicitly** rather than relying on the SDK auto-reading env vars, because different Langfuse SDK versions have used different env var names (`LANGFUSE_HOST` in v2, `LANGFUSE_BASE_URL` in the dashboard's newer generated snippets). Reading both env vars and falling back avoids depending on which convention is in play.
- `debug=True` enables verbose SDK logging — this was essential for diagnosing a silent trace-delivery failure (see §5.3) and is worth keeping on, since Langfuse's SDK is designed to fail silently on delivery problems by default (so a broken observability pipeline never crashes the actual app) — without debug logging, a real auth/network failure would be invisible.

### 3.2 Instrumentation inside `/ask`

**File:** [`ai-backend/main.py`](ai-backend/main.py), function `ask_question()`

The trace tree created per request:

```
ask_question                              (trace, root)
 ├── vertex-ai-search-retrieval            (span)
 └── gemini-generation                     (generation)
```

Key implementation points:

1. **Trace created at the top of the function**, capturing the question and conversation history as input:
   ```python
   trace = langfuse.trace(
       name="ask_question",
       input={"query": request.query, "conversation_history": [m.dict() for m in request.conversation_history]},
   )
   ```
2. **Retrieval span** wraps the Vertex AI Search call, closed with the number of sources and full source list as output:
   ```python
   retrieval_span = trace.span(name="vertex-ai-search-retrieval", input={"query": request.query})
   response = search_client.search(search_request)
   # ... build numbered_sources ...
   retrieval_span.end(output={"num_sources": len(numbered_sources), "sources": numbered_sources})
   ```
3. **Generation span** wraps the Gemini call, capturing the *exact* assembled prompt and raw model output:
   ```python
   generation = trace.generation(name="gemini-generation", model="gemini-2.5-flash", input=prompt)
   gemini_response = model.generate_content(prompt)
   raw_output = gemini_response.text.strip()
   generation.end(output=raw_output)
   ```
4. **Trace closed on every return path** — including the early `NO_SUPPORT` exit when nothing is retrieved — with the final response payload as output, and the trace ID included in the API response (`response_payload["trace_id"] = trace.id`) so downstream consumers (the eval script, the observability endpoint) can reference the exact trace:
   ```python
   trace.update(output=response_payload)
   langfuse.flush()
   return response_payload
   ```
5. **`langfuse.flush()` is called explicitly before every return.** This matters specifically because Cloud Run can freeze a container immediately after sending the HTTP response. The Langfuse SDK batches/sends events on a background thread; without an explicit flush, in-flight trace data can be silently dropped when the container freezes mid-send.

### 3.3 Sources carry full content, not just display snippets

**File:** [`ai-backend/main.py`](ai-backend/main.py), inside the retrieval loop

Each entry in `numbered_sources` (and therefore each API response's `sources` array) includes both:
- `snippet` — a ~200-char truncated preview, used for UI display
- `full_content` — the complete, untruncated extractive segment text

`full_content` was added specifically so the RAGAS eval script can use the *actual* retrieved context (not a truncated preview) when scoring faithfulness/context precision — using the snippet there would understate/misjudge how well the answer is grounded.

### 3.4 Required environment variables

Set on the Cloud Run service (`ai-knowledge-backend`, region `us-central1`, project `enterprise-rag-504415`):

| Variable | Purpose |
|---|---|
| `LANGFUSE_PUBLIC_KEY` | Langfuse project public key (`pk-lf-...`) |
| `LANGFUSE_SECRET_KEY` | Langfuse project secret key (`sk-lf-...`) |
| `LANGFUSE_BASE_URL` | `https://cloud.langfuse.com` (Langfuse Cloud, not self-hosted) |

To add/update these on an existing Cloud Run revision **without wiping other env vars** (the service also has `SLACK_BOT_TOKEN` set for the Slack integration):

```bash
gcloud run deploy ai-knowledge-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --update-env-vars "LANGFUSE_PUBLIC_KEY=...,LANGFUSE_SECRET_KEY=...,LANGFUSE_BASE_URL=https://cloud.langfuse.com"
```

**Important:** use `--update-env-vars`, never `--set-env-vars` — the latter *replaces the entire env var set*, which would silently delete `SLACK_BOT_TOKEN`.

**Security note:** the Langfuse secret key has at points been shared in plaintext during pairing/debugging sessions. Treat it as needing periodic rotation (Langfuse → Project Settings → API Keys → revoke + create new, then update the Cloud Run env var) as routine hygiene, independent of any specific incident.

---

## 4. RAGAS evaluation

### 4.1 Golden dataset

**File:** [`evaluation/golden_dataset.json`](evaluation/golden_dataset.json)

10 question/ground-truth pairs, all grounded in real text from the two approved documents (`Cloud-Infrastructure_Aris.pdf` — an ARIS PPM cloud infrastructure guide — and `OC_Infra_Funda.pdf` — Oracle Cloud Infrastructure Fundamentals). Ground truths were written by directly reading the source PDFs, not generated/guessed, so scores reflect genuine grounding rather than circular self-agreement.

### 4.2 Evaluation script

**File:** [`evaluation/run_ragas_eval.py`](evaluation/run_ragas_eval.py)

Flow:
1. Loads `golden_dataset.json`.
2. For each question, calls the **live** `/ask` endpoint (not a local/offline pipeline) — this means the eval always reflects exactly what a real user would get, including retrieval + prompt + Gemini generation as actually deployed.
3. Builds a RAGAS-compatible dataset per row: `question`, `answer`, `contexts` (from each source's `full_content`), `ground_truth`, plus the `trace_id` from the response (kept alongside the eval row, not part of the RAGAS dataset itself).
4. Runs `ragas.evaluate()` with four metrics:
   - **Faithfulness** — does the answer's content follow from the retrieved context (no hallucination)?
   - **Answer relevancy** — is the answer actually relevant to the question asked?
   - **Context precision** — are the retrieved passages relevant/well-ranked?
   - **Context recall** — did retrieval surface everything needed to answer, per the ground truth?
5. The **judge model is Gemini 2.5 Flash via Vertex AI** (`ChatVertexAI` + `VertexAIEmbeddings`, both from `langchain_google_vertexai`), reusing the project's existing GCP credentials — deliberately chosen over an OpenAI judge to avoid needing a separate API key, and to keep the whole stack on one cloud provider.
6. Results are saved to `evaluation/eval_results.csv` and a summary is printed.
7. Each row's 4 scores are pushed back to Langfuse via `langfuse.score(trace_id=..., name=f"ragas_{metric}", value=...)`, attaching them to the exact trace that produced that answer.

### 4.3 Running it

Must be run somewhere with the Google Cloud credentials for `enterprise-rag-504415` already available — Cloud Shell is the simplest option (avoids needing local `gcloud auth` setup):

```bash
cd ~/AI_Ideathon
git pull
pip install -r evaluation/requirements.txt --use-deprecated=legacy-resolver
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"
python evaluation/run_ragas_eval.py
```

Notes:
- The `LANGFUSE_*` env vars must be exported **in the Cloud Shell session itself** — they don't carry over from the Cloud Run service's environment, since these are two separate environments. If they're missing, the script still runs and scores locally, but silently skips the Langfuse push (as of the fix in §5.4, it now explicitly reports "Skipping Langfuse score push" rather than falsely claiming success).
- `--use-deprecated=legacy-resolver` is required — see §5 for why the default resolver gets stuck.

### 4.4 Latest results (reference point, not a permanent benchmark)

From a run on 2026-07-18:

| Metric | Score |
|---|---|
| Faithfulness | 0.950–0.989 (varies run to run) |
| Answer Relevancy | 0.821 |
| Context Precision | 0.933–1.000 |
| Context Recall | 1.000 |

**Faithfulness varies between runs on identical input** (0.989 vs 0.950 seen across two consecutive runs) because the RAGAS judge itself is an LLM call (Gemini), and LLM-as-judge scoring isn't perfectly deterministic. A few points of movement on faithfulness specifically should be treated as noise, not a real regression, when comparing across runs.

One question in the golden set triggered a `No statements were generated from the answer` warning during scoring — this is a known RAGAS limitation: the faithfulness metric decomposes an answer into checkable claims, and this doesn't work well for very short, single-fact answers (e.g., a bare port number). Not a bug in this integration.

---

## 5. Dependency version pins — what broke and why

This section exists because every one of these was a real failure encountered while building this integration, each costing a debug cycle. Do not casually loosen these pins without expecting to re-derive the reasoning.

### 5.1 `langfuse<3` (`ai-backend/requirements.txt`, `evaluation/requirements.txt`)

Langfuse shipped a major v3 release that replaced the client API this integration is built against (`langfuse.trace()`, `trace.span()`, `trace.generation()`) with a different OpenTelemetry-based API. With `langfuse` left unpinned, a deploy picked up v3 and every `/ask` call started throwing:
```
AttributeError: 'Langfuse' object has no attribute 'trace'
```
Pinning to the v2.x line (`<3`) restores the API this code is written against.

### 5.2 `langchain-core<0.3`, `langchain-community<0.3`, `langchain-google-vertexai<2`, `langchain-openai<0.2`, `openai<2`, `google-cloud-aiplatform<1.60` (`evaluation/requirements.txt` only)

`ragas` (0.1.x line) unconditionally imports both `langchain_google_vertexai.ChatVertexAI` and `langchain_openai`'s chat models inside its own `__init__.py` chain — regardless of which LLM you actually configure via `llm=`/`embeddings=`. This means the entire langchain ecosystem installed alongside `ragas` has to be internally consistent, even for the unused OpenAI path.

Left unpinned, `pip`'s dependency resolver repeatedly picked mutually incompatible combinations:
1. `langchain-google-vertexai` resolved to a very new version, which forced `langchain-core` up to 1.4.x — but `langchain-core` 1.x removed the `pydantic_v1` compatibility shim that `langchain-community` (and therefore `ragas`) still imports from → `ModuleNotFoundError: No module named 'langchain_core.pydantic_v1'`.
2. Pinning `langchain-core` back down then left `langchain-openai` (still on a new version) expecting `langchain-core>=1.4.9` → `ImportError: cannot import name 'ContextOverflowError'`.
3. Pinning `langchain-openai` down too then surfaced a newer `google-cloud-aiplatform` defining `SafetySettingsType` via Python 3.12's PEP 695 `type X = ...` syntax, which the old `pydantic` v1 compatibility layer inside `langchain-google-vertexai` 1.0.x can't introspect → `RuntimeError: error checking inheritance of SafetySettingsType ... issubclass() arg 1 must be a class`.

The final pin set keeps the entire langchain stack on the mid-2024 generation that `ragas==0.1.22` (via `ragas>=0.1.9,<0.2`) was actually built and tested against. If `ragas` is ever upgraded past the 0.1.x line, expect to redo this whole exercise — check what langchain generation the new `ragas` version's `llms/base.py` imports actually target before touching any of these pins.

### 5.3 `pip install --use-deprecated=legacy-resolver`

With this many interlocking constraints, pip's default (backtracking) resolver would spend a very long time — effectively hanging — trying every combination of `openai`/`langchain-openai`/`langchain-community` versions to find one satisfying every declared constraint simultaneously. The legacy resolver picks the first compatible-looking version per package without doing that exhaustive search, which is far faster and, combined with the explicit pins above, converges on a working environment. It does print "does not consider dependency conflicts" warnings — read those warnings each time regardless, since they're what previously revealed which package needed pinning next.

### 5.4 Silent Langfuse push failures don't look like failures

Two distinct silent-failure modes were hit:
1. **Cloud Shell not having the Langfuse env vars** → `run_ragas_eval.py`'s original version printed "Scores also pushed to Langfuse" unconditionally, even when the Langfuse client had silently disabled itself. Fixed by explicitly checking for the env vars and reporting one of two distinct outcomes ("Pushed N scores" vs. "Skipping Langfuse score push: ... not set").
2. **The SDK's default fail-silently design** — Langfuse's client swallows trace-delivery errors by default so a broken observability pipeline can't crash the actual app. This is the right default for production, but makes debugging the pipeline itself hard. `debug=True` on the client (see §3.1) is what actually surfaces the real HTTP request/response when something's wrong, rather than a generic no-op.

---

## 6. In-app Observability tab

Rather than requiring the Langfuse dashboard to demo tracing/evaluation, a tab was added directly to the product.

### 6.1 Backend: `GET /observability/recent`

**File:** [`ai-backend/main.py`](ai-backend/main.py)

Proxies Langfuse's own **public REST API** (the same API its dashboard is built on) server-side, so the Langfuse secret key never reaches the frontend:

1. `GET {LANGFUSE_HOST}/api/public/traces` — recent traces named `ask_question`, most recent first.
2. `GET {LANGFUSE_HOST}/api/public/scores` — all scores, filtered client-side to those whose name starts with `ragas_`, indexed by `traceId`.
3. Merges the two into a simplified response: `{trace_id, timestamp, question, answer, confidence, grounded_documents, latency, ragas_scores: {faithfulness, answer_relevancy, context_precision, context_recall}}`.

Requires the `requests` package (added to `ai-backend/requirements.txt`).

**Resolved issue (2026-07-25):** the endpoint initially returned a 500 in production. Root cause, found via `gcloud logging read ... severity>=ERROR` (plain `logs read` + `grep` missed it — see note below): the call to `GET /api/public/scores` requested `limit=500`, but Langfuse's public API caps `limit` at 100 (`400 Bad Request: "Too big: expected number to be <=100"`). Fixed by capping the request to `limit=100`.

**Debugging note for next time:** `gcloud run services logs read ... | grep "Traceback"` failed to surface this error even with `--limit 300`, because the Langfuse SDK's `debug=True` queue-polling log line (`~0 items in the Langfuse queue`) fires roughly once per second and buries everything else within seconds. The fix that worked: query Cloud Logging directly for `severity>=ERROR`, which filters server-side before returning results, instead of tailing N raw lines and grepping locally:
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ai-knowledge-backend" AND severity>=ERROR' --limit 20 --freshness=30m --format=json
```
Also useful for isolating a specific endpoint's 400/500 error independent of app-level logging: hitting the failing external API call directly with `curl` (same URL, same auth) surfaces the exact response body Langfuse (or any external API) sent back, which is often more precise than whatever the wrapping `requests.exceptions.HTTPError` message shows.

### 6.2 Frontend: `ObservabilityView`

**File:** [`ai-frontend/src/App.jsx`](ai-frontend/src/App.jsx)

- New nav item "Observability" (between "Analytics" and "Settings"), rendered when `activeNav === "Observability"`.
- On mount, fetches `${BACKEND_BASE_URL}/observability/recent?limit=20`.
- Renders a table: Question / Confidence (color-coded, matching the existing confidence badge palette) / Sources count / RAGAS scores (as small pill badges, or "not evaluated" if the trace was never scored) / Latency / Timestamp.
- Reuses the existing Stewart-branded design tokens (`TEAL`, `GRAY_BORDER`, etc.) already defined at the top of `App.jsx`, so it's visually consistent with the rest of the app rather than a bolted-on page.

**Important distinction to communicate whenever this is demoed:** the *tracing* half of this tab is genuinely live — any question asked through the real site shows up here. The *RAGAS scores* half only exists for the 10 fixed golden-set questions that have actually been run through `evaluation/run_ragas_eval.py` — a brand-new question asked live will show up with `"not evaluated"` in the RAGAS column, since scoring is a manual/offline process, not wired into the live request path.

---

## 7. Where this fits in the bigger picture

This closes two of the five priority upgrades identified for making the project interview/demo-ready (tracing = auditability, evaluation = provable quality). Remaining, in suggested order:
- **MCP server** — expose `/ask` as an MCP tool (cheap, independent of the others).
- **LangGraph planner** — replace the current always-retrieve-then-generate pipeline with a routing step (retrieve vs. answer directly vs. ask for clarification) — the biggest lift, but the most architecturally meaningful one.
- **MLflow experiment tracking** — track chunking/top-k/prompt-template experiments against the RAGAS metrics established here. Deliberately sequenced *after* RAGAS, since without existing quality metrics to compare against, MLflow would just be tracking parameters with nothing meaningful to evaluate them by.
