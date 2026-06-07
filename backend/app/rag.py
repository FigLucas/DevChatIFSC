
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from dotenv import load_dotenv
import os
load_dotenv()

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chroma_db")

# Embeddings usando OpenAI
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Carrega a base vetorial existente
vectorstore = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 6})

template = """Você é um assistente do IFISC. Utilize as informações abaixo para responder da melhor forma possível.
Se a resposta exata não estiver presente, forneça qualquer informação relacionada que possa ajudar o usuário.
Apenas se o contexto não tiver absolutamente nada sobre o assunto, diga: "Não encontrei essa informação nos documentos fornecidos."

Contexto:
{context}

Pergunta: {question}

Resposta útil:"""
prompt = ChatPromptTemplate.from_template(template)

def get_llm():
    return ChatOpenAI(model="gpt-4o-mini", temperature=0)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def get_rag_chain():
    llm = get_llm()
    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain