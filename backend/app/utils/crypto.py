import base64
import hashlib
import logging
from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy.types import TypeDecorator, String
from app.config import settings

logger = logging.getLogger(__name__)

_fernet = None


def _derive(secret: str) -> Fernet:
    key = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def _get_fernet() -> MultiFernet:
    """Encrypt with ENCRYPTION_KEY when set; still decrypt values written under SECRET_KEY.

    Keeping the data key separate from SECRET_KEY means the JWT secret can be rotated
    without making every stored Google token unreadable.
    """
    global _fernet
    if _fernet is None:
        keys = []
        if settings.ENCRYPTION_KEY:
            keys.append(_derive(settings.ENCRYPTION_KEY))
        keys.append(_derive(settings.SECRET_KEY))
        _fernet = MultiFernet(keys)
    return _fernet


class EncryptedString(TypeDecorator):
    """Encrypts values at rest using Fernet (AES-128-CBC + HMAC).

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
            # Either a legacy plaintext value or a key mismatch (e.g. SECRET_KEY rotated
            # without setting ENCRYPTION_KEY to the old value) — the latter means the
            # tenant must reconnect Google
            if value.startswith("gAAAAA"):
                logger.error("Could not decrypt an encrypted column value — encryption key mismatch?")
            return value
