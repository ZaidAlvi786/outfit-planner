-- Hair Styles gallery, cached from external sources (e.g., Unsplash) on first load per gender
CREATE TABLE IF NOT EXISTS hair_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gender TEXT NOT NULL CHECK (gender IN ('Men', 'Women', 'Kids')),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumb_url TEXT,
  source TEXT,
  source_url TEXT,
  tags TEXT[],
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hair_styles_gender ON hair_styles(gender);

-- Allow anon read; inserts happen server-side via service role / backend
ALTER TABLE hair_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hair styles are readable by everyone" ON hair_styles;
CREATE POLICY "Hair styles are readable by everyone"
  ON hair_styles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hair styles insertable by anon (dev)" ON hair_styles;
CREATE POLICY "Hair styles insertable by anon (dev)"
  ON hair_styles FOR INSERT
  WITH CHECK (true);
