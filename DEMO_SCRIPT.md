# AI Ideathon 2026 — Demo Presentation Script
## AI-Governed Enterprise Knowledge Assistant
**Presenter:** Meet P. | **Duration:** 10 Minutes | **Audience:** Semi-technical & Non-technical

---

> **Before you start — Prep Checklist:**
> - [ ] Browser open to https://aiideathon.vercel.app
> - [ ] Slack open to your AI_Documentation_Assistant workspace
> - [ ] GCP Console open (optional, for architecture slide)
> - [ ] Font size zoomed in (Ctrl + for browser readability)
> - [ ] Test one question beforehand to confirm backend is live

---

## SEGMENT 1 — Opening Hook (0:00 – 1:00)

*[Speak directly to the audience, no slides needed yet]*

---

**"Let me start with two real conversations that happened on our team."**

"First one — a colleague messages me: *'Hi Meet, do we have any documented standards for app registration naming convention?'* I say I'll check and get back to them. Thirty minutes later: *'I have a call with the team in 10 minutes, can you let me know if you find something?'* I'm now scrambling through shared drives trying to find the right document before their call starts.

Second one — a different colleague: *'Do we have any document that lays out the SLA for application depending on its tier for DR failover?'* I say give me 5 minutes. They reply: *'The EPP team is asking for that doc to set up DR.'* A whole team is blocked, waiting on me to find a document.

These aren't hypothetical scenarios. These are real messages I received. And this happens every week — to me, and to every technical writer and SME at Stewart.

The cost isn't just my time. It's the engineer who can't start their work. The team blocked on a call. The risk that someone gives a wrong answer because they couldn't find the right document in time."

**"Today I'm going to show you how we solved this — in a way that's faster, safer, and fully traceable — using AI."**

---

## SEGMENT 2 — The Problem (1:00 – 2:00)

*[Optional: show a simple slide with two bullet points]*

---

"There are two specific problems we set out to solve:

**Problem one: Employees can't find answers fast.** Stewart's knowledge is locked in hundreds of PDFs and Word documents. A developer needs to know the app registration naming convention before a call — but they don't know which document has it, or even if one exists. A whole team is blocked on DR failover setup waiting for someone to locate the right SLA document. Employees route these questions to SMEs and technical writers — who then have to drop everything to search for answers themselves.

**Problem two: General AI tools are dangerous for enterprise use.** If I ask ChatGPT a question about Stewart's infrastructure, it will give me a confident answer — from the internet. Not from our documents. That answer could be completely wrong, and there's no way to know. No citation. No audit trail. No traceability. That's what we call hallucination — and in a regulated, compliance-driven environment like title insurance and real estate, hallucination is not acceptable.

**The core question we asked ourselves:** How do we give employees fast, accurate answers from approved internal documentation — with every answer cited, verifiable, and governed?"

---

## SEGMENT 3 — Solution Overview (2:00 – 3:00)

*[Start pulling up the web app]*

---

"The answer is what we built: the **AI-Governed Enterprise Knowledge Assistant** — a RAG-based AI system that answers employee questions strictly from approved Stewart documentation.

RAG stands for Retrieval-Augmented Generation — let me explain that in plain English.

Instead of asking AI to guess from its training data, our system does two things:

**Step one:** It searches our approved documents for the most relevant passages — using semantic search, meaning it understands the meaning of your question, not just keywords.

**Step two:** It hands those passages to a large language model and says: *'Answer using ONLY this content.'* The AI is not allowed to go outside the provided documents.

The result? Every answer comes with a numbered citation pointing back to the exact document it came from. Every answer has a confidence rating. And if the documents don't cover the question, the system says so — rather than making something up.

Let me show you this live."

---

## SEGMENT 4 — Live Demo (3:00 – 7:30)

*[Full screen on https://aiideathon.vercel.app]*

---

### Demo Step 1 — First Question with Citations (3:00 – 4:15)

"Here is our enterprise knowledge assistant. You can see it has a clean, branded interface. Let me ask it a real question from our cloud infrastructure documentation."

*[Click the starter chip or type:]*
> **"What is the RAM capacity for Exadata Quarter Rack?"**

*[While it loads — ~5 seconds — narrate:]*
"Right now, behind the scenes, our system is running a semantic search across the approved documents in our knowledge base, pulling the most relevant passages, and sending them to Google's Gemini AI model to synthesize the answer."

*[Answer appears — point out each element:]*

"Look at what we get back:

- **The answer itself** — clear, structured, direct
- **This badge here** — *[point to FULL SUPPORT / PARTIAL SUPPORT badge]* — this is our confidence rating. FULL SUPPORT means the documents clearly covered this question.
- **These numbered citations** — *[point to [1] in the answer text]* — every factual claim is tagged with a source number
- **And down here, the source card** — *[expand it]* — this shows exactly which document the answer came from, with the document title and the exact passage used.

No hallucination. No guessing. Full traceability."

---

### Demo Step 2 — Multi-Turn Conversation (4:15 – 5:00)

"Now watch what happens when I ask a follow-up question. Notice these suggested chips at the bottom — the AI proactively suggests what you're likely to ask next."

*[Click one of the follow-up question chips]*

"I clicked a follow-up, and notice — the system remembered the previous question. This is multi-turn memory. The AI carries the context of our conversation forward, just like talking to a human expert.

This means employees don't have to re-explain context every time they ask a follow-up — the conversation flows naturally."

---

### Demo Step 3 — Governance in Action (5:00 – 5:45)

"Now let me show you something important for governance. I'm going to ask something that is NOT in our approved documents."

*[Type:]*
> **"What is Stewart's current market share in Texas?"**

*[Answer appears — point out NO SUPPORT badge]*

"See that — the system says: *'The information is not available in the approved documentation.'* Red badge. NO SUPPORT.

It does not hallucinate. It does not pull from the internet. It does not make up a plausible-sounding number. It simply says: this is not in the approved documents.

That is enterprise governance by design."

---

### Demo Step 4 — Feedback (5:45 – 6:00)

"Employees can rate every answer with a thumbs up or thumbs down. This feeds into our analytics."

*[Click thumbs up on an answer]*

---

### Demo Step 5 — Analytics Dashboard (6:00 – 6:45)

*[Click Analytics in the left sidebar]*

"This is our real-time session analytics dashboard.

- **Questions asked** and **answers generated** this session
- **Confidence breakdown** — how many answers were fully supported, partially supported, or not supported — this tells knowledge managers which document gaps to fill
- **Satisfaction rate** — based on the thumbs up/down feedback
- **Most referenced documents** — tells you which documents are doing the most work for your employees

This turns the knowledge assistant into a continuous improvement loop. You can see where your documentation is strong, and where it needs work."

---

### Demo Step 6 — Slack Bot (6:45 – 7:30)

*[Switch to Slack]*

"Finally — not everyone will open a web app. Employees live in Slack. So we built a Slack bot.

In any channel in the workspace, I type:"

*[Type in Slack:]*
> `/ask What are the RMI ports for distributed installation?`

*[Hit send — point out immediate acknowledgment message]*

"Notice — within one second, the bot acknowledges the question. No timeout, no waiting. Behind the scenes it's running the full RAG pipeline.

*[Wait for full response — ~10 seconds]*

And here's the full answer — confidence rating, clean text, sources listed, and follow-up suggestions. All inside Slack. No need to leave the tool employees already use."

---

## SEGMENT 5 — Architecture (7:30 – 8:30)

*[Optional: switch to a simple architecture diagram or just speak]*

---

"Let me briefly explain how this is built — I'll keep it simple.

We used **100% Google Cloud Platform**. Here's the stack:

**Google Discovery Engine** — this is the semantic search engine. It indexes our approved documents and finds the most relevant passages when a question comes in. It understands meaning, not just keywords.

**Vertex AI — Gemini 2.5 Flash** — this is the AI model that reads the retrieved passages and generates the cited answer. We give it strict instructions: use only the provided sources.

**Cloud Run** — our backend API runs here. It's serverless — meaning it scales automatically and we only pay when it's actually used.

**React frontend** — deployed on Vercel, globally available.

**Slack API** — for the slash command integration.

Everything runs inside GCP. No data leaves our environment. No external AI services with unknown data handling. Full enterprise data residency."

---

## SEGMENT 6 — Why Not Just Use Microsoft Copilot? (8:30 – 9:15)

---

"A judge might ask — and I'd expect this question: *'Microsoft 365 Copilot now lets you create an AI agent from SharePoint in minutes. Doesn't that already do what you built?'*

And the honest answer is: yes, it does some of it. I actually tested it myself this week. The M365 Copilot agent answers from SharePoint documents, it shows document citations, and it even says 'I couldn't find that in enterprise documentation' when something isn't covered.

But look at the bottom of every single M365 Copilot response — it says: *'AI-generated content may be incorrect.'* That disclaimer is printed on every answer, including the good ones. Microsoft themselves cannot tell you how much to trust the answer.

That is precisely the problem we set out to solve.

Our system doesn't just answer — it tells you *how confident* it is. FULL SUPPORT means two or more distinct document passages support the answer. PARTIAL SUPPORT means one. NO SUPPORT means the documents don't cover it. The user always knows exactly how much weight to put on the answer.

Beyond that:

**On citations:** M365 shows document-level chips — it links to a file. We show sentence-level numbered citations — every factual claim tagged [1] pointing to the exact passage used. That's the difference between 'this came from a document' and 'this specific sentence came from this specific passage on this specific document.'

**On analytics:** M365 has none. We have a real-time dashboard showing confidence breakdown, satisfaction rates, and which documents are being cited most — turning every session into a feedback loop for improving documentation.

**On access:** M365 Copilot requires a Copilot license at approximately $30 per user per month. Our system runs on any browser or Slack — no license required. 100 users for a year: $36,000 for M365, versus roughly $200 in GCP usage for ours.

**The most important point:** The fact that Microsoft just shipped this validates that we identified the right problem at the right time. We just solved it with more governance, more transparency, and less cost."

---

## SEGMENT 7 — Closing (9:15 – 10:00)

---

"So let me bring it back to where we started.

A new team member needs an answer before a client call. With our system, they open the web app or type `/ask` in Slack — and in under 10 seconds they have a cited, confidence-rated answer from approved Stewart documentation. Not a guess from the internet. Not a two-day wait for an SME. A traceable answer they can act on and defend.

**What we built:**
- A production-deployed enterprise knowledge assistant — live at aiideathon.vercel.app
- Built entirely on Google Cloud Platform
- RAG architecture with semantic search, cited answers, and confidence scoring
- Multi-turn conversation memory
- Slack bot integration
- Real-time analytics dashboard
- All within the timeframe of this Ideathon

This isn't a prototype. It isn't a mockup. It's live, it's functional, and it's answering questions right now.

**The question isn't whether AI can help employees find answers faster. It already can. The question is whether we can do it safely, traceably, and governed. We can. And we did.**

Thank you."

*[Pause. Smile. Open to questions.]*

---

## Q&A — Anticipated Questions & Answers

---

**Q: What happens if a wrong document gets indexed?**
> "Great question — that's exactly why we have an approval workflow. Only documents explicitly uploaded to our approved GCS bucket get indexed. A content owner controls what goes in. If a document needs to be removed, it can be purged from the data store and it immediately stops appearing in answers."

**Q: How accurate is it?**
> "Accuracy is bounded by the documents. If the document has the right answer, the system will find and cite it. If it doesn't, the system says so — it doesn't fabricate. We've tested this extensively and the NO SUPPORT response triggers reliably for out-of-scope questions."

**Q: Can it handle follow-up questions about the same topic?**
> "Yes — we demonstrated multi-turn memory. The system carries the last three conversation turns as context, so follow-up questions are understood in relation to what was already discussed."

**Q: What does it cost to run?**
> "The main costs are Discovery Engine search queries and Gemini API calls. At typical enterprise usage, we estimate $50–200/year in GCP costs. Compare that to $36,000/year for M365 Copilot at 100 users."

**Q: Could this be expanded to other document types or departments?**
> "Absolutely. The architecture is document-agnostic. Any PDF, Word, or text file can be ingested. You could create separate data stores per department — HR policies, legal documents, compliance guides — each with its own governed document set."

**Q: Is the data secure?**
> "All data stays within the GCP project. No data is sent to external AI services — Gemini and Discovery Engine are both GCP-native. We also have Cloud IAM controlling all service-to-service access."

---

## Timing Summary

| Segment | Content | Time |
|---|---|---|
| 1 | Opening Hook | 0:00 – 1:00 |
| 2 | Problem Statement | 1:00 – 2:00 |
| 3 | Solution Overview | 2:00 – 3:00 |
| 4 | Live Demo (web + Slack) | 3:00 – 7:30 |
| 5 | Architecture | 7:30 – 8:30 |
| 6 | vs. M365 Copilot | 8:30 – 9:15 |
| 7 | Closing | 9:15 – 10:00 |

---

## Key Phrases to Remember

- *"No hallucination. No guessing. Full traceability."*
- *"Only approved documents can ever appear in an answer."*
- *"Not a prototype. It's live, and it's answering questions right now."*
- *"The question isn't whether AI can help — the question is whether we can do it safely and governed. We can. And we did."*

---

*AI Ideathon 2026 — Stewart Title Guaranty Company*

---

## SECTION 9 — Anticipated Judge Questions: Tech Stack & Architecture

> These questions are very likely to be asked. Answers below are ready to deliver verbatim.

---

**Q: What is your tech stack?**
> "Frontend: React 19 + Vite, hosted on Vercel. Backend: Python FastAPI on Google Cloud Run. AI search: Google Discovery Engine on Vertex AI. AI generation: Gemini 2.5 Flash. Storage: Google Cloud Storage. Messaging: Slack API."

---

**Q: Why did you choose Gemini over OpenAI or ChatGPT?**
> "Two reasons. First, everything stays within GCP — no data leaves our environment, which is critical for enterprise governance. Second, Discovery Engine and Gemini are natively integrated on Vertex AI, so there's no cross-vendor complexity or data transfer between providers."

---

**Q: What is RAG and why use it?**
> "RAG stands for Retrieval-Augmented Generation. Instead of answering from the AI's training data, the system first retrieves relevant passages from our approved documents, then generates an answer using only those passages. This eliminates hallucination by design and makes every answer traceable to a specific source."

---

**Q: What happens if the documents don't cover a question?**
> "The system returns: 'The information is not available in the approved documentation' — with a NO SUPPORT badge. It never fabricates an answer. That's governance by design, not by policy."

---

**Q: How is the Slack bot implemented without hitting the 3-second timeout?**
> "Slack requires a response within 3 seconds or it fails. We return an instant acknowledgment immediately, then run the full RAG pipeline as a background task using FastAPI's BackgroundTasks, and POST the complete result back to Slack via the response_url. The user sees the acknowledgment instantly, then the full cited answer follows in about 10 seconds."

---

**Q: How does semantic search differ from keyword search?**
> "Keyword search matches exact words. Semantic search understands meaning — so a question like 'how much memory does the Quarter Rack have' will find the right passage even if the document says 'RAM capacity' rather than 'memory'. Discovery Engine uses vector embeddings to match by meaning, not text."

---

**Q: Where is the data stored and is it secure?**
> "Approved documents sit in Google Cloud Storage. Discovery Engine indexes them entirely within our GCP project. Cloud IAM controls all service-to-service access. Nothing is sent to external services — Gemini and Discovery Engine are both GCP-native. Full enterprise data residency."

---

**Q: How do you prevent hallucination?**
> "The Gemini prompt explicitly instructs: 'Answer ONLY using the numbered sources below. Do not use knowledge outside these sources.' After generation, citations are validated — if Gemini references a [2] that doesn't exist in the retrieved results, it's stripped from the response. The confidence score is then calculated based on how many valid citations the answer contains."

---

**Q: How does confidence scoring work?**
> "After the answer is generated, we extract citation numbers from the text. FULL SUPPORT means two or more distinct sources were cited. PARTIAL SUPPORT means one source was cited. NO SUPPORT means no valid citations were found — which triggers the fallback message instead of a potentially unsupported answer."

---

**Q: Could this scale to the whole company?**
> "Yes — the architecture is document-agnostic and department-agnostic. You could create separate data stores per department: HR policies, legal documents, compliance guides, IT infrastructure — each with its own approved document set. Cloud Run auto-scales to handle any request volume, and GCP billing is pay-per-use so cost scales proportionally."

---

### Architecture Mental Model (memorize this)

```
User (Web App / Slack)
         ↓
  FastAPI on Cloud Run
         ↓               ↓
Discovery Engine     Gemini 2.5 Flash
 (searches docs)    (generates answer)
         ↓
 Google Cloud Storage
  (approved documents)
```

Every judge question about architecture maps to one of these five layers. Know what each layer does and why you chose it.

---

*AI Ideathon 2026 — Stewart Title Guaranty Company*
