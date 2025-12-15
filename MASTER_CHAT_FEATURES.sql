
-- MASTER MIGRATION FOR CHAT FEATURES
-- Includes: Last Seen, Typing Indicators, Read Receipts, Pinned/Archived Chats

-- 1. Last Seen (Profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

DROP POLICY IF EXISTS "Users can update their own last_seen" ON public.profiles;
CREATE POLICY "Users can update their own last_seen" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Typing Indicators
CREATE TABLE IF NOT EXISTS public.group_typing_status (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.group_typing_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_typing_status_in_their_groups" ON public.group_typing_status;
CREATE POLICY "users_can_view_typing_status_in_their_groups"
ON public.group_typing_status FOR SELECT
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM public.group_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "users_can_update_own_typing_status" ON public.group_typing_status;
CREATE POLICY "users_can_update_own_typing_status"
ON public.group_typing_status FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_typing_status_update" ON public.group_typing_status;
CREATE POLICY "users_can_update_own_typing_status_update"
ON public.group_typing_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 3. Read Receipts
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_insert_own_read_receipts" ON public.message_read_receipts;
CREATE POLICY "users_can_insert_own_read_receipts"
ON public.message_read_receipts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_view_read_receipts_in_their_groups" ON public.message_read_receipts;
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

-- 4. Pinned/Archived Chats (Extras)
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
