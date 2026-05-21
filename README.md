# 👗 AuraStyle AI — Your Personal AI Fashion Studio

> An AI-powered virtual try-on fashion platform. Upload a photo, and let AI dress you, restyle your hair, plan your outfits, and rate your look — all before you buy a single thing.

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js%2014-000000?logo=next.js&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white">
  <img alt="Gemini" src="https://img.shields.io/badge/Google%20Gemini-8E75B2?logo=google&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
</p>

---

## 💡 Why AuraStyle?

Shopping for clothes online is a guessing game — *"Will this actually look good on me?"* AuraStyle removes the guesswork.

| The problem | What AuraStyle does |
|---|---|
| 🤔 You can't tell if an outfit suits you until it arrives | **AI dresses your photo** in the garment — see it before you buy |
| 💸 Returns are expensive and wasteful | Try on **virtually** — decide with confidence |
| ✂️ Changing your hairstyle is a leap of faith | **AI restyles your hair** so you see the cut on your own face first |
| 🧥 You don't know what to wear for an event | A **personal AI stylist** plans the whole outfit for you |
| 🛍️ Building a product catalog is slow | A **scraper** auto-imports products from real fashion sites |

It's a complete, enterprise-ready blueprint — not a toy demo.

---

## ✨ Features

### 🧥 Virtual Clothing Try-On
Upload a full-body photo, pick any product, and AI generates a photorealistic image of **you wearing it**. Includes a **360° spin viewer** — drag to see the outfit from every angle — plus an instant **expert stylist rating** (score + feedback + what to pair it with).

### 💇 AI Hair Style Studio
Browse **120+ hairstyles** across Men, Women, Boys & Girls. Upload a headshot and AI applies any cut to **your own face** — a precise, spec-driven transfer (top, sides, fade, texture all matched). Get a stylist score on how it suits you, with a before/after slider.

### 🤖 AI Outfit Assistant
A ChatGPT-style fashion chat. Tell it the occasion — *"outfit for a summer wedding"* — and it asks the right questions, then designs a head-to-toe look tailored to **your body type, skin tone, and style profile**.

### 🛍️ Smart Product Catalog
A dynamic, filterable catalog with a category mega-menu — clothes, shoes, accessories — sorted by brand, price, and season.

### 🕷️ Automated Brand Scraper
Point it at any fashion e-commerce site and it crawls, auto-categorizes, and imports products (names, prices, colors, images) straight into the database.

### 🔐 Secure Accounts & Profiles
Email/password auth, protected routes, and a personal style profile (body type, skin tone, preferences) that powers every AI recommendation.

---

## 🧠 Powered by AI

| Capability | Engine |
|---|---|
| Hair & clothing try-on, 360° views | **Google Vertex AI — Gemini** (image generation) |
| Outfit chat, style ratings, photo validation | **Gemini** via Vertex, with **OpenRouter** fallback |
| Heavy ML (optional) | **Replicate** |

The whole platform runs **primarily on Google's free Vertex AI credits** — Gemini first, OpenRouter as an automatic fallback, so the app keeps working even if one provider fails.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, MUI, Three.js |
| **Backend** | FastAPI, Python, Pydantic |
| **Database & Auth** | Supabase (PostgreSQL + Auth + Storage) |
| **AI** | Google Vertex AI (Gemini), OpenRouter, Replicate |
| **Scraping** | Playwright (headless Chromium) |

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js    │────▶│   FastAPI    │────▶│   Supabase   │
│  Frontend   │◀────│   Backend    │◀────│  PG + Auth   │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           ├──▶ Vertex AI (Gemini)
                           ├──▶ OpenRouter (fallback)
                           └──▶ Playwright ──▶ brand sites
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.17 · Python ≥ 3.9
- A Supabase project
- A Google Gemini (Vertex) API key — see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) §17

### 1. Environment
```bash
cp .env.example .env   # then fill in your keys
```

### 2. Database
Run each file in `supabase/migrations/` (in order) in the Supabase SQL Editor.

### 3. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=$PYTHONPATH:$(pwd)
uvicorn app.main:app --reload
```
API docs: <http://localhost:8000/docs>

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```
App: <http://localhost:3000>

### 5. Seed & scrape (optional)
```bash
python scripts/populate_categories.py
source backend/venv/bin/activate && playwright install chromium
python scrapers/spiders/brand_spider.py --url https://some-brand.com/collections/men
```

---

## 📚 Documentation

Full architecture, API reference, database schema, and a developer cookbook live in **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)**.

---

## 📦 Project Structure

```
outfit-planner/
├── frontend/    # Next.js 14 app — UI, try-on studio, hair studio, AI chat
├── backend/     # FastAPI — catalog, AI try-on, ratings, assistant
├── supabase/    # SQL migrations — profiles, products, hair styles
├── scrapers/    # Playwright brand scraper
├── scripts/     # Seeding & maintenance scripts
└── deploy/      # CI/CD & Dockerfile configs
```

---

## 🌐 Deployment

- **Frontend** → Vercel (edge rendering, integrated caching)
- **Backend** → Docker on AWS App Runner / Fly.io / Render
- **Database** → Supabase managed (enable PgBouncer pooling for scale)

---

<p align="center"><i>Built as an enterprise-ready blueprint for the future of AI fashion retail.</i></p>
