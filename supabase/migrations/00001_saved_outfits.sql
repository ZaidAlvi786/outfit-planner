-- 4. User Saved Outfits
CREATE TABLE saved_outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, -- e.g., "Summer Wedding Look"
  products UUID[], -- array of product IDs matching the outfit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
