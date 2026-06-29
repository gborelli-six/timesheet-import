from types import SimpleNamespace

import jwt
import pytest
from cryptography.exceptions import InvalidTag

import app.core.security as security_module
from app.core.security import create_jwt, decode_jwt, decrypt_secret, encrypt_secret

TEST_SECRET = "test-security-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 32+ byte
# 64 caratteri hex = 32 byte AES-256 (openssl rand -hex 32)
TEST_ENCRYPT_KEY = "aa" * 32


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(
        security_module,
        "settings",
        SimpleNamespace(jwt_secret=TEST_SECRET, token_encrypt_key=TEST_ENCRYPT_KEY),
    )


def test_jwt_round_trip():
    payload = {"sub": "user-123", "email": "alice@sixfeetup.it", "role": "employee"}
    token = create_jwt(payload)
    decoded = decode_jwt(token)
    assert decoded["sub"] == payload["sub"]
    assert decoded["email"] == payload["email"]
    assert decoded["role"] == payload["role"]


def test_expired_token_raises():
    token = jwt.encode(
        {"email": "alice@sixfeetup.it", "role": "employee", "exp": 1},
        TEST_SECRET,
        algorithm="HS256",
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_jwt(token)


def test_tampered_signature_raises():
    payload = {"sub": "user-123", "email": "alice@sixfeetup.it", "role": "employee"}
    token = create_jwt(payload)
    header, body, _ = token.split(".")
    tampered = f"{header}.{body}.invalidsignatureXXXXXXXXXXXXX"
    with pytest.raises(jwt.InvalidTokenError):
        decode_jwt(tampered)


# --- Test encrypt_secret / decrypt_secret ---


CONNECTOR_ID_A = "550e8400-e29b-41d4-a716-446655440000"
CONNECTOR_ID_B = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"


def test_encrypt_decrypt_round_trip():
    plaintext = "my-super-secret-token"
    secret_enc, nonce, kv = encrypt_secret(
        plaintext, user_id=42, connector_id=CONNECTOR_ID_A
    )
    result = decrypt_secret(
        secret_enc, nonce, user_id=42, connector_id=CONNECTOR_ID_A, key_version=kv
    )
    assert result == plaintext


def test_two_encryptions_produce_different_nonce_and_ciphertext():
    plaintext = "same-secret"
    enc1, nonce1, _ = encrypt_secret(plaintext, user_id=1, connector_id=CONNECTOR_ID_A)
    enc2, nonce2, _ = encrypt_secret(plaintext, user_id=1, connector_id=CONNECTOR_ID_A)
    assert nonce1 != nonce2
    assert enc1 != enc2


@pytest.mark.parametrize(
    "tamper",
    [
        "secret_enc",
        "nonce",
        "user_id",
        "connector_id",
    ],
)
def test_tamper_detection(tamper):
    plaintext = "secret"
    enc, nonce, kv = encrypt_secret(plaintext, user_id=10, connector_id=CONNECTOR_ID_A)
    with pytest.raises(InvalidTag):
        if tamper == "secret_enc":
            bad_enc = enc[:-1] + bytes([enc[-1] ^ 0xFF])
            decrypt_secret(bad_enc, nonce, 10, CONNECTOR_ID_A, kv)
        elif tamper == "nonce":
            bad_nonce = bytes([nonce[0] ^ 0xFF]) + nonce[1:]
            decrypt_secret(enc, bad_nonce, 10, CONNECTOR_ID_A, kv)
        elif tamper == "user_id":
            decrypt_secret(enc, nonce, 99, CONNECTOR_ID_A, kv)
        elif tamper == "connector_id":
            decrypt_secret(enc, nonce, 10, CONNECTOR_ID_B, kv)


def test_no_secret_in_exception_repr():
    plaintext = "ultra-sensitive-token-xyz"
    enc, nonce, kv = encrypt_secret(plaintext, user_id=5, connector_id=CONNECTOR_ID_A)
    try:
        decrypt_secret(
            enc, nonce, user_id=99, connector_id=CONNECTOR_ID_A, key_version=kv
        )
    except InvalidTag as exc:
        assert plaintext not in str(exc)
        assert plaintext not in repr(exc)
