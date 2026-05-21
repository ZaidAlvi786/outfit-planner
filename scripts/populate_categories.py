import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client

# Load credentials from .env (never hardcode keys).
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
supabase_key = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
supabase = create_client(supabase_url, supabase_key)

DATA = {
    "Clothes": ["T-shirts", "Shirts", "Pants", "Jeans", "Shorts", "Dresses", "Skirts", "Jackets", "Coats", "Sweaters", "Hoodies"],
    "Shoes": ["Sneakers", "Boots", "Formal Shoes", "Sandals", "Loafers"],
    "Accessories": ["Bags", "Belts", "Hats", "Watches", "Jewelry", "Glasses"],
    "Hair": ["Style", "Color"]
}

def populate():
    print("Populating categories and subcategories...")
    for cat_name, subcats in DATA.items():
        # Create category
        cat_slug = cat_name.lower().replace(" ", "-")
        res = supabase.table("categories").upsert({"name": cat_name, "slug": cat_slug}, on_conflict="slug").execute()
        cat_id = res.data[0]["id"]
        print(f"Category: {cat_name} ({cat_id})")
        
        for sub_name in subcats:
            sub_slug = sub_name.lower().replace(" ", "-")
            supabase.table("subcategories").upsert({
                "category_id": cat_id,
                "name": sub_name,
                "slug": sub_slug
            }, on_conflict="slug").execute()
            print(f"  Subcategory: {sub_name}")

if __name__ == "__main__":
    populate()
