-- Add full_body_img_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_body_img_url TEXT;

-- Create storage bucket for user images (if not already handled via Supabase dashboard)
-- Note: In a real environment, you'd usually do this via the dashboard for proper configurations, 
-- but here's the policy/schema reference for a typical 'user-images' bucket.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public access (Read)
CREATE POLICY "Public Access for User Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'user-images' );

-- Policies for authenticated upload (Insert)
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'user-images' );
