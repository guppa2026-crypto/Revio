from openai import OpenAI
from app.config import settings
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def analyze_review(review_text: str, rating: int) -> dict:
    prompt = f"""
You are an expert at analyzing customer reviews for businesses.

Analyze this review and respond with ONLY a JSON object, no other text.

Review Rating: {rating}/5 stars
Review Text: "{review_text}"

Return this exact JSON structure:
{{
    "sentiment": "positive" or "neutral" or "negative",
    "risk_level": "low" or "medium" or "high",
    "risk_reason": "brief explanation of why this risk level was assigned",
    "summary": "one sentence summary of the review"
}}

Risk level rules:
- low: positive or neutral reviews, minor complaints easily resolved
- medium: serious complaints, requests for refund, mentions of specific staff issues
- high: legal threats, mentions of authorities, food safety issues, safeguarding concerns, hate speech, potential PR crisis
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    result = response.choices[0].message.content.strip()
    # Remove markdown code blocks if present
    result = result.replace("```json", "").replace("```", "").strip()
    return json.loads(result)


def generate_reply(review_text: str, rating: int, business_name: str) -> str:
    if rating >= 4:
        tone_instruction = "The review is positive. Be warm and grateful. 2-3 sentences max."
    elif rating == 3:
        tone_instruction = "The review is mixed. Acknowledge both the positives and the specific concern raised."
    else:
        tone_instruction = "The review is negative. Be calm, professional, and empathetic. Acknowledge the specific issue they mentioned and invite them to give the business a call so we can make things right."

    prompt = f"""
You are a professional customer service manager responding to a Google review on behalf of {business_name}.

Rating: {rating}/5 stars
Review: "{review_text}"

Tone guidance: {tone_instruction}

Rules:
- Acknowledge the SPECIFIC thing they mentioned — do not write a generic reply
- For negative reviews, end by inviting them to give us a ring so we can make things right
- Never offer discounts or free items
- Sound like a real person wrote it, not a template
- Use phrases like "we value your feedback" or "we take this seriously" sparingly — only when they genuinely fit, not as a reflex

Write only the reply text, nothing else.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4
    )

    return response.choices[0].message.content.strip()