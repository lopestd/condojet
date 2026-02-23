import base64
import hashlib
import hmac
import os

_SCRYPT_PREFIX = "scrypt"
_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 32


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
    )
    salt_b64 = base64.b64encode(salt).decode("ascii")
    derived_b64 = base64.b64encode(derived).decode("ascii")
    return f"{_SCRYPT_PREFIX}${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt_b64}${derived_b64}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith(f"{_SCRYPT_PREFIX}$"):
        try:
            _, n, r, p, salt_b64, digest_b64 = password_hash.split("$", 5)
            salt = base64.b64decode(salt_b64.encode("ascii"))
            expected = base64.b64decode(digest_b64.encode("ascii"))
            candidate = hashlib.scrypt(
                password.encode("utf-8"),
                salt=salt,
                n=int(n),
                r=int(r),
                p=int(p),
                dklen=len(expected),
            )
            return hmac.compare_digest(candidate, expected)
        except Exception:
            return False

    # Legacy support: stored bcrypt hashes generated in previous versions.
    try:
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False
