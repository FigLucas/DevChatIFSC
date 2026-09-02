import asyncio
import logging
import os
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta
from typing import Annotated
from urllib.parse import urlsplit

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from starlette.concurrency import run_in_threadpool
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_user,
)
from .database import users_db
from .models import ChatRequest, ChatResponse, Token
from .rag import get_rag_chain

logger = logging.getLogger(__name__)
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
if APP_ENV not in {"development", "test", "production"}:
    raise RuntimeError("APP_ENV deve ser development, test ou production")
IS_PRODUCTION = APP_ENV == "production"
app = FastAPI(
    title="IFSC Chat API",
    docs_url=None if IS_PRODUCTION else "/docs",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
    redoc_url=None,
)

default_origins = "" if IS_PRODUCTION else "http://localhost:3000,http://127.0.0.1:3000"
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", default_origins).split(",")
    if origin.strip()
]


def _is_secure_origin(origin: str) -> bool:
    try:
        parsed = urlsplit(origin)
        return bool(
            parsed.scheme == "https"
            and parsed.hostname
            and parsed.username is None
            and parsed.password is None
            and parsed.path in {"", "/"}
            and not parsed.query
            and not parsed.fragment
            and origin.rstrip("/") == f"https://{parsed.netloc}"
        )
    except ValueError:
        return False


if IS_PRODUCTION and (
    not allowed_origins
    or any(not _is_secure_origin(origin) for origin in allowed_origins)
):
    raise RuntimeError(
        "ALLOWED_ORIGINS deve listar apenas origens HTTPS explícitas em produção"
    )

if IS_PRODUCTION:
    allowed_hosts = [
        host.strip()
        for host in os.getenv("ALLOWED_HOSTS", "").split(",")
        if host.strip()
    ]
    if not allowed_hosts or "*" in allowed_hosts:
        raise RuntimeError("ALLOWED_HOSTS explícito é obrigatório em produção")
    # Hosts internos são necessários para healthchecks locais; a porta da API
    # não é publicada pelo compose de produção.
    trusted_hosts = list(dict.fromkeys([*allowed_hosts, "localhost", "127.0.0.1"]))
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

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
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'"
    )
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if IS_PRODUCTION or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
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


def _bounded_env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        return min(max(int(os.getenv(name, str(default))), minimum), maximum)
    except ValueError as exc:
        raise RuntimeError(f"{name} deve ser um número inteiro") from exc


CHAT_RATE_LIMIT = _bounded_env_int("CHAT_RATE_LIMIT", 20, 1, 300)
CHAT_RATE_WINDOW_SECONDS = _bounded_env_int("CHAT_RATE_WINDOW_SECONDS", 60, 10, 3600)
MAX_CONCURRENT_CHATS = _bounded_env_int("MAX_CONCURRENT_CHATS", 8, 1, 64)
chat_requests = LoginAttemptTracker(
    max_attempts=CHAT_RATE_LIMIT,
    window_seconds=CHAT_RATE_WINDOW_SECONDS,
)
chat_slots = asyncio.Semaphore(MAX_CONCURRENT_CHATS)


@app.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
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
        users_db,
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
        "token_type": "bearer",  # nosec B105 -- tipo OAuth2, não uma senha
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@app.post("/chat-api", response_model=ChatResponse)
async def chat_endpoint(
    chat_req: ChatRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    username = current_user["username"]
    if chat_requests.is_blocked(username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de perguntas atingido. Aguarde um momento.",
            headers={"Retry-After": str(CHAT_RATE_WINDOW_SECONDS)},
        )
    chat_requests.record_failure(username)

    try:
        async with chat_slots:
            rag_chain = get_rag_chain()
            answer = await run_in_threadpool(rag_chain.invoke, chat_req.question)
        return {"answer": answer}
    except Exception:
        logger.exception("Falha ao processar pergunta do usuário %s", username)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível processar a pergunta agora.",
        )


@app.get("/health")
async def health():
    return {"status": "ok"}
