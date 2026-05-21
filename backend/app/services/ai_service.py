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
    prompt = f"""
You are a professional customer service manager for {business_name}.

Write a professional, empathetic reply to this customer review.

Rating: {rating}/5 stars
Review: "{review_text}"

Rules:
- Keep it between 50-150 words
- Be genuine and human, not robotic
- Thank them if positive
- Apologise and offer resolution if negative
- Never be defensive
- Don't use generic phrases like "We value your feedback"
- Sign off naturally
- Do NOT include subject lines or email formatting

Write only the reply text, nothing else.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )

    return response.choices[0].message.content.strip()