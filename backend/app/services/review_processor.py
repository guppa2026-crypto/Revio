from sqlalchemy.orm import Session
from app.models.review import Review
from app.services.ai_service import analyze_review, generate_reply
from app.models.tenant import Tenant

def process_review(review: Review, db: Session, business_name: str):
    """
    Main processing pipeline for a new review.
    Analyzes sentiment, generates reply, and sets appropriate status.
    """

    # Step 1 — Analyze the review with AI
    print(f"Analyzing review {review.id}...")
    analysis = analyze_review(review.review_text or "", review.rating)

    # Step 2 — Store the analysis results
    review.sentiment = analysis.get("sentiment")
    review.risk_level = analysis.get("risk_level")
    review.ai_summary = analysis.get("summary")

    # Step 3 — Handle based on risk level
    if review.risk_level == "high":
        # Never auto-reply — flag for manual handling
        review.reply_status = "flagged"
        review.is_flagged = True
        review.requires_approval = False
        print(f"Review {review.id} flagged as HIGH RISK")

    elif review.risk_level == "medium":
        # Generate reply but require approval
        print(f"Generating reply for medium risk review {review.id}...")
        reply = generate_reply(
            review.review_text or "",
            review.rating,
            business_name
        )
        review.ai_reply = reply
        review.reply_status = "pending"
        review.requires_approval = True
        print(f"Review {review.id} requires approval")

    else:
        # Low risk — generate reply for auto-posting
        print(f"Generating reply for low risk review {review.id}...")
        reply = generate_reply(
            review.review_text or "",
            review.rating,
            business_name
        )
        review.ai_reply = reply
        review.reply_status = "pending"
        review.requires_approval = False
        print(f"Review {review.id} ready for auto-reply")

    # Step 4 — Save to database
    db.commit()
    db.refresh(review)
    return review