-- Add pinned and archived status to group members
ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create typing status table
CREATE TABLE IF NOT EXISTS public.group_typing_status (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Enable RLS on typing status
ALTER TABLE public.group_typing_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view typing status in their groups
CREATE POLICY "users_can_view_typing_status_in_their_groups"
ON public.group_typing_status FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM public.group_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their own typing status
CREATE POLICY "users_can_update_own_typing_status"
ON public.group_typing_status FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid())
ON CONFLICT (group_id, user_id) DO UPDATE
SET is_typing = EXCLUDED.is_typing,
    updated_at = EXCLUDED.updated_at;

CREATE POLICY "users_can_update_own_typing_status_update"
ON public.group_typing_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
