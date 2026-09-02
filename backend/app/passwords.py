import base64
import binascii
import hashlib
import hmac
import secrets

PBKDF2_ROUNDS = 600_000
_SCHEME = "pbkdf2_sha256"


def _encode_base64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode_base64(value: str) -> bytes:
    return base64.b64decode(
        value + "=" * (-len(value) % 4),
        altchars=b"-_",
        validate=True,
    )


def hash_password(password: str) -> str:
    """Create a salted PBKDF2 hash suitable for AUTH_USERS_JSON."""
    if not password:
        raise ValueError("A senha não pode estar vazia")
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ROUNDS,
    )
    return "$".join(
        (_SCHEME, str(PBKDF2_ROUNDS), _encode_base64(salt), _encode_base64(derived))
    )


def is_valid_password_hash(password_hash: object) -> bool:
    if not isinstance(password_hash, str):
        return False
    try:
        scheme, rounds, salt, digest = password_hash.split("$", 3)
        return (
            scheme == _SCHEME
            and int(rounds) == PBKDF2_ROUNDS
            and len(_decode_base64(salt)) >= 16
            and len(_decode_base64(digest)) == hashlib.sha256().digest_size
        )
    except (binascii.Error, TypeError, ValueError):
        return False


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Compare a password with a PBKDF2 hash in constant time."""
    if not is_valid_password_hash(password_hash):
        return False
    try:
        _scheme, _rounds, salt, expected = password_hash.split("$", 3)
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            _decode_base64(salt),
            PBKDF2_ROUNDS,
        )
        return hmac.compare_digest(derived, _decode_base64(expected))
    except (binascii.Error, TypeError, ValueError):
        return False
