import os
from datetime import UTC, datetime, timedelta

import jwt
from cryptography.exceptions import (
    InvalidTag,  # noqa: F401 — re-esportato per i chiamanti
)
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

KEY_VERSION = 1


def create_jwt(payload: dict, expires_hours: int = 8) -> str:
    now = datetime.now(UTC)
    data = {**payload, "iat": now, "exp": now + timedelta(hours=expires_hours)}
    return jwt.encode(data, settings.jwt_secret, algorithm="HS256")


def decode_jwt(token: str) -> dict:
    # Propaga jwt.ExpiredSignatureError e jwt.InvalidTokenError al chiamante
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def _aes_key() -> bytes:
    # hex a 64 caratteri = 32 byte (openssl rand -hex 32)
    return bytes.fromhex(settings.token_encrypt_key)


def encrypt_secret(
    plaintext: str, user_id: int, connector_id: str
) -> tuple[bytes, bytes, int]:
    nonce = os.urandom(12)
    aad = f"{user_id}:{connector_id}".encode()
    secret_enc = AESGCM(_aes_key()).encrypt(nonce, plaintext.encode(), aad)
    return secret_enc, nonce, KEY_VERSION


def decrypt_secret(
    secret_enc: bytes, nonce: bytes, user_id: int, connector_id: str, key_version: int
) -> str:
    aad = f"{user_id}:{connector_id}".encode()
    plaintext = AESGCM(_aes_key()).decrypt(nonce, secret_enc, aad)
    return plaintext.decode()
