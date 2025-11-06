-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members readable" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Admins can add members" ON public.group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND (g.creator_id = auth.uid())));
CREATE POLICY "Admins can remove members" ON public.group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND (g.creator_id = auth.uid())));

-- Group messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read group messages" ON public.group_messages FOR SELECT USING (true);
CREATE POLICY "Members can insert messages" ON public.group_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = group_id AND m.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.creator_id = auth.uid()
    )
  );


