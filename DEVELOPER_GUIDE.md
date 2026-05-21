# AuraStyle AI — Developer Guide

A comprehensive reference for engineers working on the AuraStyle AI outfit-planner. This guide covers architecture, every feature in the app, the full API surface, the database schema, how AI integrations work, and where to make common changes.

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Tech stack](#3-tech-stack)
4. [Repository layout](#4-repository-layout)
5. [First-time setup](#5-first-time-setup)
6. [Environment variables](#6-environment-variables)
7. [Authentication flow](#7-authentication-flow)
8. [Feature: Product catalog & mega-menu](#8-feature-product-catalog--mega-menu)
9. [Feature: Virtual try-on studio (clothing)](#9-feature-virtual-try-on-studio-clothing)
10. [Feature: Hair styles lookbook & try-on](#10-feature-hair-styles-lookbook--try-on)
11. [Feature: AI outfit assistant (chat)](#11-feature-ai-outfit-assistant-chat)
12. [Feature: Brand scraper](#12-feature-brand-scraper)
13. [Feature: Profile (full-body + face photo)](#13-feature-profile-full-body--face-photo)
14. [Backend API reference](#14-backend-api-reference)
15. [Frontend routes & key components](#15-frontend-routes--key-components)
16. [Database schema](#16-database-schema)
17. [AI providers & how to swap them](#17-ai-providers--how-to-swap-them)
18. [Common dev tasks (cookbook)](#18-common-dev-tasks-cookbook)
19. [Deployment notes](#19-deployment-notes)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. What this project is

**AuraStyle AI** is a virtual try-on fashion platform. Users:

- Sign up, build a style profile (body type, skin tone, country, style preferences).
- Browse products imported from real e-commerce sites via a Playwright scraper.
- Use AI to virtually try clothing on themselves (face/full-body → outfit overlay).
- Browse a curated hair-style gallery and AI-swap a hairstyle onto their face photo.
- Chat with an AI fashion assistant that asks clarifying questions and proposes outfits tailored to their profile.

It's a microservices-style blueprint: Next.js frontend, FastAPI backend, Supabase (Postgres + auth + storage), and Python Playwright scrapers — wired together with Replicate, OpenRouter, and Google Gemini for ML/AI.

---

## 2. Architecture at a glance

```
┌────────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│  Next.js 14 frontend   │──────▶│  FastAPI backend     │──────▶│  Supabase (Postgres) │
│  (App Router, MUI,     │◀──────│  (uvicorn, async)    │◀──────│  + Auth + Storage    │
│   Three.js)            │       └──────────────────────┘       └──────────────────────┘
│                        │                │
│  - supabase-js SDK     │                ├──▶ Vertex AI Gemini  (text/vision/image — primary)
│  - direct DB reads     │                ├──▶ OpenRouter        (automatic fallback)
│    via anon key        │                ├──▶ Replicate         (IDM-VTon, Stable Fast 3D, FLUX Kontext)
└────────────────────────┘                └──▶ Playwright (Chromium) ──▶ brand websites
```

- The **frontend** talks to Supabase **directly** for auth, public reads (categories, products, hair_styles), and storage uploads (using the anon key).
- The **backend** is used for anything requiring (a) server-side secrets, (b) AI provider calls, (c) admin/upsert operations bypassing RLS, or (d) long-running tasks like scraping.
- **AI work always goes through the backend** — providers' API keys never reach the browser.

---

## 3. Tech stack

### Frontend (`frontend/`)
- **Next.js 14** App Router, **React 18**, **TypeScript 5**
- **MUI v5** + Emotion (component library, dark glassmorphic theme)
- **Three.js** + `@react-three/fiber` + `@react-three/drei` (3D GLB rendering for outfits)
- `@supabase/supabase-js` (auth + direct DB/storage access)
- No state library — local hooks only

### Backend (`backend/`)
- **FastAPI** + **Uvicorn** (ASGI)
- **Pydantic** v1 schemas
- `supabase` Python SDK (sync calls)
- `google-genai` SDK — **primary** AI: Vertex Gemini for text, vision, and image generation
- `openai` SDK pointed at **OpenRouter** base URL — **fallback** AI
- `replicate` SDK (clothing try-on / 3D generation / optional hair-swap)
- All text/vision AI is routed through one module: `app/services/ai_service.py`
- `python-dotenv` loads `.env` from repo root

### Scrapers (`scrapers/`)
- **Playwright** (Chromium headless), keyword-based product categorization, direct Supabase inserts

### Database (`supabase/`)
- Plain SQL migrations under `supabase/migrations/` — apply by pasting into the Supabase SQL Editor
- RLS enabled where appropriate; backend uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for admin ops

---

## 4. Repository layout

```
outfit-planner/
├── .env                          # Shared env vars (frontend reads NEXT_PUBLIC_*, backend reads all)
├── README.md                     # User-facing quick start
├── DEVELOPER_GUIDE.md            # ← this file
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── layout.tsx        # Root: Sidebar + AuthGuard wrap children
│   │   │   ├── page.tsx          # Home / dashboard
│   │   │   ├── login/            # Auth pages
│   │   │   ├── signup/
│   │   │   ├── category/[slug]/  # Category listing + product detail
│   │   │   ├── scraper/          # Admin scraper UI
│   │   │   ├── hair-styles/      # Hair lookbook + try-on flow
│   │   │   └── assistant/        # ChatGPT-style outfit chat
│   │   ├── components/
│   │   │   ├── AuthGuard.tsx           # Redirects unauthenticated users to /login
│   │   │   ├── layout/Sidebar.tsx      # Navigation
│   │   │   ├── layout/Navbar.tsx       # (Unused in current layout)
│   │   │   ├── VirtualTryOnStudio.tsx  # Clothing try-on + 3D + rating
│   │   │   ├── UploadProfileImageModal.tsx  # Full-body photo upload
│   │   │   ├── UploadFacePhotoModal.tsx     # Headshot upload for hair try-on
│   │   │   ├── HairStyleDetailModal.tsx     # Hair try-on + before/after slider
│   │   │   └── ProductDetailModal.tsx
│   │   ├── hooks/useARViewer.ts        # GLB loader, scales by body type
│   │   ├── services/supabase.ts        # Supabase client
│   │   └── utils/countries.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app + router mounting + CORS
│   │   ├── api/v1/
│   │   │   ├── endpoints.py            # Catalog, scraper trigger, mock chat
│   │   │   ├── user_endpoints.py       # Profile photo upload + AI validation
│   │   │   ├── styling_endpoints.py    # Clothing try-on (Replicate IDM-VTon) + 3D + expert rating
│   │   │   ├── hair_endpoints.py       # Hair gallery + try-on (Gemini/Replicate) + AI rating
│   │   │   └── assistant_endpoints.py  # Multi-turn fashion chat
│   │   ├── models/schemas.py           # Pydantic models
│   │   └── services/
│   │       ├── supabase_service.py     # Nested menu + product queries
│   │       └── ai_service.py           # Shared chat() — Vertex Gemini → OpenRouter fallback
│   └── requirements.txt
│
├── supabase/
│   └── migrations/
│       ├── 00000_init.sql                          # profiles, categories, subcategories, brands, products
│       ├── 00001_saved_outfits.sql
│       ├── 00002_add_country_to_profile.sql
│       ├── 00003_allow_anon_scraping.sql
│       ├── 00004_add_full_body_img_to_profile.sql  # + storage bucket + RLS policies
│       ├── 00005_hair_styles.sql                   # hair gallery table
│       └── 00006_add_face_photo_to_profile.sql     # headshot column
│
├── scrapers/
│   └── spiders/brand_spider.py         # Playwright Shopify/generic scraper
│
├── scripts/
│   └── populate_categories.py          # One-shot category/subcategory seeder
│
├── deploy/                             # (empty placeholder)
└── test_replicate_*.py                 # Ad-hoc Replicate model-ID validation scripts
```

---

## 5. First-time setup

### Prerequisites
- **Node.js ≥ 18.17**
- **Python ≥ 3.9**
- A Supabase project (URL + anon key + service role key)
- Optional: API keys for Replicate, OpenRouter, Google Gemini (depending on which AI features you want to run)

### 1. Database
1. Open the Supabase SQL Editor.
2. Paste and run each file in `supabase/migrations/` **in numeric order**.
3. Confirm the `user-images` storage bucket exists (created by migration 00004). If not, create it manually as a public bucket.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install openai replicate requests google-genai   # extras some modules import directly

export PYTHONPATH=$PYTHONPATH:$(pwd)
uvicorn app.main:app --reload
```
Swagger UI: <http://localhost:8000/docs>

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App: <http://localhost:3000>

### 4. Seed categories (one time)
```bash
cd ..
python scripts/populate_categories.py
```

### 5. Scrape your first brand (optional)
```bash
source backend/venv/bin/activate
playwright install chromium
python scrapers/spiders/brand_spider.py --url https://some-brand.com/collections/men
```

---

## 6. Environment variables

The `.env` file at the **repo root** is loaded by both frontend (Next reads `NEXT_PUBLIC_*` automatically) and backend (via `python-dotenv` in `app/main.py`).

| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | front + back | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | front + back | Public anon key for client reads + auth |
| `SUPABASE_SERVICE_ROLE_KEY` | back only | Bypasses RLS for admin upserts (profile updates, hair_styles seeding) |
| `REPLICATE_API_TOKEN` | back | Clothing try-on, 3D generation, hair edit (when provider=replicate) |
| `GOOGLE_GEMINI_API_KEY` | back | **Primary** AI provider — Vertex Express key for all text/vision + hair image gen |
| `OPENROUTER_API_KEY` | back | **Fallback** AI provider — used automatically if Vertex fails |
| `VERTEX_TEXT_MODEL` | back | Vertex text/vision model (default `gemini-2.5-flash`) |
| `OPENROUTER_MODEL` | back | OpenRouter fallback model (default `google/gemini-2.0-flash-001`) |
| `HAIR_TRY_ON_PROVIDER` | back | `gemini` (default) or `replicate` |
| `HAIR_TRY_ON_MODEL` | back | Replicate model ID (default `black-forest-labs/flux-kontext-pro`) |
| `GEMINI_IMAGE_MODEL` | back | Gemini image model (default `gemini-2.5-flash-image`) |

⚠️ Several files contain **hardcoded Supabase fallbacks** for local dev. Remove these before any production deploy — search the repo for the literal `vklmboqczcywqpdkjdgi`.

---

## 7. Authentication flow

**Provider:** Supabase Auth (email/password). Session stored in `localStorage` via `@supabase/supabase-js`.

### Sign-up — [frontend/src/app/signup/page.tsx](frontend/src/app/signup/page.tsx)
1. `supabase.auth.signUp({email, password})` creates an auth user.
2. Immediately inserts a `profiles` row with `id = auth_user_id`, full name, country.
3. Fires a background `POST /api/v1/scraper/trigger` to seed products for the user's country.

### Login — [frontend/src/app/login/page.tsx](frontend/src/app/login/page.tsx)
- `supabase.auth.signInWithPassword({email, password})` → `window.location.href = '/'`.

### Route protection — [frontend/src/components/AuthGuard.tsx](frontend/src/components/AuthGuard.tsx)
- Wraps `{children}` in `layout.tsx`.
- On mount: `supabase.auth.getSession()`. If no session and pathname ∉ `['/login', '/signup']`, `router.replace('/login')`.
- Subscribes to `supabase.auth.onAuthStateChange` → instant redirect on sign-out from anywhere.
- Shows a centered spinner during the session check so protected pages never flash content.

**Note:** Protection is **client-side only**. For production, swap to `@supabase/ssr` + Next middleware reading auth cookies.

### Logout
Triggered from [Sidebar.tsx](frontend/src/components/layout/Sidebar.tsx): `supabase.auth.signOut()` → reloads to `/login`.

---

## 8. Feature: Product catalog & mega-menu

### What it does
Renders a sidebar mega-menu of `categories → subcategories`. Clicking a subcategory shows a paginated, filterable product grid. Each card opens a detail modal with the option to launch the virtual try-on.

### Files
- Frontend: [app/category/[slug]/page.tsx](frontend/src/app/category/[slug]/page.tsx), [app/category/[slug]/[id]/page.tsx](frontend/src/app/category/[slug]/[id]/page.tsx), [components/ProductDetailModal.tsx](frontend/src/components/ProductDetailModal.tsx), [layout/Sidebar.tsx](frontend/src/components/layout/Sidebar.tsx)
- Backend: `GET /api/v1/categories/menu`, `GET /api/v1/products/filter` in [endpoints.py](backend/app/api/v1/endpoints.py)
- DB: `categories`, `subcategories`, `brands`, `products`

### Data flow
1. Sidebar mounts → reads `categories` + nested `subcategories` directly from Supabase using the anon key.
2. Click subcategory → navigates to `/category/{slug}` → page fetches matching products directly from Supabase, filtered by `subcategory_id`.
3. Click product → opens `ProductDetailModal` showing name, price, gallery, description, and a "Virtual Try-On" CTA → opens `VirtualTryOnStudio`.

---

## 9. Feature: Virtual try-on studio (clothing)

### What it does
A 3-step pipeline: (a) AI swaps the selected garment onto the user's full-body photo, (b) generates a rotatable 3D GLB of the resulting outfit, (c) returns expert styling advice (rating + feedback + suggestions).

### Files
- Frontend: [components/VirtualTryOnStudio.tsx](frontend/src/components/VirtualTryOnStudio.tsx), [hooks/useARViewer.ts](frontend/src/hooks/useARViewer.ts)
- Backend: [styling_endpoints.py](backend/app/api/v1/styling_endpoints.py)

### Endpoints
| Method | Path | Purpose | Provider |
|---|---|---|---|
| POST | `/api/v1/styling/try-on` | Image of user wearing the garment | Replicate `cuuupid/idm-vton` |
| POST | `/api/v1/styling/generate-3d` | GLB model from the try-on image | Replicate `camenduru/stable-fast-3d` |
| POST | `/api/v1/styling/expert-advice` | JSON `{rating, feedback, suggestions}` | `ai_service` (Vertex Gemini → OpenRouter fallback), vision |

### Notes
- `useARViewer.ts` scales the loaded GLB based on the user's body type (`Endomorph ×1.2`, `Ectomorph ×0.9`).
- Replicate model versions are pinned with full hashes in `styling_endpoints.py` — update them if Replicate deprecates a version.

---

## 10. Feature: Hair styles lookbook & try-on

### What it does
1. User picks a gender (Men / Women / Kids).
2. Browses curated hairstyles (auto-seeded into DB on first visit per gender).
3. Clicks a card → detail modal opens with style info and a "Try on Me" CTA.
4. If no headshot is uploaded, a tooltip prompts the user to upload one.
5. After upload, "Try on Me" runs AI hair-swap → shows a draggable **before/after slider** + an **AI stylist rating card** (score, pros, cons, suggestions).

### Files
- Frontend page: [app/hair-styles/page.tsx](frontend/src/app/hair-styles/page.tsx)
- Modals: [HairStyleDetailModal.tsx](frontend/src/components/HairStyleDetailModal.tsx), [UploadFacePhotoModal.tsx](frontend/src/components/UploadFacePhotoModal.tsx)
- Backend: [hair_endpoints.py](backend/app/api/v1/hair_endpoints.py)
- DB: `hair_styles` (migration 00005), `profiles.face_photo_url` (migration 00006)

### Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/hair-styles/?gender=Men\|Women\|Kids` | List styles for that gender; seeds DB on first call |
| POST | `/api/v1/hair-styles/try-on` | AI hair-swap; returns `{result_url, provider}` |
| POST | `/api/v1/hair-styles/rate` | Vision LLM rates how the style suits the user |
| POST | `/api/v1/user/update-face-photo` | Save headshot URL to profile (admin upsert) |
| POST | `/api/v1/user/analyze-face-photo` | AI validates the upload is a clear front-facing headshot |

### Hair try-on provider model
Selected by `HAIR_TRY_ON_PROVIDER` env var (default `gemini`, alternative `replicate`):
- **Gemini path:** downloads the face photo → calls `gemini-2.5-flash-image` in **Vertex Express mode** (`genai.Client(vertexai=True, ...)`) with an instruction prompt → receives image bytes → uploads to Supabase `user-images` bucket → returns the public URL. Vertex free credits cover image generation.
- **Replicate path:** sends prompt + face URL to `black-forest-labs/flux-kontext-pro` → returns the Replicate-hosted URL directly.

The rating endpoint (`/rate`) and headshot validation go through `ai_service` (Vertex Gemini → OpenRouter fallback) — see [section 17](#17-ai-providers--how-to-swap-them).

### Seeded styles
On first request for a gender, `_seed_gender` inserts ~8–10 curated styles with stable Unsplash image URLs. To add more, append entries to `SEED_STYLES` in [hair_endpoints.py](backend/app/api/v1/hair_endpoints.py).

---

## 11. Feature: AI outfit assistant (chat)

### What it does
A ChatGPT-style chat UI. The user describes what they're dressing for; the assistant asks one clarifying question at a time, then proposes a complete outfit (top, bottom, shoes, accessories) explaining *why* each piece works given the user's profile.

### Files
- Frontend: [app/assistant/page.tsx](frontend/src/app/assistant/page.tsx)
- Backend: [assistant_endpoints.py](backend/app/api/v1/assistant_endpoints.py)

### How it works
- Frontend keeps the full message history in React state and POSTs the entire array each turn.
- Backend builds one combined system instruction from:
  1. A fashion-expert persona prompt (`SYSTEM_PROMPT`).
  2. A live-pulled profile block (body type, skin tone, country, style prefs) via `_build_profile_context(user_id)`.
- Sends history + system to `ai_service.chat()` — Vertex Gemini first, OpenRouter fallback (see [section 17](#17-ai-providers--how-to-swap-them)).

### Endpoint
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/v1/assistant/chat` | `{messages: [{role, content}], user_id?}` | `{reply}` |

### Extending it
- To make the assistant suggest **specific products from your DB**, fetch a candidate list before the LLM call and include it in a third system message ("Available products: …"). See `query_products()` in [supabase_service.py](backend/app/services/supabase_service.py).
- For persisted conversations, add a `chat_sessions` table and save messages on each turn.

---

## 12. Feature: Brand scraper

### What it does
Crawls Shopify-based or generic fashion e-commerce sites, extracts product details (name, price, colors, sizes, images, SKU), auto-categorizes by keyword, and inserts into Supabase.

### Files
- Spider: [scrapers/spiders/brand_spider.py](scrapers/spiders/brand_spider.py)
- Admin UI: [frontend/src/app/scraper/page.tsx](frontend/src/app/scraper/page.tsx)
- Backend trigger: `POST /api/v1/scraper/trigger` in [endpoints.py](backend/app/api/v1/endpoints.py)

### Modes
1. **Single product URL** (`/products/xyz`): full detail extraction including gallery, variants, description.
2. **Listing page**: paginates `?page=N`, follows each product link, scrapes details.

### Notes
- Categorizer uses keyword maps (extend in `brand_spider.py`'s `Categorizer` class).
- Brand row auto-created from the domain name if missing.
- Resource blocking (PNG/JPG/fonts disabled mid-crawl) keeps crawls fast.
- The backend trigger runs the spider as a subprocess in a `BackgroundTasks` job — fire-and-forget.

---

## 13. Feature: Profile (full-body + face photo)

### Two photo fields
- **`profiles.full_body_img_url`** — for clothing try-on. Must be a full-body shot (head to toe).
- **`profiles.face_photo_url`** — for hair try-on. Must be a clear, front-facing headshot.

Each has its own upload modal and AI validation endpoint:

| Photo type | Upload component | AI validation endpoint | Persist endpoint |
|---|---|---|---|
| Full body | [UploadProfileImageModal.tsx](frontend/src/components/UploadProfileImageModal.tsx) | `POST /api/v1/user/analyze-body-photo` | `POST /api/v1/user/update-profile-image` |
| Face | [UploadFacePhotoModal.tsx](frontend/src/components/UploadFacePhotoModal.tsx) | `POST /api/v1/user/analyze-face-photo` | `POST /api/v1/user/update-face-photo` |

### Upload pipeline (both)
1. Pick file → preview locally.
2. `POST` to backend AI validation endpoint with `FormData` — vision LLM returns `{is_full_body|is_valid_headshot, description}`.
3. If valid, upload bytes to Supabase storage bucket `user-images` from the **client** using anon key.
4. Get public URL → `POST` to backend persist endpoint, which upserts the profile row using the **service role key** (bypasses RLS).

---

## 14. Backend API reference

All endpoints are mounted under `/api/v1`. CORS is open in `main.py` (`allow_origins=["*"]`) — tighten before production.

### Catalog (`endpoints.py`)
| Method | Path | Description |
|---|---|---|
| GET | `/categories/menu` | Nested category → subcategory tree |
| GET | `/products/filter` | Filter products by `category`, `brand`, `min_price`, `season` |
| POST | `/recommendations/style` | Mock — stub `MockAIEngine.predict_outfit` |
| POST | `/chat/send-message` | Mock — stub `MockChatService` (the real chat lives at `/assistant/chat`) |
| POST | `/scraper/trigger` | Fire-and-forget Playwright scraper |

### User profile (`user_endpoints.py`, mounted at `/api/v1/user`)
| Method | Path | Description |
|---|---|---|
| GET | `/profile/{user_id}` | Fetch profile (via service role) |
| POST | `/update-profile-image` | Upsert `full_body_img_url` |
| POST | `/update-face-photo` | Upsert `face_photo_url` |
| POST | `/analyze-body-photo` | Multipart upload → vision LLM validates full-body shot |
| POST | `/analyze-face-photo` | Multipart upload → vision LLM validates headshot |

### Clothing styling (`styling_endpoints.py`, mounted at `/api/v1/styling`)
| Method | Path | Description |
|---|---|---|
| POST | `/try-on` | Replicate IDM-VTon clothing swap |
| POST | `/generate-3d` | Replicate Stable Fast 3D → GLB |
| POST | `/expert-advice` | OpenRouter Gemini vision → outfit rating JSON |

### Hair (`hair_endpoints.py`, mounted at `/api/v1/hair-styles`)
| Method | Path | Description |
|---|---|---|
| GET | `/?gender=` | List styles (seeds DB on first call) |
| POST | `/try-on` | Gemini or Replicate hair-swap |
| POST | `/rate` | Vision LLM rates the swapped result |

### Assistant (`assistant_endpoints.py`, mounted at `/api/v1/assistant`)
| Method | Path | Description |
|---|---|---|
| POST | `/chat` | Multi-turn fashion chat |

---

## 15. Frontend routes & key components

| Route | File | Purpose | Auth required? |
|---|---|---|---|
| `/` | `app/page.tsx` | Dashboard | ✅ |
| `/login` | `app/login/page.tsx` | Email/password sign in | ❌ |
| `/signup` | `app/signup/page.tsx` | New account + profile + scraper bootstrap | ❌ |
| `/category/[slug]` | `app/category/[slug]/page.tsx` | Product grid by subcategory slug | ✅ |
| `/category/[slug]/[id]` | `app/category/[slug]/[id]/page.tsx` | Product detail | ✅ |
| `/scraper` | `app/scraper/page.tsx` | Trigger brand scraper | ✅ |
| `/hair-styles` | `app/hair-styles/page.tsx` | Hair gallery + try-on | ✅ |
| `/assistant` | `app/assistant/page.tsx` | AI fashion chat | ✅ |

Public routes are whitelisted in [AuthGuard.tsx](frontend/src/components/AuthGuard.tsx) (`PUBLIC_ROUTES` array).

### Component cheat sheet
- **AuthGuard** — gates the whole app.
- **Sidebar** — primary navigation. Hides itself on `/login` and `/signup`.
- **VirtualTryOnStudio** — drives the 3-step clothing try-on pipeline.
- **HairStyleDetailModal** — drives the hair try-on flow.
- **UploadProfileImageModal / UploadFacePhotoModal** — paired upload + AI-validate flows.
- **ProductDetailModal** — product detail in a dialog.

---

## 16. Database schema

### Core (`00000_init.sql`)
- **`profiles`** — `id` (UUID, FK to `auth.users`), `full_name`, `body_type`, `skin_tone`, `style_prefs TEXT[]`, `updated_at`. Augmented by later migrations:
  - `00002`: `country TEXT`
  - `00004`: `full_body_img_url TEXT`
  - `00006`: `face_photo_url TEXT`
- **`categories`** — `id`, `name`, `slug` (unique), `image_url`.
- **`subcategories`** — `id`, `category_id` FK, `name`, `slug` (unique).
- **`brands`** — `id`, `name` (unique), `is_local`, `logo_url`.
- **`products`** — `id`, `brand_id` FK, `subcategory_id` FK, `name`, `description`, `price`, `season`, `colors TEXT[]`, `image_url`, `model_3d_url`, `metadata JSONB`, `created_at`.

### Hair (`00005_hair_styles.sql`)
- **`hair_styles`** — `id`, `gender` (CHECK in `Men|Women|Kids`), `name`, `image_url`, `thumb_url`, `source`, `source_url`, `tags TEXT[]`, `description`, `created_at`. RLS enabled with permissive read + insert policies (tighten before production).

### Storage
- Public bucket **`user-images`** (created in `00004`) holds full-body photos, face photos, and hair-swap results.

### Saved outfits (`00001_saved_outfits.sql`)
- Available for "save this look" features but not yet wired into the UI.

---

## 17. AI providers & how to swap them

The project runs **Vertex AI Gemini first**, with **OpenRouter as an automatic fallback**, and **Replicate** for heavy image/3D work. Text and vision AI never call a provider directly — they go through one shared module.

### The shared AI service — [`backend/app/services/ai_service.py`](backend/app/services/ai_service.py)

A single `chat()` function backs **all** text/vision AI in the app. Callers don't know or care which provider answered.

```python
from app.services.ai_service import chat

reply = chat(
    messages=[{"role": "user", "content": "..."}],  # ordered conversation turns
    system="optional system instruction",
    json_mode=False,                                 # True => strict JSON output
    image=(image_bytes, "image/jpeg"),               # optional, attached to last user msg (vision)
)
```

**Provider order inside `chat()`:**
1. **Vertex AI Gemini** (`gemini-2.5-flash`) — tried first. Uses the project's Vertex Express key + free credits.
2. **OpenRouter** (`google/gemini-2.0-flash-001`) — used automatically if Vertex throws *any* error (quota, network, credits exhausted). Logged as `[ai_service] Vertex failed (...); falling back to OpenRouter`.
3. If **both** fail, `chat()` raises `RuntimeError` naming both errors.

**Who uses it:** the AI assistant chat, hair-style rating, clothing expert-advice, and both photo-validation endpoints — see [section 14](#14-backend-api-reference).

Override the models via env: `VERTEX_TEXT_MODEL`, `OPENROUTER_MODEL`.

### Vertex AI Gemini (primary)

> ⚠️ **Critical:** the project's `GOOGLE_GEMINI_API_KEY` is a **Vertex AI Express** key (Google "AI free credits" promo, bound to a service account). It does **not** work with the standard Gemini Developer API (`generativelanguage.googleapis.com`) — that returns `403 API_KEY_SERVICE_BLOCKED`.

It **must** be created in Vertex mode:

```python
from google import genai
client = genai.Client(vertexai=True, api_key=api_key)   # vertexai=True is mandatory
```

- Verified working in Vertex Express mode: text (`gemini-2.5-flash`) **and** image generation (`gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`).
- The free Vertex credits **cover image generation** — unlike the standard Gemini free tier, which returns `limit: 0` for image models.
- To use the key, the API key's "API restrictions" in Google Cloud Console must include **"Gemini API"**.

### OpenRouter (automatic fallback)

A drop-in OpenAI-compatible gateway. Only invoked by `ai_service.chat()` when Vertex fails. Model: `google/gemini-2.0-flash-001`. Keep `OPENROUTER_API_KEY` valid so the fallback path stays alive.

### Replicate (image generation / 3D)

Used for compute-heavy work that isn't routed through `ai_service`: clothing try-on, 3D mesh generation, and the optional Replicate hair-swap path.

```python
import replicate
output = replicate.run(
    "owner/model:version_hash",   # always pin a hash for community models
    input={"prompt": "...", "input_image": url}
)
```

- **Official models** (e.g. `black-forest-labs/flux-kontext-pro`) resolve **without** a hash.
- **Community models** (`lucataco/*`, `cjwbw/*`) **require** a `:hash` suffix or the SDK returns 404.
- Free tier without payment: ~6 predictions/min, burst 1. Add a card on Replicate to lift this.

### Hair try-on provider (separate from `ai_service`)

Hair-swap **image** generation is selected by `HAIR_TRY_ON_PROVIDER`:

| Value | Path | Notes |
|---|---|---|
| `gemini` (default) | Vertex Gemini image model | Uses free credits; `genai.Client(vertexai=True, ...)` |
| `replicate` | FLUX Kontext Pro | Paid per-run |

```bash
# .env
HAIR_TRY_ON_PROVIDER=gemini                       # or replicate
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image         # or gemini-3.1-flash-image-preview
HAIR_TRY_ON_MODEL=black-forest-labs/flux-kontext-pro
```

### Summary

| Workload | Primary | Fallback |
|---|---|---|
| Chat, ratings, expert advice, photo validation (text + vision) | Vertex Gemini via `ai_service` | OpenRouter (automatic) |
| Hair-swap image generation | Vertex Gemini image model | Replicate (manual, via env) |
| Clothing try-on (IDM-VTon) & 3D mesh (Stable Fast 3D) | Replicate | — |

---

## 18. Common dev tasks (cookbook)

### Add a new category/subcategory
Append to `scripts/populate_categories.py` and re-run, **or** insert via the Supabase dashboard.

### Add a new hair style
Edit `SEED_STYLES` in [hair_endpoints.py](backend/app/api/v1/hair_endpoints.py). To force a re-seed, delete the existing rows for that gender — the endpoint re-seeds when the result set is empty.

### Add a new top-level page
1. Create `frontend/src/app/<route>/page.tsx`.
2. (If protected) add a link to [Sidebar.tsx](frontend/src/components/layout/Sidebar.tsx).
3. (If public) add the path to `PUBLIC_ROUTES` in [AuthGuard.tsx](frontend/src/components/AuthGuard.tsx).

### Add a new backend endpoint
1. Create `backend/app/api/v1/<name>_endpoints.py` with `router = APIRouter()`.
2. Import it in [main.py](backend/app/main.py) and `app.include_router(...)` under the appropriate prefix.

### Add a new DB column
1. New file `supabase/migrations/0000N_describe_change.sql`.
2. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`.
3. Paste into the Supabase SQL Editor.
4. Update relevant Pydantic models in `backend/app/models/schemas.py` and any TS types.

### Run only the backend with auto-reload
```bash
cd backend && source venv/bin/activate
PYTHONPATH=$(pwd) uvicorn app.main:app --reload --port 8000
```

### Tail FastAPI logs while debugging an AI call
All AI provider calls print their raw error to stdout — keep `uvicorn` in the foreground and you'll see them inline.

---

## 19. Deployment notes

### Suggested topology
- **Frontend** → Vercel (Next.js native).
- **Backend** → AWS App Runner / Fly.io / Render. Dockerize first (Dockerfile not yet committed under `deploy/`).
- **Database** → Supabase managed (enable PgBouncer pooling).
- **Storage** → Supabase Storage (already used).

### Pre-deploy checklist
- [ ] Strip hardcoded Supabase fallback URLs/keys from [services/supabase.ts](frontend/src/services/supabase.ts) and [supabase_service.py](backend/app/services/supabase_service.py).
- [ ] Replace `CORSMiddleware allow_origins=["*"]` with your frontend origin.
- [ ] Tighten RLS policies on `hair_styles` (currently allows anon inserts for dev).
- [ ] Swap client-side `AuthGuard` for `@supabase/ssr` + Next middleware so unauthenticated requests can't fetch protected data.
- [ ] Pin Replicate model versions with full `:hash` strings.
- [ ] Add a cleanup job for the `user-images` bucket (try-on results accumulate forever otherwise).
- [ ] Move secrets out of `.env` into the platform's secret manager.

---

## 20. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/` doesn't redirect to `/login` | Existing session in `localStorage` | Test in incognito or sign out from the sidebar |
| `403 PERMISSION_DENIED ... API_KEY_SERVICE_BLOCKED ... generativelanguage.googleapis.com` | Vertex Express key used against the standard Gemini API | Code must use `genai.Client(vertexai=True, api_key=...)` — already the case in `ai_service.py` and `hair_endpoints.py` |
| `403 ...` even in Vertex mode | API key's "API restrictions" don't include Gemini API | Google Cloud Console → Credentials → the key → add "Gemini API", save, wait ~5 min |
| `Hair try-on failed: 404 ... is not found for API version v1beta` | Wrong Gemini image model ID | Set `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image` (no `-preview`) |
| `[ai_service] Vertex failed (...); falling back to OpenRouter` | Vertex error — quota, credits exhausted, or network | Informational only; the request still succeeds via OpenRouter. Check Vertex credits if persistent |
| `Both AI providers failed` | Vertex **and** OpenRouter both errored | Verify `GOOGLE_GEMINI_API_KEY` (Vertex) and `OPENROUTER_API_KEY` are both valid |
| `ReplicateError ... 404 The requested resource could not be found` | Community model without `:hash` | Pin a version: `owner/model:HASH` or use an official BFL model |
| `Request was throttled. ... 6 requests per minute with a burst of 1` | Replicate account has no payment method | Add a card on Replicate (predictions still cost per-run after) |
| Module not found: `openai` / `replicate` / `google.genai` | Not in `requirements.txt` even though imported | `pip install openai replicate requests google-genai` in your venv |
| `Failed to upsert profile via admin key` | `SUPABASE_SERVICE_ROLE_KEY` missing or invalid | Copy from Supabase dashboard → Settings → API |
| Sidebar categories don't load | RLS blocking anon read on `categories` | Confirm anon SELECT policy exists |
| AI chat replies are blank | Both providers failing silently | Watch backend stdout for `[ai_service]` logs; verify both AI keys |
| Scraper "trigger" returns 200 but nothing changes | Subprocess running but Playwright Chromium not installed | `playwright install chromium` inside the backend venv |
| Hair try-on result is broken/black | Model rejected the face photo (NSFW filter, no face detected) | Use a clearer, well-lit front-facing headshot |

---

## Quick links

- [README.md](README.md) — user-facing quick start
- [Supabase dashboard](https://app.supabase.com)
- [Replicate model explorer](https://replicate.com/explore)
- [OpenRouter models](https://openrouter.ai/models)
- [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

---

*Last updated: 2026-05-21*
