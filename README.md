# Revio — AI-powered Google review management

Multi-tenant SaaS that syncs a business's Google reviews, uses GPT-4o-mini to assess risk and
draft replies, and posts approved replies back to Google Business Profile.

## Stack
- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis — deployed on Railway
- **Background jobs:** APScheduler inside the web process (see `backend/app/tasks/scheduler.py`)
- **Frontend:** Next.js (`frontend/`) — deployed on Vercel
- **Integrations:** OpenAI, Stripe, SendGrid, Google Business Profile APIs

## Review workflow
| Risk (AI-assessed) | Rating | Result |
|---|---|---|
| high | any | `flagged` — owner alerted, never auto-posted |
| medium | any | `pending` — owner approves from dashboard or email link |
| low | 1–3★ | `pending` |
| low | 4–5★ | `scheduled` — auto-posts after 24h unless edited/cancelled |

A 4–5★ reply is held as `pending` instead if the review looks like it contains instructions
to the AI, or the reply contains links/contact details (`auto_post_hold_reason`).

Statuses: `processing → pending | flagged | scheduled → approved → posted`, or `rejected`.
Reviews stuck in `processing` or `approved` are released back to `pending` by the scheduler.

## Local development
```bash
docker compose up -d                      # postgres + redis
cd backend
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env                      # then fill in values
alembic upgrade head
uvicorn app.main:app --reload             # http://localhost:8000/docs when DEBUG=true

cd ../frontend
npm ci && npm run dev                     # http://localhost:3000
```

## Tests
```bash
cd backend && python -m pytest tests/
cd frontend && npm test && npm run lint && npx tsc --noEmit
```
CI (`.github/workflows/ci.yml`) runs all of these plus `alembic upgrade head` against Postgres.

## Database migrations
The schema is managed only by Alembic. `Procfile` runs `alembic upgrade head` before starting
the server, so a failed migration stops the deploy. Create new migrations with
`alembic revision --autogenerate -m "..."` and review them before committing.

## Configuration
See `backend/.env.example` for every setting.
