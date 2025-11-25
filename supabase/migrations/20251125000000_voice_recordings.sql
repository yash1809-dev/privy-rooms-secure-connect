-- ============================================
-- VOICE RECORDINGS FEATURE
-- Persistent storage for voice notes with audio files
-- ============================================

-- Create voice_recordings table
CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  transcript TEXT,
  audio_url TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON public.voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_recorded_at ON public.voice_recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_date ON public.voice_recordings(user_id, recorded_at);

-- Enable RLS
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own recordings" ON public.voice_recordings;
CREATE POLICY "Users can view own recordings"
  ON public.voice_recordings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recordings" ON public.voice_recordings;
CREATE POLICY "Users can insert own recordings"
  ON public.voice_recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recordings" ON public.voice_recordings;
CREATE POLICY "Users can delete own recordings"
  ON public.voice_recordings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET SETUP
-- Note: Storage bucket must be created manually in Supabase Dashboard
-- or via the following commands:
--
-- Bucket name: voice-recordings
-- Settings:
--   - Public: false (files are only accessible by owner)
--   - File size limit: 50MB
--   - Allowed MIME types: audio/webm, audio/wav, audio/mpeg, audio/mp4
--
-- Storage RLS policies (apply in Supabase Dashboard > Storage):
--   1. Allow users to upload their own files:
--      INSERT: bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
--   2. Allow users to read their own files:
--      SELECT: bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
--   3. Allow users to delete their own files:
--      DELETE: bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
-- ============================================
