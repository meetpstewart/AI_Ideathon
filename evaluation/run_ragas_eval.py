"""
Runs the golden question set against the live /ask endpoint, scores each
answer with RAGAS (faithfulness, answer relevancy, context precision,
context recall), prints a summary table, saves results to CSV, and pushes
the per-question scores back to Langfuse attached to the matching trace.

Usage (from Cloud Shell, with GCP credentials already available):
    pip install -r evaluation/requirements.txt
    python evaluation/run_ragas_eval.py

Requires env vars: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL
(same values already set on the Cloud Run service).
"""

import json
import os

import requests
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_google_vertexai import ChatVertexAI, VertexAIEmbeddings
from langfuse import Langfuse

ASK_ENDPOINT = "https://ai-knowledge-backend-647785858624.us-central1.run.app/ask"
PROJECT_ID = "enterprise-rag-504415"
GOLDEN_DATASET_PATH = os.path.join(os.path.dirname(__file__), "golden_dataset.json")
RESULTS_CSV_PATH = os.path.join(os.path.dirname(__file__), "eval_results.csv")


def ask(question: str) -> dict:
    response = requests.post(ASK_ENDPOINT, json={"query": question, "conversation_history": []})
    response.raise_for_status()
    return response.json()


def build_eval_rows(golden_set: list[dict]) -> list[dict]:
    rows = []
    for item in golden_set:
        result = ask(item["question"])
        contexts = [src["full_content"] for src in result.get("sources", []) if src.get("full_content")]
        rows.append({
            "question": item["question"],
            "answer": result.get("answer", ""),
            "contexts": contexts or [result.get("answer", "")],
            "ground_truth": item["ground_truth"],
            "trace_id": result.get("trace_id"),
        })
        print(f"Answered: {item['question'][:60]}...")
    return rows


def main():
    with open(GOLDEN_DATASET_PATH) as f:
        golden_set = json.load(f)

    print(f"Running {len(golden_set)} questions against {ASK_ENDPOINT}")
    rows = build_eval_rows(golden_set)

    judge_llm = LangchainLLMWrapper(
        ChatVertexAI(model_name="gemini-2.5-flash", project=PROJECT_ID, location="us-central1")
    )
    judge_embeddings = LangchainEmbeddingsWrapper(
        VertexAIEmbeddings(model_name="text-embedding-004", project=PROJECT_ID)
    )

    dataset = Dataset.from_list([
        {"question": r["question"], "answer": r["answer"], "contexts": r["contexts"], "ground_truth": r["ground_truth"]}
        for r in rows
    ])

    print("Scoring with RAGAS (this calls the judge LLM several times per row)...")
    result = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        llm=judge_llm,
        embeddings=judge_embeddings,
    )

    scores_df = result.to_pandas()
    scores_df["trace_id"] = [r["trace_id"] for r in rows]
    scores_df.to_csv(RESULTS_CSV_PATH, index=False)

    print("\n=== RAGAS Summary (mean across all questions) ===")
    for metric in ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]:
        if metric in scores_df.columns:
            print(f"{metric:20s}: {scores_df[metric].mean():.3f}")

    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")

    print(f"\nFull per-question results saved to {RESULTS_CSV_PATH}")

    if not public_key or not secret_key:
        print(
            "\nSkipping Langfuse score push: LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY "
            "not set in this shell's environment. Export them and re-run to attach "
            "scores to each question's trace."
        )
        return

    langfuse = Langfuse(
        public_key=public_key,
        secret_key=secret_key,
        host=os.environ.get("LANGFUSE_BASE_URL") or os.environ.get("LANGFUSE_HOST") or "https://cloud.langfuse.com",
    )

    pushed = 0
    for _, row in scores_df.iterrows():
        trace_id = row.get("trace_id")
        if not trace_id:
            continue
        for metric in ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]:
            if metric in row and row[metric] == row[metric]:  # skip NaN
                langfuse.score(trace_id=trace_id, name=f"ragas_{metric}", value=float(row[metric]))
                pushed += 1
    langfuse.flush()

    print(f"Pushed {pushed} scores to Langfuse, attached to each question's trace.")


if __name__ == "__main__":
    main()
