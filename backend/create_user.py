"""Generate a user entry without exposing the password in shell history."""

import argparse
import getpass
import json
import re

from app.passwords import hash_password

USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,149}$")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera um usuário para AUTH_USERS_JSON")
    parser.add_argument("username", help="Identificador em letras minúsculas")
    parser.add_argument("--name", default="", help="Nome completo opcional")
    args = parser.parse_args()

    username = args.username.strip().lower()
    if username != args.username or not USERNAME_RE.fullmatch(username):
        parser.error("username inválido; use letras minúsculas, números, ponto, _ ou -")

    password = getpass.getpass("Senha: ")
    confirmation = getpass.getpass("Confirme a senha: ")
    if password != confirmation:
        parser.error("as senhas não coincidem")
    if len(password) < 12:
        parser.error("a senha deve ter pelo menos 12 caracteres")

    entry = {
        username: {
            "password_hash": hash_password(password),
            "full_name": args.name.strip()[:200] or None,
            "disabled": False,
        }
    }
    print(json.dumps(entry, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
