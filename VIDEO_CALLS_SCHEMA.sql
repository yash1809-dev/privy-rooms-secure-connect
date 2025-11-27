-- =================================================================
-- VIDEO CALLS SCHEMA
-- Run this script in Supabase SQL Editor
-- =================================================================

-- 1. Create video_calls table
CREATE TABLE IF NOT EXISTS public.video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- 2. Create call_participants table
CREATE TABLE IF NOT EXISTS public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(call_id, user_id)
);

-- 3. Create call_signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice_candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS Policies for video_calls
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calls they're part of"
  ON public.video_calls FOR SELECT
  USING (
    creator_id = auth.uid() OR
    id IN (SELECT call_id FROM public.call_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create calls"
  ON public.video_calls FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creator can update their calls"
  ON public.video_calls FOR UPDATE
  USING (creator_id = auth.uid());

-- 5. RLS Policies for call_participants
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their calls"
  ON public.call_participants FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM public.video_calls 
      WHERE creator_id = auth.uid() OR id IN (
        SELECT call_id FROM public.call_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can join calls they're invited to"
  ON public.call_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON public.call_participants FOR UPDATE
  USING (user_id = auth.uid());

-- 6. RLS Policies for call_signals
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals for their calls"
  ON public.call_signals FOR SELECT
  USING (
    sender_id = auth.uid() OR
    recipient_id = auth.uid() OR
    call_id IN (
      SELECT id FROM public.video_calls 
      WHERE creator_id = auth.uid() OR id IN (
        SELECT call_id FROM public.call_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can send signals"
  ON public.call_signals FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_calls_creator ON public.video_calls(creator_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_call ON public.call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON public.call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_call ON public.call_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_recipient ON public.call_signals(recipient_id);
