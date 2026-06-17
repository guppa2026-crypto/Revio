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
        tone_instruction = """
The customer had a positive experience. Be warm, genuine, and personal — reference the specific thing they praised.
Keep it to 2-3 sentences. Do not be sycophantic or overly effusive.
End by saying you look forward to seeing them again.
"""
    elif rating == 3:
        tone_instruction = """
The customer had a mixed experience — something let them down but they are not angry.
Your goal is to win them back. Structure the reply like this:
1. Genuinely acknowledge what fell short (name the specific issue they raised, not a vague 'concern').
2. Take clear ownership — no excuses, no blame-shifting.
3. Briefly explain what you are doing or have done to address it.
4. Invite them to return and give you another chance — express real confidence that their next visit will be different.
5. Optionally, invite them to reach out directly so you can make it personal.
Close warmly. Keep it to 4-5 sentences. Sound like a real person, not a PR statement.
"""
    else:
        tone_instruction = """
The customer is unhappy and has given 1 or 2 stars. This is your chance to genuinely recover the relationship.
Your goal is not just to apologise — it is to write a reply so thoughtful and human that the customer feels truly heard
and is naturally inclined to reconsider their rating.

Structure the reply like this:
1. Open by naming exactly what went wrong (mirror their specific words back to them — this shows you actually read it).
2. Sincerely apologise without being defensive or making excuses.
3. Take full ownership on behalf of the business.
4. Tell them specifically what action is being taken — not 'we will look into it' but something concrete and believable
   (e.g. 'we have spoken to the team', 'we have reviewed our process', 'we are making a change to how we handle X').
5. Invite them to contact you directly (give a sense that the owner or manager will personally deal with it).
6. Close by expressing that you genuinely hope to have the chance to restore their faith in the business.

Do NOT say 'we take this very seriously' or 'we value your feedback' — those phrases are hollow.
Do NOT ask them directly to change or remove their review.
Do NOT offer discounts or free items.
Keep it to 5-6 sentences. Write like a real business owner who cares, not a customer service script.
"""

    prompt = f"""
You are the owner or manager of {business_name} personally responding to a Google review.

Rating: {rating}/5 stars
Review: "{review_text}"

Tone and structure guidance:
{tone_instruction}

Additional rules:
- Reference the SPECIFIC details they mentioned — never write a reply that could apply to any review
- Sound human — contractions, natural phrasing, no corporate jargon
- Never start with "Thank you for your review" or "We're sorry to hear that" as the opening line — find a more genuine opening
- Do not use bullet points or formatting — write in flowing prose

Write only the reply text, nothing else.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )

    return response.choices[0].message.content.strip()