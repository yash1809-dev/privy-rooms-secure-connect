-- =================================================================
-- FIX STORAGE RLS POLICIES
-- Run this script in the Supabase SQL Editor to fix the upload error.
-- =================================================================

-- 1. Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (it usually is, but just in case)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies for the avatars bucket to avoid conflicts
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- 4. Create comprehensive policies for the avatars bucket

-- Policy: Public Read Access
-- Allow anyone to view images in the avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Authenticated Upload Access
-- Allow any authenticated user to upload to the avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Policy: Owner Update Access
-- Allow users to update (replace) files they uploaded
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Policy: Owner Delete Access
-- Allow users to delete files they uploaded
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 5. Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
