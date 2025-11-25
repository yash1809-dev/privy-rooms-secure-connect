-- Add read tracking columns to messages
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Create read receipts table for tracking who has read each message
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on read receipts table
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: users can insert their own read receipts
CREATE POLICY "users_can_insert_own_read_receipts"
ON public.message_read_receipts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: users can view read receipts for messages in their groups
CREATE POLICY "users_can_view_read_receipts_in_their_groups"
ON public.message_read_receipts FOR SELECT
TO authenticated
USING (
  message_id IN (
    SELECT gm.id FROM public.group_messages gm
    INNER JOIN public.group_members mem ON gm.group_id = mem.group_id
    WHERE mem.user_id = auth.uid()
  )
);
