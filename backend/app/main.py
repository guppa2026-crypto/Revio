from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, reviews, billing
from app.utils.dependencies import get_current_user

# Create the FastAPI application instance
app = FastAPI(
    title="Review SaaS API",
    description="AI-powered review management platform",
    version="0.1.0"
)

# Allow the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://revio-42f3.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect routers
app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(billing.router)

# Health check endpoint
@app.get("/")
def root():
    return {"status": "ok", "message": "Review SaaS API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Protected test endpoint
@app.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }