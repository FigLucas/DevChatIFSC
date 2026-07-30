"""Usuários de demonstração.

Em produção, substitua este módulo por um banco de dados e mantenha somente
``password_hash``. Os valores abaixo são hashes PBKDF2; nenhuma senha em texto
puro é armazenada pela aplicação.
"""

fake_users_db = {
    "admin": {
        "username": "admin",
        "password_hash": (
            "pbkdf2_sha256$600000$JK_a33od_1uy1QSW7c-ngA$"
            "mEnj1o_KA1APR4IP4c6PKxEI-icDtI_Cn-NyA8TUSxk"
        ),
        "full_name": "Administrador",
        "disabled": False,
    },
    "maria": {
        "username": "maria",
        "password_hash": (
            "pbkdf2_sha256$600000$RhkRYrZN8BSDbJZNxQHFYQ$"
            "wrAcKE0qjebfCN49DVWl2HldDdSHXE18hjSjZlIAE8o"
        ),
        "full_name": "Maria Silva",
        "disabled": False,
    },
}
