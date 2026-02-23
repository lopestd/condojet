from src.infrastructure.security.jwt import create_access_token, decode_access_token
from src.infrastructure.security.password import hash_password, verify_password


def test_hash_and_verify_password() -> None:
    password_hash = hash_password("123456")
    assert verify_password("123456", password_hash) is True
    assert verify_password("wrong", password_hash) is False


def test_create_and_decode_token() -> None:
    token = create_access_token(subject="1", role="ADMIN", condominio_id=10)
    payload = decode_access_token(token)
    assert payload["sub"] == "1"
    assert payload["role"] == "ADMIN"
    assert payload["condominio_id"] == 10
