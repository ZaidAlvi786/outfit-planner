import os
from supabase import create_client, Client
from typing import List, Dict

class SupabaseService:
    def __init__(self):
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError(
                "Supabase credentials missing — set NEXT_PUBLIC_SUPABASE_URL and "
                "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env"
            )

        self.supabase: Client = create_client(url, key)

    async def get_nested_menu_structure(self) -> List[Dict]:
        """
        Fetches:
        1. Categories
        2. Subcategories (grouped by category)
        3. Brands (associated with subcategories or globally)
        """
        try:
            # 1. Fetch Categories
            categories_res = self.supabase.table("categories").select("*").execute()
            categories = categories_res.data
            
            # 2. Fetch Subcategories
            subcategories_res = self.supabase.table("subcategories").select("*").execute()
            subcategories = subcategories_res.data
            
            # 3. Fetch Brands
            brands_res = self.supabase.table("brands").select("*").execute()
            brands = brands_res.data
            
            # 4. Nest the data
            result = []
            for cat in categories:
                cat_subs = [s for s in subcategories if s["category_id"] == cat["id"]]
                
                # Add brands to each subcategory (or keep global list if preferred)
                # For simplicity, we'll give each subcategory access to all brands 
                # or find brands that have products in that subcategory.
                # Here we'll just include all brands in each subcategory as per current mock structure.
                for sub in cat_subs:
                    sub["brands"] = brands
                
                cat["subcategories"] = cat_subs
                result.append(cat)
                
            return result
        except Exception as e:
            print(f"Error fetching menu structure: {e}")
            return []

    async def query_products(self, category: str = None, brand: str = None, min_price: float = 0, season: str = None):
        # Implementation for real product filtering
        query = self.supabase.table("products").select("*")
        if category:
            query = query.eq("category_id", category) # This assumes we have category_id on products
        if brand:
            query = query.eq("brand_id", brand)
        if min_price > 0:
            query = query.gte("price", min_price)
        if season:
            query = query.eq("season", season)
            
        res = query.execute()
        return res.data

    async def get_profile(self, user_id: str):
        res = self.supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        return res.data
