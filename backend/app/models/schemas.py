from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class NavMenuResponse(BaseModel):
    id: str
    name: str
    slug: str
    image_url: Optional[str] = None
    subcategories: List[Dict[str, Any]] = []

class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    brand_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    season: Optional[str] = None
    colors: Optional[List[str]] = None
    image_url: Optional[str] = None
    model_3d_url: Optional[str] = None

class RecommendationRequest(BaseModel):
    user_id: str

class ScraperRequest(BaseModel):
    user_id: str
    url: str
    country: Optional[str] = "USA"
