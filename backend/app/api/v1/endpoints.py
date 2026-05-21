from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from typing import List, Optional
from app.models.schemas import ProductResponse, NavMenuResponse, RecommendationRequest, ScraperRequest
import subprocess
import os

from app.services.supabase_service import SupabaseService

router = APIRouter()

class MockAIEngine:
    def predict_outfit(self, user_profile):
        return [{"product_id": "123", "match_score": 0.95}]

class MockChatService:
    async def get_fashion_advice(self, user_id, message):
        return "Here is your fashion advice..."

db = SupabaseService()
ai_engine = MockAIEngine()
chat_service = MockChatService()

# --- NAVIGATION ---
@router.get("/categories/menu", response_model=List[NavMenuResponse])
async def get_mega_menu_data():
    """Returns nested JSON for Categories -> Subcategories -> Brands"""
    return await db.get_nested_menu_structure()

# --- PRODUCTS ---
@router.get("/products/filter")
async def filter_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: float = 0,
    season: Optional[str] = None
):
    return await db.query_products(category, brand, min_price, season)

# --- AI RECOMMENDATIONS ---
@router.post("/recommendations/style")
async def get_style_advice(request: RecommendationRequest):
    """
    1. Fetches user profile (Body type, Skin tone)
    2. Runs Color Theory Algorithm
    3. Returns top-matching products using Vector Similarity
    """
    user_profile = await db.get_profile(request.user_id)
    recommended_items = ai_engine.predict_outfit(user_profile)
    return recommended_items

# --- CHAT ASSISTANT ---
@router.post("/chat/send-message")
async def chat_assistant(user_id: str, message: str):
    response = await chat_service.get_fashion_advice(user_id, message)
    return {"reply": response}

# --- DYNAMIC SCRAPER INTEGRATION ---
@router.post("/scraper/trigger")
async def trigger_scraper(request: ScraperRequest, background_tasks: BackgroundTasks):
    def run_spider():
        # Uvicorn runs from the backend folder, so spider is in ../scrapers
        spider_path = os.path.abspath(os.path.join(os.getcwd(), "..", "scrapers", "spiders", "brand_spider.py"))
        print(f"Triggering background spider for URL: {request.url}")
        subprocess.run(["python", spider_path, "--url", request.url, "--country", request.country or "USA"])
        
    background_tasks.add_task(run_spider)
    return {"status": f"Background scraper triggered for {request.url}"}
