-- 1. Identity & Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  body_type TEXT, -- Ectomorph, Mesomorph, Endomorph, Plus-size
  skin_tone TEXT, -- Warm, Cool, Neutral (or HEX)
  style_prefs TEXT[], -- ['Streetwear', 'Classic', 'Minimalist']
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Navigation Hierarchy (For Mega Menu)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT -- Thumbnail for Mega Menu
);

CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_local BOOLEAN DEFAULT false,
  logo_url TEXT
);

-- 3. Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  subcategory_id UUID REFERENCES subcategories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  season TEXT CHECK (season IN ('Summer', 'Winter', 'All')),
  colors TEXT[],
  image_url TEXT, -- 2D Preview
  model_3d_url TEXT, -- .glb file
  metadata JSONB, -- { "neckline": "V-neck", "material": "Cotton" }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
