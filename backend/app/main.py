from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from .auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from .models import Token, ChatRequest
from datetime import timedelta
from .database import fake_users_db
from .rag import get_rag_chain
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Chatbot IFISC API")

# Habilitar CORS para o frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ou ["*"] para qualquer origem
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_chain = get_rag_chain()

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/chat-api")
async def chat_endpoint(chat_req: ChatRequest, current_user: dict = Depends(get_current_user)):
    try:
        answer = rag_chain.invoke(chat_req.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}