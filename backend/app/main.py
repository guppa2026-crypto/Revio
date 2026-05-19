from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI application instance
app = FastAPI(
    title="Review SaaS API",
    description="AI-powered review management platform",
    version="0.1.0"
)

# Allow the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
def root():
    return {"status": "ok", "message": "Review SaaS API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}