# Review SaaS — AI-Powered Review Management

## Project Overview
Subscription SaaS (£10-15/month) that automatically manages Google Reviews using AI.

## Tech Stack
- Backend: Python, FastAPI, PostgreSQL, Redis, Celery
- Frontend: Next.js (not started yet)
- AI: OpenAI GPT-4o-mini
- Auth: JWT tokens
- Billing: Stripe (not started yet)
- Email: SendGrid (not started yet)

## Project Location
C:\projects\review-saas

## To Start Development
```bash
cd /c/projects/review-saas/backend
source venv/Scripts/activate
docker compose up -d
uvicorn app.main:app --reload
```
Visit: http://127.0.0.1:8000/docs

## What's Been Built
- FastAPI server with health check endpoints
- PostgreSQL + Redis running in Docker
- Database models: Tenant, User, Review
- User registration — creates tenant + user + JWT token
- User login — verifies password + returns JWT token
- Protected routes using JWT dependency
- Reviews API: list, get, approve, reject
- AI service: analyze_review() and generate_reply()
- Review processor: full pipeline — analyze → generate → set status

## Review Risk Levels
- low: auto-reply after delay (not built yet)
- medium: generate draft, require owner approval
- high: flag only, never auto-reply

## Reply Status Flow
pending → approved → posted
pending → rejected
flagged (high risk, manual only)

## Database
- PostgreSQL on port 5432
- Database name: reviewsaas
- User: postgres / Password: password

## Environment Variables
Located at: backend/.env
Required keys: SECRET_KEY, DATABASE_URL, REDIS_URL, OPENAI_API_KEY, STRIPE_SECRET_KEY, SENDGRID_API_KEY

## API Endpoints Built
- POST /auth/register
- POST /auth/login
- GET /me (protected)
- GET /reviews/ (protected)
- GET /reviews/{id} (protected)
- POST /reviews/{id}/approve (protected)
- POST /reviews/{id}/reject (protected)
- POST /reviews/test-process (protected, testing only)

## What's Next
1. Celery background tasks (auto-polling + delayed posting)
2. Email notifications (SendGrid)
3. Stripe billing
4. Google Reviews API
5. Next.js frontend dashboard
6. Deployment