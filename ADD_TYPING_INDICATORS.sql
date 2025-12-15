-- Add typing indicators and optimize for real-time messaging

-- 1. Create typing_status table for real-time typing indicators
CREATE TABLE IF NOT EXISTS public.typing_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_typing boolean DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for typing_status
DROP POLICY IF EXISTS "Anyone can view typing status" ON public.typing_status;
CREATE POLICY "Anyone can view typing status"
ON public.typing_status FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update own typing status" ON public.typing_status;
CREATE POLICY "Users can update own typing status"
ON public.typing_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update typing" ON public.typing_status;
CREATE POLICY "Users can update typing"
ON public.typing_status FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own typing" ON public.typing_status;
CREATE POLICY "Users can delete own typing"
ON public.typing_status FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_status_group ON public.typing_status(group_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_user ON public.typing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_updated ON public.typing_status(last_updated DESC);

-- 2. Function to auto-cleanup old typing status (older than 10 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
  DELETE FROM public.typing_status
  WHERE last_updated < NOW() - INTERVAL '10 seconds'
  OR is_typing = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You might want to call this function periodically via a cron job or edge function
-- For now, we'll handle cleanup on the client side
