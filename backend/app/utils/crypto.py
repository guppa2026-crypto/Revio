import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import TypeDecorator, String
from app.config import settings

_fernet = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        _fernet = Fernet(base64.urlsafe_b64encode(key))
    return _fernet


class EncryptedString(TypeDecorator):
    """Encrypts values at rest using Fernet (AES-128-CBC + HMAC), derived from SECRET_KEY.

    Falls back to returning the raw stored value on decrypt failure so tokens
    written before this was introduced don't break existing connections.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return _get_fernet().encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return _get_fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            return value
