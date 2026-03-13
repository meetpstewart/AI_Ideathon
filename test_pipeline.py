from ingestion.ingest import load_documents
from ingestion.chunker import chunk_text

docs = load_documents("data/approved_docs")

all_chunks = []

for doc in docs:
    chunks = chunk_text(doc)
    all_chunks.extend(chunks)

print(f"Total documents: {len(docs)}")
print(f"Total chunks: {len(all_chunks)}")

if all_chunks:
    print("\nSample chunk:\n")
    print(all_chunks[0]["content"][:500])
