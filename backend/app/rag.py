
from langchain_chroma import Chroma
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from duckduckgo_search import DDGS
import os
load_dotenv()

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chroma_db")

embeddings = MistralAIEmbeddings(model="mistral-embed")

vectorstore = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 6})

template = """Você é um assistente do IFISC. Utilize as informações abaixo para responder da melhor forma possível.
Se a resposta exata não estiver presente, forneça qualquer informação relacionada que possa ajudar o usuário.
Apenas se o contexto não tiver absolutamente nada sobre o assunto, diga: "Não encontrei essa informação nos documentos fornecidos."

Contexto dos documentos locais:
{local_context}

Resultados de busca na web:
{web_context}

Pergunta: {question}

Use tanto os documentos locais quanto os resultados da web para dar a melhor resposta.
Resposta útil:"""
prompt = ChatPromptTemplate.from_template(template)

def get_llm():
    return ChatMistralAI(model="mistral-medium-latest", temperature=0)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def search_web(query: str, max_results: int = 5) -> str:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return "Nenhum resultado encontrado na web."
        return "\n\n".join(f"Fonte: {r['href']}\n{r['body']}" for r in results)
    except Exception as e:
        return f"Erro ao buscar na web: {e}"

def get_rag_chain():
    llm = get_llm()
    chain = (
        {
            "local_context": retriever | format_docs,
            "web_context": RunnablePassthrough() | search_web,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain
