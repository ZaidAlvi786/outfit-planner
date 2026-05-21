import os
import asyncio
from supabase import create_client

# Load configuration (manually for now since this is a script)
supabase_url = "https://vklmboqczcywqpdkjdgi.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbG1ib3FjemN5d3FwZGtqZGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDAxNzYsImV4cCI6MjA4OTg3NjE3Nn0.l38WBBg7V1PihGZgGv5JojH06z96PUkFopQzHXk3mOU"
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
