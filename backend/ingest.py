# backend/ingest.py
import os
import glob
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

load_dotenv()  # carrega OPENAI_API_KEY do .env na raiz

PDF_DIR = os.path.join(os.path.dirname(__file__), "data", "pdfs")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "data", "chroma_db")

def main():
    pdf_files = glob.glob(os.path.join(PDF_DIR, "*.pdf"))
    if not pdf_files:
        print("Nenhum PDF encontrado em", PDF_DIR)
        return

    documents = []
    for pdf_path in pdf_files:
        loader = PyMuPDFLoader(pdf_path)
        documents.extend(loader.load())

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,   # pode ajustar (a OpenAI recomenda chunks de ~1000 tokens)
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = splitter.split_documents(documents)
    print(f"{len(chunks)} chunks extraídos de {len(pdf_files)} PDFs.")

    # Embeddings usando OpenAI (modelo pequeno e barato)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # Remove base antiga se existir
    if os.path.exists(CHROMA_DIR):
        import shutil
        shutil.rmtree(CHROMA_DIR)

    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DIR
    )
    # não precisa chamar persist explicitamente com from_documents, mas garante
    vectordb.persist()
    print("Base vetorial criada com sucesso em", CHROMA_DIR)

if __name__ == "__main__":
    main()