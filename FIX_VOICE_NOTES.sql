
-- FIX VOICE NOTES SETUP
-- 1. Create the correct bucket "voice-notes" (code uses this name, NOT 'voice-recordings')
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated uploads to voice-notes
DROP POLICY IF EXISTS "Allow authenticated uploads voice-notes" ON storage.objects;
CREATE POLICY "Allow authenticated uploads voice-notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-notes');

-- 3. Allow public read access to voice-notes
DROP POLICY IF EXISTS "Allow public read access voice-notes" ON storage.objects;
CREATE POLICY "Allow public read access voice-notes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-notes');

-- 4. Ensure audio_url column exists in group_messages
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 5. Ensure file_X columns exist (mentioned by user as working but good to double check)
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS poll_data JSONB;
