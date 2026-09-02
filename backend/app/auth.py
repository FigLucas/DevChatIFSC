import os
import secrets
import warnings
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .database import users_db
from .passwords import hash_password, verify_password

load_dotenv()

ALGORITHM = "HS256"
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = min(
        max(int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")), 5),
        24 * 60,
    )
except ValueError as exc:
    raise RuntimeError(
        "ACCESS_TOKEN_EXPIRE_MINUTES deve ser um número inteiro"
    ) from exc
JWT_ISSUER = os.getenv("JWT_ISSUER", "ifsc-chat-api")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "ifsc-chat-web")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


def _get_secret_key() -> str:
    configured_key = os.getenv("SECRET_KEY", "")
    if len(configured_key) >= 32:
        return configured_key

    if os.getenv("APP_ENV", "development").lower() == "production":
        raise RuntimeError("SECRET_KEY deve ter pelo menos 32 caracteres em produção")

    warnings.warn(
        "SECRET_KEY ausente ou curta; usando uma chave temporária segura. "
        "As sessões serão invalidadas ao reiniciar a API.",
        RuntimeWarning,
        stacklevel=2,
    )
    return secrets.token_urlsafe(48)


SECRET_KEY = _get_secret_key()


# Evita diferença de tempo observável entre usuário inexistente e senha inválida.
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


def get_user(db: dict[str, dict[str, Any]], username: str) -> dict[str, Any] | None:
    return db.get(username)


def authenticate_user(
    db: dict[str, dict[str, Any]], username: str, password: str
) -> dict[str, Any] | None:
    user = get_user(db, username)
    password_hash = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    password_is_valid = verify_password(password, password_hash)
    if not user or not password_is_valid or user.get("disabled", False):
        return None
    return user


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update(
        {
            "aud": JWT_AUDIENCE,
            "exp": expire,
            "iat": now,
            "iss": JWT_ISSUER,
            "jti": str(uuid4()),
            "nbf": now,
        }
    )
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
            options={
                "require": ["aud", "exp", "iat", "iss", "jti", "nbf", "sub"],
            },
        )
        username = payload.get("sub")
        if not isinstance(username, str) or not username:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = get_user(users_db, username=username)
    if user is None or user.get("disabled", False):
        raise credentials_exception
    return {
        "username": user["username"],
        "full_name": user.get("full_name"),
    }
