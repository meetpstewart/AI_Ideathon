import tiktoken

ENCODING = tiktoken.get_encoding("cl100k_base")

CHUNK_SIZE = 700
OVERLAP = 100

def tokenize(text):
    return ENCODING.encode(text)

def detokenize(tokens):
    return ENCODING.decode(tokens)

def chunk_text(document):
    tokens = tokenize(document["content"])
    chunks = []

    start = 0
    chunk_id = 0

    while start < len(tokens):
        end = start + CHUNK_SIZE
        chunk_tokens = tokens[start:end]
        chunk_text = detokenize(chunk_tokens)

        chunks.append({
            "chunk_id": f"{document['document_name']}_chunk_{chunk_id}",
            "document_name": document["document_name"],
            "content": chunk_text
        })

        start += CHUNK_SIZE - OVERLAP
        chunk_id += 1

    return chunks
