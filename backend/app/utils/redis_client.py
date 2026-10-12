import logging
import time
import redis as redis_lib
from app.config import settings

logger = logging.getLogger(__name__)
_client: redis_lib.Redis | None = None
_last_failure: float = 0.0
_RETRY_AFTER_SECONDS = 30  # don't pay a connect timeout on every request while Redis is down


def get_redis() -> redis_lib.Redis | None:
    """Lazily connect to Redis. Returns None if unavailable (fail-open)."""
    global _client, _last_failure
    if _client is not None:
        return _client
    if time.monotonic() - _last_failure < _RETRY_AFTER_SECONDS:
        return None
    try:
        client = redis_lib.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        _client = client
    except Exception as exc:
        _last_failure = time.monotonic()
        logger.warning("Redis unavailable — JWT blacklist disabled: %s", exc)
    return _client
