import logging
import os
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from starlette.concurrency import run_in_threadpool

from .auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_user,
)
from .database import fake_users_db
from .models import ChatRequest, ChatResponse, Token
from .rag import get_rag_chain

logger = logging.getLogger(__name__)
app = FastAPI(
    title="IFSC Chat API",
    docs_url="/docs" if os.getenv("APP_ENV", "development") != "production" else None,
    redoc_url=None,
)

default_origins = "http://localhost:3000,http://127.0.0.1:3000"
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", default_origins).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


class LoginAttemptTracker:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _discard_expired(self, attempts: deque[float], now: float) -> None:
        while attempts and now - attempts[0] >= self.window_seconds:
            attempts.popleft()

    def is_blocked(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            attempts = self._attempts.get(key)
            if attempts is None:
                return False
            self._discard_expired(attempts, now)
            if not attempts:
                self._attempts.pop(key, None)
                return False
            return len(attempts) >= self.max_attempts

    def record_failure(self, key: str) -> None:
        with self._lock:
            if key not in self._attempts and len(self._attempts) >= 10_000:
                self._attempts.pop(next(iter(self._attempts)))
            self._attempts[key].append(time.monotonic())

    def clear(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)


login_attempts = LoginAttemptTracker()


@app.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    client_host = request.client.host if request.client else "unknown"
    normalized_username = form_data.username.strip().lower()[:150]
    attempt_key = f"{client_host}:{normalized_username}"
    if login_attempts.is_blocked(attempt_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde alguns minutos.",
            headers={"Retry-After": "300"},
        )

    user = await run_in_threadpool(
        authenticate_user,
        fake_users_db,
        normalized_username,
        form_data.password[:256],
    )
    if not user:
        login_attempts.record_failure(attempt_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_attempts.clear(attempt_key)
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@app.post("/chat-api", response_model=ChatResponse)
async def chat_endpoint(
    chat_req: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        rag_chain = get_rag_chain()
        answer = await run_in_threadpool(rag_chain.invoke, chat_req.question)
        return {"answer": answer}
    except Exception:
        logger.exception("Falha ao processar pergunta do usuário %s", current_user["username"])
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível processar a pergunta agora.",
        )


@app.get("/health")
async def health():
    return {"status": "ok"}
