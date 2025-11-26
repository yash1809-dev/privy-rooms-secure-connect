-- =================================================================
-- FIX STORAGE RLS (PERMISSION SAFE VERSION)
-- Run this script in the Supabase SQL Editor.
-- =================================================================

-- 1. Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create policies (we skip ALTER TABLE as it requires superuser)

-- Drop policies if they exist to avoid conflicts
-- Note: If these fail with permission errors, you may need to use the Supabase Dashboard UI
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Policy: Public Read Access
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Authenticated Upload Access
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Policy: Owner Update Access
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Policy: Owner Delete Access
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
