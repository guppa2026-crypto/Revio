from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, reviews, billing, admin, google
from app.utils.dependencies import get_current_user

app = FastAPI(
    title="Review SaaS API",
    description="AI-powered review management platform",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://revio-42f3.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(billing.router)
app.include_router(admin.router)
app.include_router(google.router)

@app.get("/")
def root():
    return {"status": "ok", "message": "Review SaaS API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }
