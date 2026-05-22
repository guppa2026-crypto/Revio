from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "review_saas",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "celery_tasks.tasks.poll_reviews",
        "celery_tasks.tasks.post_reply",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
)

celery_app.conf.beat_schedule = {
    "poll-all-tenants-reviews": {
        "task": "celery_tasks.tasks.poll_reviews.poll_all_tenants",
        "schedule": crontab(minute="*/15"),
    },
    "retry-stuck-approved-replies": {
        "task": "celery_tasks.tasks.post_reply.retry_stuck_replies",
        "schedule": crontab(minute="*/5"),
    },
}
