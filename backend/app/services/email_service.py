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

def send_flagged_review_alert(to_email: str, reviewer_name: str, rating: int, review_text: str, draft_reply: str = ""):
    subject = f"⚠️ High Risk Review — {rating}★ from {reviewer_name} — Action Required"
    draft_section = f"""
    <hr style="border:none;border-top:1px solid #E5E3DC;margin:20px 0;">
    <p><strong>Suggested reply draft</strong> <span style="font-size:12px;color:#888;">(review carefully before posting — do not post automatically)</span></p>
    <blockquote style="border-left:3px solid #EF4444;padding:10px 16px;margin:12px 0;background:#FEF2F2;border-radius:4px;color:#3A3834;font-style:normal;">{draft_reply}</blockquote>
    <p style="font-size:13px;color:#888;">You can edit this reply before approving it on the dashboard.</p>
    """ if draft_reply else ""

    html = f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
    <h2 style="color:#B91C1C;">⚠️ High risk review — handle personally</h2>
    <p>This review has been flagged as high risk. Do not post a reply without reviewing it carefully first.</p>
    <table style="width:100%;border:1px solid #FECACA;border-radius:8px;padding:16px;background:#FEF2F2;margin:16px 0;">
      <tr><td style="padding:4px 0;"><strong>Reviewer:</strong></td><td>{reviewer_name}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Rating:</strong></td><td>{'★' * rating}{'☆' * (5 - rating)} ({rating}/5)</td></tr>
    </table>
    <p><strong>Review text:</strong></p>
    <blockquote style="border-left:3px solid #FECACA;padding:10px 16px;margin:12px 0;background:#fff;border-radius:4px;">{review_text}</blockquote>
    {draft_section}
    <p style="margin-top:24px;">
      <a href="https://reviodigital.uk/dashboard" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View on Dashboard →</a>
    </p>
    </div>
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

def send_new_signup_notification(business_name: str, business_email: str):
    subject = f"🎉 New Revio signup — {business_name}"
    html = f"""
    <h2>New customer signed up</h2>
    <p><strong>Business:</strong> {business_name}</p>
    <p><strong>Email:</strong> {business_email}</p>
    <p>Log in to the admin panel to view all customers.</p>
    <p><a href="https://reviodigital.uk/admin" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View Admin →</a></p>
    """
    return send_email("guppa2026@gmail.com", subject, html)

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
    <p><a href="https://reviodigital.uk/dashboard" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View Dashboard →</a></p>
    """
    return send_email(to_email, subject, html)
