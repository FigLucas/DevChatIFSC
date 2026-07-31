import unittest
from types import SimpleNamespace

from app.rag_utils import (
    BM25Index,
    canonical_source_url,
    ensure_source_coverage,
    expand_retrieval_query,
    format_documents,
    is_allowed_source,
    is_ic_opportunity_query,
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

    def test_excludes_compilations_with_rules_from_other_usp_units(self):
        self.assertFalse(is_allowed_source("FAQ-IFSC.pdf"))
        self.assertFalse(is_allowed_source("USP - Universidade de São Paulo.pdf"))
        self.assertTrue(
            is_allowed_source("Auxílios e Bolsas - Graduação IFSC USP.pdf")
        )

    def test_expands_broad_ic_opportunity_query_with_funding_routes(self):
        question = "Quais oportunidades de bolsa de iniciação científica há no IFSC?"
        expanded = expand_retrieval_query(question)
        self.assertTrue(is_ic_opportunity_query(question))
        for route in ("PIBIC", "PIBITI", "FAPESP", "PUB"):
            self.assertIn(route, expanded)

    def test_does_not_expand_unrelated_query(self):
        question = "Qual é o horário da biblioteca?"
        self.assertFalse(is_ic_opportunity_query(question))
        self.assertEqual(expand_retrieval_query(question), question)

    def test_context_includes_canonical_official_url_when_known(self):
        item = document(
            "A FAPESP recebe propostas.",
            "FAPESP Bolsa de Iniciação Científica.pdf",
        )
        context = format_documents([item], max_chars=500)
        self.assertEqual(
            canonical_source_url(item),
            "https://fapesp.br/bolsas/ic",
        )
        self.assertIn("URL oficial: https://fapesp.br/bolsas/ic", context)

    def test_ensures_authoritative_source_coverage(self):
        first = document("PIBIC e PIBITI", "guia.pdf", chunk=0)
        duplicate = document("Mais detalhes", "guia.pdf", chunk=1)
        fapesp = document("Bolsa de IC em fluxo contínuo", "fapesp.pdf")
        pub = document("PUB pesquisa e inovação", "pub.pdf")
        selected = ensure_source_coverage(
            [first, duplicate, fapesp],
            [first, duplicate, fapesp, pub],
            required_sources=("guia.pdf", "fapesp.pdf", "pub.pdf"),
            query="bolsas de iniciação científica FAPESP PUB",
            limit=3,
        )
        self.assertEqual(
            {item.metadata["source"] for item in selected},
            {"guia.pdf", "fapesp.pdf", "pub.pdf"},
        )


if __name__ == "__main__":
    unittest.main()
