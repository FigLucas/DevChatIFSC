"""Load application users from a secret file or environment variable."""

import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from .passwords import is_valid_password_hash

_USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,149}$")
load_dotenv()


def _read_users_config() -> str:
    users_file = os.getenv("AUTH_USERS_FILE", "").strip()
    users_json = os.getenv("AUTH_USERS_JSON", "").strip()
    if users_file and users_json:
        raise RuntimeError("Configure apenas AUTH_USERS_FILE ou AUTH_USERS_JSON")
    if users_file:
        path = Path(users_file)
        try:
            return path.read_text(encoding="utf-8")
        except OSError as exc:
            raise RuntimeError(f"Não foi possível ler AUTH_USERS_FILE: {path}") from exc
    return users_json


def load_users() -> dict[str, dict[str, Any]]:
    raw_config = _read_users_config()
    is_production = os.getenv("APP_ENV", "development").lower() == "production"
    if not raw_config:
        if is_production:
            raise RuntimeError(
                "AUTH_USERS_FILE ou AUTH_USERS_JSON é obrigatório em produção"
            )
        return {}

    try:
        configured_users = json.loads(raw_config)
    except json.JSONDecodeError as exc:
        raise RuntimeError("A configuração de usuários não contém JSON válido") from exc
    if not isinstance(configured_users, dict) or not configured_users:
        raise RuntimeError(
            "A configuração de usuários deve ser um objeto JSON não vazio"
        )

    users: dict[str, dict[str, Any]] = {}
    for raw_username, raw_user in configured_users.items():
        if not isinstance(raw_username, str) or not isinstance(raw_user, dict):
            raise TypeError(
                "Cada usuário deve ser um objeto identificado pelo username"
            )
        username = raw_username.strip().lower()
        if username != raw_username or not _USERNAME_RE.fullmatch(username):
            raise RuntimeError(f"Username inválido na configuração: {raw_username!r}")

        password_hash = raw_user.get("password_hash")
        if not is_valid_password_hash(password_hash):
            raise RuntimeError(f"Hash de senha inválido para o usuário {username!r}")
        full_name = raw_user.get("full_name")
        if full_name is not None and not isinstance(full_name, str):
            raise RuntimeError(f"Nome completo inválido para o usuário {username!r}")
        disabled = raw_user.get("disabled", False)
        if not isinstance(disabled, bool):
            raise TypeError(f"Campo disabled inválido para o usuário {username!r}")

        users[username] = {
            "username": username,
            "password_hash": password_hash,
            "full_name": full_name.strip()[:200] if full_name else None,
            "disabled": disabled,
        }
    return users


users_db = load_users()
