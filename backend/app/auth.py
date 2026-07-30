import base64
import hashlib
import hmac
import os
import secrets
import warnings
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from .database import fake_users_db

load_dotenv()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
JWT_ISSUER = os.getenv("JWT_ISSUER", "ifsc-chat-api")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "ifsc-chat-web")
PBKDF2_ROUNDS = 600_000

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


def _decode_base64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Compara uma senha com um hash PBKDF2 em tempo constante."""
    try:
        scheme, rounds, salt, expected = password_hash.split("$", 3)
        if scheme != "pbkdf2_sha256" or int(rounds) != PBKDF2_ROUNDS:
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            _decode_base64(salt),
            PBKDF2_ROUNDS,
        )
        return hmac.compare_digest(derived, _decode_base64(expected))
    except (TypeError, ValueError):
        return False


# Evita diferença de tempo observável entre usuário inexistente e senha inválida.
DUMMY_PASSWORD_HASH = (
    "pbkdf2_sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$"
    "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"
)


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
        )
        username = payload.get("sub")
        if not isinstance(username, str) or not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=username)
    if user is None or user.get("disabled", False):
        raise credentials_exception
    return {
        "username": user["username"],
        "full_name": user.get("full_name"),
    }
