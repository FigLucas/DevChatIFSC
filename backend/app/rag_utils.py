import math
import re
import unicodedata
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from pathlib import Path

_TOKEN_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_PORTUGUESE_STOPWORDS = {
    "a",
    "ao",
    "aos",
    "as",
    "com",
    "como",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "essa",
    "esse",
    "esta",
    "este",
    "eu",
    "foi",
    "na",
    "nas",
    "no",
    "nos",
    "o",
    "os",
    "ou",
    "para",
    "por",
    "qual",
    "que",
    "se",
    "sobre",
    "um",
    "uma",
}

# These files are compilations with content copied from unrelated USP units.
# Keeping them in retrieval makes a page from EEL/USP look like an IFSC rule.
_EXCLUDED_SOURCE_FILENAMES = {
    "FAQ-IFSC.pdf",
    "USP - Universidade de São Paulo.pdf",
}

_CANONICAL_SOURCE_URLS = {
    "Auxílios e Bolsas - Graduação IFSC USP.pdf": (
        "https://www2.ifsc.usp.br/graduacao/auxilios-e-bolsas/"
    ),
    "FAPESP Bolsa de Iniciação Científica.pdf": "https://fapesp.br/bolsas/ic",
    "ic.pdf": "https://fapesp.br/bolsas/ic",
    "guia-programa-iniciacao-cientifica.pdf": (
        "https://prpi.usp.br/programas/iniciacao-cientifica-e-tecnologica/"
    ),
    "Iniciacao-cientifica-Manual-do-sistema-Atena-passo-a-passo.pdf": (
        "https://prpi.usp.br/programas/iniciacao-cientifica-e-tecnologica/"
    ),
    "PUB – PRIP – Pró-Reitoria de Inclusão e Pertencimento – USP.pdf": (
        "https://prip.usp.br/apoio-estudantil/pub/"
    ),
}

_IC_OPPORTUNITY_RE = re.compile(
    r"\b(iniciacao\s+(?:cientifica|tecnologica)|pibic|pibiti)\b",
    re.IGNORECASE,
)
_OPPORTUNITY_RE = re.compile(
    r"\b(bolsa|bolsas|oportunidade|oportunidades|modalidade|modalidades|"
    r"financiamento|fomento)\b",
    re.IGNORECASE,
)


def normalize_text(text: str) -> str:
    """Normalize PDF text without discarding paragraph boundaries."""
    text = unicodedata.normalize("NFKC", text or "")
    text = _CONTROL_RE.sub(" ", text)
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)
    text = re.sub(r"[^\S\n]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def tokenize(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKD", text or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return [
        token
        for token in _TOKEN_RE.findall(normalized.lower())
        if len(token) > 1 and token not in _PORTUGUESE_STOPWORDS
    ]


def document_key(document: object) -> str:
    metadata = getattr(document, "metadata", {}) or {}
    content = getattr(document, "page_content", "") or ""
    return "|".join(
        (
            str(metadata.get("source") or metadata.get("filename") or ""),
            str(metadata.get("page", "")),
            str(metadata.get("chunk", metadata.get("start_index", ""))),
            content[:160],
        )
    )


def source_name(document: object) -> str:
    metadata = getattr(document, "metadata", {}) or {}
    source = metadata.get("filename") or metadata.get("source") or "documento"
    return Path(str(source)).name


def is_allowed_source(source: str) -> bool:
    return Path(str(source)).name not in _EXCLUDED_SOURCE_FILENAMES


def is_allowed_document(document: object) -> bool:
    return is_allowed_source(source_name(document))


def canonical_source_url(document: object) -> str:
    metadata = getattr(document, "metadata", {}) or {}
    explicit_url = str(metadata.get("url") or "").strip()
    if explicit_url.startswith(("http://", "https://")):
        return explicit_url
    return _CANONICAL_SOURCE_URLS.get(source_name(document), "")


def is_ic_opportunity_query(question: str) -> bool:
    normalized = " ".join(tokenize(question))
    return bool(
        _IC_OPPORTUNITY_RE.search(normalized) and _OPPORTUNITY_RE.search(normalized)
    )


def expand_retrieval_query(question: str) -> str:
    """Add the names of distinct funding routes to broad IC questions."""
    if not is_ic_opportunity_query(question):
        return question
    return (
        f"{question}\n"
        "Modalidades de iniciação científica e tecnológica no IFSC-USP: "
        "PIBIC, PIBITI, CNPq, FAPESP, PUB pesquisa e inovação, "
        "programas da USP, bolsas da unidade, convênios e participação "
        "voluntária sem bolsa."
    )


def source_reference(document: object) -> str:
    metadata = getattr(document, "metadata", {}) or {}
    reference = source_name(document)
    page = metadata.get("page")
    if isinstance(page, int):
        reference += f", p. {page + 1}"
    return reference


def searchable_document_text(document: object) -> str:
    """Give filename/title a small field boost for exact institutional queries."""
    metadata = getattr(document, "metadata", {}) or {}
    title = str(metadata.get("title") or "")
    filename = source_name(document)
    content = getattr(document, "page_content", "") or ""
    return f"{title}\n{filename}\n{filename}\n{content}"


def lexical_overlap(query: str, content: str) -> float:
    query_tokens = set(tokenize(query))
    if not query_tokens:
        return 0.0
    return len(query_tokens.intersection(tokenize(content))) / len(query_tokens)


class BM25Index:
    """Small in-memory sparse index used alongside the vector search."""

    def __init__(self, texts: Sequence[str], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.document_count = len(texts)
        self.lengths: list[int] = []
        self.postings: dict[str, list[tuple[int, int]]] = defaultdict(list)

        for index, text in enumerate(texts):
            terms = tokenize(text)
            self.lengths.append(len(terms))
            for term, frequency in Counter(terms).items():
                self.postings[term].append((index, frequency))

        self.average_length = (
            sum(self.lengths) / self.document_count if self.document_count else 0.0
        )

    def search(self, query: str, k: int) -> list[tuple[int, float]]:
        if not self.document_count or k <= 0:
            return []

        scores: dict[int, float] = defaultdict(float)
        for term in set(tokenize(query)):
            postings = self.postings.get(term)
            if not postings:
                continue
            document_frequency = len(postings)
            inverse_document_frequency = math.log(
                1
                + (self.document_count - document_frequency + 0.5)
                / (document_frequency + 0.5)
            )
            for document_index, term_frequency in postings:
                length = self.lengths[document_index]
                normalization = 1 - self.b
                if self.average_length:
                    normalization += self.b * length / self.average_length
                score = inverse_document_frequency * (
                    term_frequency
                    * (self.k1 + 1)
                    / (term_frequency + self.k1 * normalization)
                )
                scores[document_index] += score

        return sorted(scores.items(), key=lambda item: item[1], reverse=True)[:k]


def reciprocal_rank_fusion(
    dense_documents: Sequence[object],
    lexical_documents: Sequence[object],
    *,
    dense_weight: float = 0.7,
    lexical_weight: float = 0.3,
    rank_constant: int = 60,
) -> list[object]:
    scores: dict[str, float] = defaultdict(float)
    documents: dict[str, object] = {}

    for weight, ranked_documents in (
        (dense_weight, dense_documents),
        (lexical_weight, lexical_documents),
    ):
        for rank, document in enumerate(ranked_documents, start=1):
            key = document_key(document)
            documents[key] = document
            scores[key] += weight / (rank_constant + rank)

    ranked_keys = sorted(scores, key=scores.get, reverse=True)
    return [documents[key] for key in ranked_keys]


def select_diverse_documents(
    documents: Iterable[object],
    *,
    limit: int,
    max_per_source: int,
) -> list[object]:
    selected: list[object] = []
    seen: set[str] = set()
    source_counts: Counter[str] = Counter()

    for document in documents:
        key = document_key(document)
        source = source_name(document)
        if key in seen or source_counts[source] >= max_per_source:
            continue
        content = (getattr(document, "page_content", "") or "").strip()
        if not content:
            continue
        seen.add(key)
        source_counts[source] += 1
        selected.append(document)
        if len(selected) >= limit:
            break
    return selected


def ensure_source_coverage(
    documents: Sequence[object],
    corpus: Sequence[object],
    *,
    required_sources: Sequence[str],
    query: str,
    limit: int,
) -> list[object]:
    """Include the best chunk from each authoritative source when available."""
    selected = list(documents[:limit])
    selected_keys = {document_key(document) for document in selected}

    for required_source in required_sources:
        if any(source_name(document) == required_source for document in selected):
            continue
        candidates = [
            document
            for document in corpus
            if source_name(document) == required_source
            and document_key(document) not in selected_keys
        ]
        if not candidates:
            continue
        candidate = max(
            candidates,
            key=lambda document: lexical_overlap(
                query,
                searchable_document_text(document),
            ),
        )

        if len(selected) >= limit:
            counts = Counter(source_name(document) for document in selected)
            replace_index = next(
                (
                    index
                    for index in range(len(selected) - 1, -1, -1)
                    if counts[source_name(selected[index])] > 1
                ),
                len(selected) - 1,
            )
            removed = selected[replace_index]
            selected_keys.discard(document_key(removed))
            selected[replace_index] = candidate
        else:
            selected.append(candidate)
        selected_keys.add(document_key(candidate))

    return selected


def format_documents(documents: Sequence[object], max_chars: int) -> str:
    if not documents:
        return "Nenhum trecho relevante foi recuperado dos documentos locais."

    blocks: list[str] = []
    used_chars = 0
    for index, document in enumerate(documents, start=1):
        content = normalize_text(getattr(document, "page_content", ""))
        header = f"[D{index}] Fonte: {source_reference(document)}\n"
        source_url = canonical_source_url(document)
        if source_url:
            header += f"URL oficial: {source_url}\n"
        available = max_chars - used_chars - len(header)
        if available <= 0:
            break
        if len(content) > available:
            content = content[:available].rsplit(" ", 1)[0].rstrip() + "…"
        block = f"{header}{content}"
        blocks.append(block)
        used_chars += len(block) + 2
        if used_chars >= max_chars:
            break
    return "\n\n".join(blocks)
