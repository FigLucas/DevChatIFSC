import gc
import glob
import hashlib
import math
import os
import shutil
import tempfile
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_mistralai import MistralAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.rag_utils import normalize_text

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PDF_DIR = BASE_DIR / "data" / "pdfs"
CHROMA_DIR = BASE_DIR / "data" / "chroma_db"


def _repeated_edge_lines(pages: list[object]) -> set[str]:
    """Find recurring PDF headers/footers that add noise to every chunk."""
    if len(pages) < 3:
        return set()

    occurrences: Counter[str] = Counter()
    for page in pages:
        lines = [
            line.strip()
            for line in normalize_text(getattr(page, "page_content", "")).splitlines()
            if line.strip()
        ]
        edge_lines = set(lines[:5] + lines[-5:])
        occurrences.update(line for line in edge_lines if 2 < len(line) <= 160)

    threshold = max(3, math.ceil(len(pages) * 0.6))
    return {line for line, count in occurrences.items() if count >= threshold}


def _load_and_clean_pdf(pdf_path: str) -> list[object]:
    pages = PyMuPDFLoader(pdf_path).load()
    repeated_lines = _repeated_edge_lines(pages)
    filename = Path(pdf_path).name

    for page in pages:
        cleaned_lines = [
            line
            for line in normalize_text(page.page_content).splitlines()
            if line.strip() not in repeated_lines
        ]
        page.page_content = normalize_text("\n".join(cleaned_lines))
        original_metadata = page.metadata or {}
        page.metadata = {
            "source": filename,
            "filename": filename,
            "page": int(original_metadata.get("page", 0)),
            "total_pages": int(original_metadata.get("total_pages", len(pages))),
            "title": str(original_metadata.get("title", "")).strip(),
        }
    return [page for page in pages if page.page_content]


def _chunk_id(chunk: object) -> str:
    metadata = getattr(chunk, "metadata", {}) or {}
    identity = "\0".join(
        (
            str(metadata.get("filename", "")),
            str(metadata.get("page", "")),
            str(metadata.get("start_index", "")),
            getattr(chunk, "page_content", ""),
        )
    )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def _replace_directory(build_dir: Path, target_dir: Path) -> None:
    """Swap the completed index in place, restoring the previous one on failure."""
    backup_dir = target_dir.with_name(f".{target_dir.name}.backup-{os.getpid()}")
    moved_previous = False
    try:
        if target_dir.exists():
            os.replace(target_dir, backup_dir)
            moved_previous = True
        os.replace(build_dir, target_dir)
    except Exception:
        if moved_previous and backup_dir.exists() and not target_dir.exists():
            os.replace(backup_dir, target_dir)
        raise
    else:
        if backup_dir.exists():
            shutil.rmtree(backup_dir)


def main() -> None:
    pdf_files = sorted(glob.glob(str(PDF_DIR / "*.pdf")))
    if not pdf_files:
        print(f"Nenhum PDF encontrado em {PDF_DIR}")
        return
    if not os.getenv("MISTRAL_API_KEY"):
        raise RuntimeError("Defina MISTRAL_API_KEY antes de executar a ingestão.")

    documents = []
    for position, pdf_path in enumerate(pdf_files, start=1):
        try:
            documents.extend(_load_and_clean_pdf(pdf_path))
        except Exception as exc:
            raise RuntimeError(f"Falha ao processar {Path(pdf_path).name}") from exc
        print(f"[{position}/{len(pdf_files)}] {Path(pdf_path).name}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1_200,
        chunk_overlap=180,
        add_start_index=True,
        separators=["\n\n", "\n", ". ", "; ", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    chunk_number_by_source: Counter[str] = Counter()
    for chunk in chunks:
        source = str(chunk.metadata.get("filename", "documento"))
        chunk.metadata["chunk"] = chunk_number_by_source[source]
        chunk_number_by_source[source] += 1

    ids = [_chunk_id(chunk) for chunk in chunks]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Foram gerados IDs de chunks duplicados; ingestão cancelada.")

    print(f"{len(chunks)} chunks extraídos de {len(pdf_files)} PDFs.")
    embeddings = MistralAIEmbeddings(
        model=os.getenv("MISTRAL_EMBEDDING_MODEL", "mistral-embed")
    )

    CHROMA_DIR.parent.mkdir(parents=True, exist_ok=True)
    build_dir = Path(
        tempfile.mkdtemp(prefix=f".{CHROMA_DIR.name}.build-", dir=CHROMA_DIR.parent)
    )
    try:
        vectordb = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            ids=ids,
            persist_directory=str(build_dir),
            collection_metadata={"hnsw:space": "cosine"},
        )
        del vectordb
        gc.collect()
        _replace_directory(build_dir, CHROMA_DIR)
    except Exception:
        if build_dir.exists():
            shutil.rmtree(build_dir)
        raise

    print(f"Base vetorial criada com sucesso em {CHROMA_DIR}")


if __name__ == "__main__":
    main()
