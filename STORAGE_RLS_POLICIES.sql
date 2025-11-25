-- ============================================
-- STORAGE BUCKET RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- Policy 1: Allow users to upload their own files
-- Files are organized by user_id: voice-recordings/{user_id}/{timestamp}.webm
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow users to read their own files
CREATE POLICY "Users can read own recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow users to delete their own files
CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- DONE! Now try creating a voice recording again
-- ============================================
