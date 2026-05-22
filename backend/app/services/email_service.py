import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg.send(message)
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to_email, e)
        return False

def send_flagged_review_alert(to_email: str, reviewer_name: str, rating: int, review_text: str):
    subject = f"⚠️ High Risk Review Flagged — {rating}★ from {reviewer_name}"
    html = f"""
    <h2>A review has been flagged for your attention</h2>
    <p><strong>Reviewer:</strong> {reviewer_name}</p>
    <p><strong>Rating:</strong> {rating}/5</p>
    <p><strong>Review:</strong> {review_text}</p>
    <p>Please log in to your dashboard to handle this review manually.</p>
    """
    return send_email(to_email, subject, html)

def send_reply_posted_notification(to_email: str, reviewer_name: str, reply_text: str):
    subject = f"✅ Reply Posted to {reviewer_name}'s Review"
    html = f"""
    <h2>Your AI reply has been posted</h2>
    <p><strong>Reviewer:</strong> {reviewer_name}</p>
    <p><strong>Reply sent:</strong></p>
    <blockquote>{reply_text}</blockquote>
    """
    return send_email(to_email, subject, html)

def send_approval_needed(to_email: str, reviewer_name: str, rating: int, review_text: str, reply_text: str):
    subject = f"👀 Review Needs Your Approval — {rating}★ from {reviewer_name}"
    html = f"""
    <h2>A review needs your approval before we post a reply</h2>
    <p><strong>Reviewer:</strong> {reviewer_name}</p>
    <p><strong>Rating:</strong> {rating}/5</p>
    <p><strong>Review:</strong> {review_text}</p>
    <hr>
    <p><strong>Suggested reply:</strong></p>
    <blockquote>{reply_text}</blockquote>
    <p>Log in to your dashboard to approve or reject this reply.</p>
    """
    return send_email(to_email, subject, html)
