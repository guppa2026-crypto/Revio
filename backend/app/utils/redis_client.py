import logging
import redis as redis_lib
from app.config import settings

logger = logging.getLogger(__name__)
_client: redis_lib.Redis | None = None


def get_redis() -> redis_lib.Redis | None:
    """Lazily connect to Redis. Returns None if unavailable (fail-open)."""
    global _client
    if _client is not None:
        return _client
    try:
        client = redis_lib.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        client.ping()
        _client = client
    except Exception as exc:
        logger.debug("Redis unavailable — JWT blacklist disabled: %s", exc)
    return _client
