-- Timetable lectures
CREATE TABLE IF NOT EXISTS public.timetable_lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  subject TEXT NOT NULL,
  instructor TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.timetable_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lectures" ON public.timetable_lectures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lectures" ON public.timetable_lectures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lectures" ON public.timetable_lectures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lectures" ON public.timetable_lectures FOR DELETE
  USING (auth.uid() = user_id);

