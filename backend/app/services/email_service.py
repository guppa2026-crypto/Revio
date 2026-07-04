import html
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings

logger = logging.getLogger(__name__)


def _e(text: str) -> str:
    """HTML-escape user-supplied text to prevent XSS in email clients."""
    return html.escape(str(text))


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


def send_flagged_review_alert(
    to_email: str,
    reviewer_name: str,
    rating: int,
    review_text: str,
    draft_reply: str = "",
) -> bool:
    subject = f"High Risk Review — {rating}★ from {_e(reviewer_name)} — Action Required"
    draft_section = f"""
    <hr style="border:none;border-top:1px solid #E5E3DC;margin:20px 0;">
    <p><strong>Suggested reply draft</strong> <span style="font-size:12px;color:#888;">(review carefully before posting — do not post automatically)</span></p>
    <blockquote style="border-left:3px solid #EF4444;padding:10px 16px;margin:12px 0;background:#FEF2F2;border-radius:4px;color:#3A3834;font-style:normal;">{_e(draft_reply)}</blockquote>
    <p style="font-size:13px;color:#888;">You can edit this reply before approving it on the dashboard.</p>
    """ if draft_reply else ""

    html_body = f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
    <h2 style="color:#B91C1C;">High risk review — handle personally</h2>
    <p>This review has been flagged as high risk. Do not post a reply without reviewing it carefully first.</p>
    <table style="width:100%;border:1px solid #FECACA;border-radius:8px;padding:16px;background:#FEF2F2;margin:16px 0;">
      <tr><td style="padding:4px 0;"><strong>Reviewer:</strong></td><td>{_e(reviewer_name)}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Rating:</strong></td><td>{'★' * rating}{'☆' * (5 - rating)} ({rating}/5)</td></tr>
    </table>
    <p><strong>Review text:</strong></p>
    <blockquote style="border-left:3px solid #FECACA;padding:10px 16px;margin:12px 0;background:#fff;border-radius:4px;">{_e(review_text)}</blockquote>
    {draft_section}
    <p style="margin-top:24px;">
      <a href="{settings.FRONTEND_URL}/dashboard" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View on Dashboard →</a>
    </p>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_reply_posted_notification(to_email: str, reviewer_name: str, reply_text: str) -> bool:
    subject = f"Reply Posted to {_e(reviewer_name)}'s Review"
    html_body = f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
    <h2>Your AI reply has been posted</h2>
    <p><strong>Reviewer:</strong> {_e(reviewer_name)}</p>
    <p><strong>Reply sent:</strong></p>
    <blockquote style="border-left:3px solid #22C55E;padding:10px 16px;margin:12px 0;background:#F0FDF4;border-radius:4px;">{_e(reply_text)}</blockquote>
    <p><a href="{settings.FRONTEND_URL}/dashboard" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View Dashboard →</a></p>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_new_signup_notification(business_name: str, business_email: str) -> None:
    subject = f"New Revio signup — {_e(business_name)}"
    html_body = f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
    <h2>New customer signed up</h2>
    <p><strong>Business:</strong> {_e(business_name)}</p>
    <p><strong>Email:</strong> {_e(business_email)}</p>
    <p>Log in to the admin panel to view all customers.</p>
    <p><a href="{settings.FRONTEND_URL}/admin" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View Admin →</a></p>
    </div>
    """
    for admin_email in settings.admin_emails_list:
        send_email(admin_email, subject, html_body)


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    subject = "Reset your Revio password"
    html_body = f"""
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1A1916;">
    <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">Reset your password</h2>
    <p style="color:#5F5E5A;margin-bottom:24px;line-height:1.6;">
      We received a request to reset the password for your Revio account.
      Click the button below — the link expires in <strong>30 minutes</strong>.
    </p>
    <p style="margin-bottom:28px;">
      <a href="{reset_url}" style="background:#E10E1C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Reset password →</a>
    </p>
    <p style="font-size:13px;color:#9E9B93;line-height:1.6;">
      If you didn't request this, you can ignore this email — your password won't change.<br>
      If the button doesn't work, copy and paste this link: <span style="word-break:break-all;">{_e(reset_url)}</span>
    </p>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_approval_needed(
    to_email: str,
    reviewer_name: str,
    rating: int,
    review_text: str,
    reply_text: str,
    approval_url: str = "",
) -> bool:
    subject = f"Review Needs Your Approval — {rating}★ from {_e(reviewer_name)}"
    approve_btn = f"""
    <p style="margin-top:20px;">
      <a href="{approval_url}" style="background:#16A34A;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-right:10px;">Approve reply →</a>
      <a href="{settings.FRONTEND_URL}/dashboard" style="background:#1A1916;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Dashboard</a>
    </p>
    <p style="font-size:12px;color:#A8A49C;margin-top:8px;">Approval link expires in 72 hours. You can also edit the reply on the dashboard.</p>
    """ if approval_url else f"""
    <p style="margin-top:20px;"><a href="{settings.FRONTEND_URL}/dashboard" style="background:#1A1916;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">View Dashboard →</a></p>
    """
    html_body = f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
    <h2>A review needs your approval before we post a reply</h2>
    <p><strong>Reviewer:</strong> {_e(reviewer_name)}</p>
    <p><strong>Rating:</strong> {rating}/5</p>
    <p><strong>Review:</strong></p>
    <blockquote style="border-left:3px solid #D97706;padding:10px 16px;margin:12px 0;background:#FFFBEB;border-radius:4px;">{_e(review_text)}</blockquote>
    <p><strong>Suggested reply:</strong></p>
    <blockquote style="border-left:3px solid #6B7280;padding:10px 16px;margin:12px 0;background:#F9FAFB;border-radius:4px;">{_e(reply_text)}</blockquote>
    {approve_btn}
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_weekly_digest_email(
    to_email: str,
    business_name: str,
    new_count: int,
    avg_rating: float,
    pending_count: int,
    total_count: int,
) -> bool:
    subject = f"Your weekly review summary — Revio"
    stars = "★" * round(avg_rating) + "☆" * (5 - round(avg_rating)) if avg_rating else "—"
    pending_note = (
        f'<p style="margin:0 0 8px;"><strong style="color:#B91C1C;">{pending_count} review{"s" if pending_count != 1 else ""} still need{"s" if pending_count == 1 else ""} your attention.</strong> '
        f'<a href="{settings.FRONTEND_URL}/dashboard" style="color:#1A1916;font-weight:600;">Review now →</a></p>'
    ) if pending_count else '<p style="margin:0 0 8px;color:#16A34A;">All caught up — no reviews awaiting action.</p>'

    html_body = f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1A1916;">
    <h2 style="font-size:20px;font-weight:700;margin-bottom:4px;">Weekly review summary</h2>
    <p style="color:#6B6963;margin-bottom:20px;">{_e(business_name)}</p>
    <table style="width:100%;border:1px solid #E8E6E0;border-radius:12px;padding:20px;background:#FAFAF8;margin:0 0 20px;">
      <tr>
        <td style="padding:8px 12px;text-align:center;border-right:1px solid #E8E6E0;">
          <div style="font-size:28px;font-weight:700;">{new_count}</div>
          <div style="font-size:12px;color:#9E9B93;margin-top:2px;">New this week</div>
        </td>
        <td style="padding:8px 12px;text-align:center;border-right:1px solid #E8E6E0;">
          <div style="font-size:28px;font-weight:700;color:#D4A843;">{avg_rating:.1f}</div>
          <div style="font-size:12px;color:#9E9B93;margin-top:2px;">Avg rating {stars}</div>
        </td>
        <td style="padding:8px 12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">{total_count}</div>
          <div style="font-size:12px;color:#9E9B93;margin-top:2px;">Total reviews</div>
        </td>
      </tr>
    </table>
    {pending_note}
    <p style="margin-top:24px;">
      <a href="{settings.FRONTEND_URL}/dashboard" style="background:#1A1916;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open Dashboard →</a>
    </p>
    <p style="font-size:12px;color:#B8B4AC;margin-top:24px;">You're receiving this because you have an active Revio subscription. Manage your account at <a href="{settings.FRONTEND_URL}/settings" style="color:#9E9B93;">{settings.FRONTEND_URL}/settings</a>.</p>
    </div>
    """
    return send_email(to_email, subject, html_body)
