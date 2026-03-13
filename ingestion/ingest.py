import os
from docx import Document
from pypdf import PdfReader

SUPPORTED_EXTENSIONS = [".docx", ".pdf"]

def extract_docx_text(file_path):
    doc = Document(file_path)
    text = []
    for para in doc.paragraphs:
        if para.text.strip():
            text.append(para.text.strip())
    return "\n".join(text)


def extract_pdf_text(file_path):
    reader = PdfReader(file_path)
    text = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text.append(page_text.strip())
    return "\n".join(text)


def load_documents(folder_path):
    documents = []

    for file_name in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file_name)
        _, ext = os.path.splitext(file_name)

        if ext.lower() not in SUPPORTED_EXTENSIONS:
            continue

        if ext.lower() == ".docx":
            content = extract_docx_text(file_path)
        elif ext.lower() == ".pdf":
            content = extract_pdf_text(file_path)
        else:
            continue

        documents.append({
            "document_name": file_name,
            "content": content
        })

    return documents


if __name__ == "__main__":
    docs = load_documents("../data/approved_docs")
    for d in docs:
        print(f"Loaded: {d['document_name']}")
        print(f"Characters: {len(d['content'])}")
        print("-" * 50)
