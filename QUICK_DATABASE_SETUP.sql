-- ============================================
-- QUICK SETUP: Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Create the voice_recordings table
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

-- Step 2: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON public.voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_recorded_at ON public.voice_recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_date ON public.voice_recordings(user_id, recorded_at);

-- Step 3: Enable RLS
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
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
-- DONE! Now create the storage bucket:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "Create bucket"
-- 3. Name: voice-recordings
-- 4. Public: NO (keep it unchecked)
-- 5. Click Create
-- 
-- Then add storage policies (see VOICE_RECORDINGS_SETUP.md)
-- ============================================
