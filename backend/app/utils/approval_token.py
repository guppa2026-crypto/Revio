import base64
import hashlib
import hmac
import time
from app.config import settings


def generate_approval_token(review_id: str, ttl_hours: int = 72) -> str:
    expires = int(time.time()) + ttl_hours * 3600
    payload = f"{review_id}:{expires}"
    sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    raw = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def verify_approval_token(token: str) -> str | None:
    """Return review_id if token is valid and unexpired, else None."""
    try:
        padded = token + "=" * (4 - len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        # format: {review_id}:{expires_unix}:{hmac_hex}
        parts = raw.rsplit(":", 2)
        if len(parts) != 3:
            return None
        review_id, expires_str, sig = parts
        if time.time() > int(expires_str):
            return None
        expected = hmac.new(
            settings.SECRET_KEY.encode(),
            f"{review_id}:{expires_str}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        return review_id
    except Exception:
        return None
