import unittest
from types import SimpleNamespace

from app.rag_utils import (
    BM25Index,
    format_documents,
    normalize_text,
    reciprocal_rank_fusion,
    searchable_document_text,
    select_diverse_documents,
    tokenize,
)


def document(text: str, source: str, page: int = 0, chunk: int = 0):
    return SimpleNamespace(
        page_content=text,
        metadata={"source": source, "page": page, "chunk": chunk},
    )


class RAGUtilsTests(unittest.TestCase):
    def test_normalizes_pdf_text_and_repairs_hyphenation(self):
        text = "Inicia-\nção   científica\x00\n\n\nPrazo final"
        self.assertEqual(normalize_text(text), "Iniciação científica\n\nPrazo final")

    def test_tokenizer_is_accent_insensitive_and_removes_stopwords(self):
        self.assertEqual(tokenize("Qual é o prazo da iniciação?"), ["prazo", "iniciacao"])

    def test_bm25_prioritizes_exact_institutional_terms(self):
        texts = [
            "Regras gerais para matrícula na graduação.",
            "Portaria PR 101 2023 sobre prestação de contas FAPESP.",
            "Calendário de defesas da pós-graduação.",
        ]
        hits = BM25Index(texts).search("Portaria PR 101 FAPESP", k=2)
        self.assertEqual(hits[0][0], 1)
        self.assertGreater(hits[0][1], 0)

    def test_searchable_text_boosts_filename(self):
        item = document("Critérios e condições.", "Bolsa de Mestrado FAPESP.pdf")
        text = searchable_document_text(item)
        self.assertGreaterEqual(text.count("Bolsa de Mestrado FAPESP.pdf"), 2)

    def test_rank_fusion_rewards_document_found_by_both_searches(self):
        dense_only = document("bolsa", "dense.pdf")
        shared = document("bolsa FAPESP", "shared.pdf")
        lexical_only = document("FAPESP", "lexical.pdf")
        ranked = reciprocal_rank_fusion(
            [dense_only, shared],
            [shared, lexical_only],
        )
        self.assertIs(ranked[0], shared)

    def test_selection_limits_chunks_from_the_same_source(self):
        documents = [
            document("a", "one.pdf", chunk=0),
            document("b", "one.pdf", chunk=1),
            document("c", "one.pdf", chunk=2),
            document("d", "two.pdf", chunk=0),
        ]
        selected = select_diverse_documents(documents, limit=3, max_per_source=2)
        self.assertEqual([item.page_content for item in selected], ["a", "b", "d"])

    def test_context_contains_traceable_source_and_page(self):
        context = format_documents(
            [document("Conteúdo confirmado.", "/data/guia.pdf", page=2)],
            max_chars=500,
        )
        self.assertIn("[D1] Fonte: guia.pdf, p. 3", context)
        self.assertIn("Conteúdo confirmado.", context)


if __name__ == "__main__":
    unittest.main()
