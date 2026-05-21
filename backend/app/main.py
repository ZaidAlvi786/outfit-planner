import os
from dotenv import load_dotenv

# Load .env BEFORE importing routers — they read credentials at import time.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import endpoints, user_endpoints, styling_endpoints, hair_endpoints, assistant_endpoints

app = FastAPI(title="AuraStyle AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix="/api/v1")
app.include_router(user_endpoints.router, prefix="/api/v1/user")
app.include_router(styling_endpoints.router, prefix="/api/v1/styling")
app.include_router(hair_endpoints.router, prefix="/api/v1/hair-styles")
app.include_router(assistant_endpoints.router, prefix="/api/v1/assistant")

@app.get("/")
def read_root():
    return {"message": "Welcome to AuraStyle AI Backend Server"}
