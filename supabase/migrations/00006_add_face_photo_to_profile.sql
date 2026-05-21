-- Separate headshot photo for hair-style try-on (hair-swap models need a clear face, not a full-body shot)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS face_photo_url TEXT;
