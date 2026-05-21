from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv
import asyncio
import os
import argparse

# Load Supabase credentials from the repo-root .env (never hardcode keys).
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

class Categorizer:
    def __init__(self, supabase):
        self.supabase = supabase
        self.subcat_cache = {}
        # Predefined keyword to subcategory mapping
        self.keywords = {
            "t-shirts": ["t-shirt", "tee", "tshirt"],
            "shirts": ["shirt", "polo", "button-down"],
            "pants": ["pant", "trouser", "chino", "bottom"],
            "jeans": ["jean", "denim"],
            "shorts": ["short"],
            "dresses": ["dress", "maxi", "midi", "frock"],
            "skirts": ["skirt"],
            "jackets": ["jacket", "blazer", "outerwear"],
            "coats": ["coat", "overcoat"],
            "sweaters": ["sweater", "cardigan", "knitwear"],
            "hoodies": ["hoodie", "sweatshirt"],
            "sneakers": ["sneaker", "trainer", "jogger"],
            "boots": ["boot"],
            "formal-shoes": ["formal", "oxford", "derby"],
            "sandals": ["sandal", "flip-flop"],
            "loafers": ["loafer"],
            "bags": ["bag", "handbag", "backpack"],
            "belts": ["belt"],
            "hats": ["hat", "cap", "beanie"],
            "watches": ["watch"],
            "jewelry": ["jewelry", "necklace", "ring", "bracelet"],
            "glasses": ["glasses", "sunglasses", "eyewear"]
        }

    def identify_subcategory(self, name, url):
        text = (name + " " + url).lower()
        for sub_slug, keys in self.keywords.items():
            if any(k in text for k in keys):
                return sub_slug
        return "t-shirts" # Default fallback for now

    def get_subcategory_id(self, sub_slug):
        if sub_slug in self.subcat_cache:
            return self.subcat_cache[sub_slug]
        
        try:
            res = self.supabase.table("subcategories").select("id").eq("slug", sub_slug).execute()
            if res.data:
                id = res.data[0]["id"]
                self.subcat_cache[sub_slug] = id
                return id
            
            # Auto-create logic
            # 1. Determine parent category
            parent_cat = "Clothes"
            for cat, subcats in {
                "Shoes": ["sneakers", "boots", "formal-shoes", "sandals", "loafers"],
                "Accessories": ["bags", "belts", "hats", "watches", "jewelry", "glasses"],
                "Hair": ["style", "color"]
            }.items():
                if sub_slug in subcats:
                    parent_cat = cat
                    break
            
            # 2. Ensure parent category exists
            cat_res = self.supabase.table("categories").select("id").eq("name", parent_cat).execute()
            if cat_res.data:
                cat_id = cat_res.data[0]["id"]
            else:
                cat_res = self.supabase.table("categories").insert({
                    "name": parent_cat, 
                    "slug": parent_cat.lower()
                }).execute()
                cat_id = cat_res.data[0]["id"]

            # 3. Create subcategory
            sub_res = self.supabase.table("subcategories").insert({
                "category_id": cat_id,
                "name": sub_slug.replace("-", " ").capitalize(),
                "slug": sub_slug
            }).execute()
            
            if sub_res.data:
                id = sub_res.data[0]["id"]
                self.subcat_cache[sub_slug] = id
                return id
        except Exception as e:
            print(f"Error auto-creating subcategory {sub_slug}: {e}")
        return None

class FashionScraper:
    def __init__(self):
        # Credentials come from .env only.
        supabase_url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
        supabase_key = (os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "").strip()
        if not supabase_url or not supabase_key:
            raise RuntimeError("Supabase credentials missing — set them in .env")
        self.supabase = create_client(supabase_url, supabase_key)
        self.categorizer = Categorizer(self.supabase)

    def ensure_brand(self, domain):
        brand_name = domain.split('.')[0].capitalize()
        try:
            res = self.supabase.table("brands").select("*").eq("name", brand_name).execute()
            if res.data:
                return res.data[0]["id"]
            res = self.supabase.table("brands").insert({"name": brand_name, "is_local": True}).execute()
            if res.data:
                return res.data[0]["id"]
        except Exception as e:
            print(f"Error ensuring brand: {e}")
        return None

    async def scrape_product_details(self, page, url, brand_id):
        """Extracts complete product details from a detail page."""
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=90000)
            await page.evaluate("window.scrollTo(0, 500)")
            await asyncio.sleep(2)
            
            # 1. Basic Info
            name_selectors = ["h1.c-product-template__title", "h1.c-product-info__title", "h1.product-single__title", "h1.product-title", "h1"]
            price_selectors = ["span.o-pricing__money.o-pricing__price", "p.c-product-info__price", "span.c-product-info__price", ".product-single__price", "span.money"]
            
            name = ""
            for sel in name_selectors:
                if await page.locator(sel).count() > 0:
                    name = (await page.locator(sel).first.inner_text()).strip()
                    if name: break

            price = 299.0
            for sel in price_selectors:
                if await page.locator(sel).count() > 0:
                    price_text = await page.locator(sel).first.inner_text()
                    import re
                    price_match = re.search(r'(?:Rs|PKR|\$|€|£)\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)', price_text, re.I)
                    if price_match:
                        price = float(price_match.group(1).replace(',', ''))
                        break

            # 2. Variants (Sizes & Colors)
            variants = {"sizes": [], "colors": []}
            # Engine uses .o-swatches__swatch, others use .swatch or .variant-wrapper
            swatch_containers = await page.locator(".o-swatches__swatch, .swatch, .variant-wrapper, .product-form__input").all()
            for container in swatch_containers:
                try:
                    label_elem = container.locator("label, .o-swatches__label, .swatch__title, .variant__label")
                    if await label_elem.count() > 0:
                        label_text = (await label_elem.first.inner_text()).lower()
                        # Options can be buttons, inputs, or divs
                        buttons = await container.locator("button, .o-swatches__swatch-button, .swatch-element, .variant-input").all()
                        options = []
                        for b in buttons:
                            opt = (await b.inner_text()).strip()
                            if not opt: # Try attributes if text is empty (common for color swatches)
                                opt = await b.get_attribute("title") or await b.get_attribute("data-value") or \
                                      await b.get_attribute("aria-label") or ""
                            if opt and opt not in options: options.append(opt)
                        
                        if "size" in label_text: variants["sizes"].extend(options)
                        elif "color" in label_text: variants["colors"].extend(options)
                except Exception as e:
                    print(f"Skip swatch container: {e}")

            # 3. Gallery Images
            image_selectors = ["div.c-product-media__item img", "img.o-image", ".c-product-gallery img", ".product-single__photo img"]
            gallery_urls = []
            for sel in image_selectors:
                imgs = await page.locator(sel).all()
                for img in imgs:
                    src = await img.get_attribute("src") or await img.get_attribute("data-src") or ""
                    if src:
                        if src.startswith("//"): src = "https:" + src
                        if " " in src: src = src.split(" ")[0]
                        if src not in gallery_urls: gallery_urls.append(src)
            
            # 4. Description & Metadata
            # Handle Engine's accordion description
            description = ""
            desc_selector = "details.o-accordion__slide"
            accordions = await page.locator(desc_selector).all()
            for acc in accordions:
                summary = (await acc.locator("summary").inner_text()).lower()
                if "description" in summary:
                    description = (await acc.inner_text()).replace(summary.upper(), "").strip()
                    break
            
            if not description:
                description = (await page.locator(".c-product-info__description").first.inner_text() if await page.locator(".c-product-info__description").count() > 0 else "")

            # SKU and Fabric
            sku = (await page.locator("p.o-paragraph--2").first.inner_text() if await page.locator("p.o-paragraph--2").count() > 0 else "")
            import re
            sku_match = re.search(r'[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+', sku)
            sku = sku_match.group(0) if sku_match else sku

            # 5. Save to Supabase
            sub_slug = self.categorizer.identify_subcategory(name, url)
            subcategory_id = self.categorizer.get_subcategory_id(sub_slug)

            data = {
                "name": name,
                "price": price,
                "brand_id": brand_id,
                "subcategory_id": subcategory_id,
                "image_url": gallery_urls[0] if gallery_urls else "",
                "colors": variants["colors"],
                "description": description,
                "metadata": {
                    "source": "web-scraper-enhanced",
                    "url": url,
                    "identified_category": sub_slug,
                    "gallery_urls": gallery_urls,
                    "sizes": variants["sizes"],
                    "sku": sku
                }
            }
            self.supabase.table("products").insert(data).execute()
            print(f"Saved Detailed Product: {name[:20]}... (Sizes: {len(variants['sizes'])}, Photos: {len(gallery_urls)})")
            return True
        except Exception as e:
            print(f"Error scraping product {url}: {e}")
            return False

    async def scrape_site(self, base_url, brand_id_placeholder):
        from urllib.parse import urlparse
        domain = urlparse(base_url).netloc
        brand_id = self.ensure_brand(domain)
        if not brand_id:
            print(f"Failed to resolve brand ID for {domain}")
            return
        
        # Shopify specific detection
        is_product_page = "/products/" in base_url and "?page=" not in base_url
        
        print(f"Starting {'single' if is_product_page else 'deep multi-page'} scrape for {base_url} (Resolved Brand: {brand_id})")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--disable-web-security"])
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800}
            )
            page = await context.new_page()
            
            # Relax resource blocking
            await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}", lambda route: route.abort())

            if is_product_page:
                # --- SINGLE PRODUCT SCRAPE ---
                await self.scrape_product_details(page, base_url, brand_id)
            else:
                # --- MULTI-PAGE LISTING SCRAPE ---
                current_page = 1
                max_pages = 2 # Reduced for deep crawl safety, user can increase
                total_scraped = 0

                while current_page <= max_pages:
                    url = base_url.split('?')[0] + (f"?page={current_page}" if "?" not in base_url else f"&page={current_page}")
                    print(f"--- Scraping Page {current_page}: {url} ---")
                    
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=90000)
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
                        await asyncio.sleep(2)
                    except Exception as e:
                        print(f"Warning: Navigation to {url} failed: {e}")
                        break

                    product_item_selectors = [
                        "a.o-product-thumbnail", ".product-card a", ".product-item a", ".grid-view-item a", 
                        ".product-grid-item a", "li.product a", ".item-product a"
                    ]
                    
                    product_links = []
                    for selector in product_item_selectors:
                        links = await page.locator(selector).all()
                        if links:
                            for l in links:
                                href = await l.get_attribute("href")
                                if href:
                                    if href.startswith("/"):
                                        parsed_base = urlparse(base_url)
                                        href = f"{parsed_base.scheme}://{parsed_base.netloc}{href}"
                                    if href not in product_links:
                                        product_links.append(href)
                            
                            if len(product_links) >= 1:
                                print(f"Found {len(product_links)} product links using selector: {selector}")
                                break
                    
                    if not product_links:
                        print("No more products found on this page. Stopping.")
                        break

                    # Crawl each product link
                    for link in product_links:
                        success = await self.scrape_product_details(page, link, brand_id)
                        if success: total_scraped += 1
                        # Always go back to the listing page (Playwright will handle navigation)
                        # We don't actually need to "go back" if we just use page.goto(link)
                        # but we need to go back to the listing URL for the next loop iteration or next link
                        # Actually, we can just goto(url) again or stay on the product page and then goto(next_link)
                    
                    current_page += 1

                print(f"Finished Deep Crawl. Total scraped: {total_scraped}")

            await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the AuraStyle Brand Spider")
    parser.add_argument("--country", type=str, default="USA", help="The country to scrape brands for")
    parser.add_argument("--url", type=str, help="The specific URL to scrape")
    args = parser.parse_args()
    
    if args.url:
        target_url = args.url
    else:
        country_urls = {
            "USA": "https://example-usa.com",
            "UK": "https://example-uk.com",
            "Canada": "https://example-ca.com",
            "Australia": "https://example-au.com"
        }
        target_url = country_urls.get(args.country, "https://example.com")
    
    scraper = FashionScraper()
    asyncio.run(scraper.scrape_site(target_url, f"brand-uuid-{args.country}"))
