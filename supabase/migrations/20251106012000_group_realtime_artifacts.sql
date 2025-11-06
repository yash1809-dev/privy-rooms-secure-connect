-- Notes
CREATE TABLE IF NOT EXISTS public.group_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.group_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read group notes" ON public.group_notes FOR SELECT USING (true);
CREATE POLICY "Members can insert notes" ON public.group_notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);

-- Polls
CREATE TABLE IF NOT EXISTS public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read group polls" ON public.group_polls FOR SELECT USING (true);
CREATE POLICY "Members can create polls" ON public.group_polls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);

-- Poll votes
CREATE TABLE IF NOT EXISTS public.group_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, voter_id)
);
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read poll votes" ON public.group_poll_votes FOR SELECT USING (true);
CREATE POLICY "Members can vote" ON public.group_poll_votes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_polls p
    JOIN public.group_members m ON m.group_id = p.group_id AND m.user_id = auth.uid()
    WHERE p.id = poll_id
  ) OR EXISTS (
    SELECT 1 FROM public.group_polls p
    JOIN public.groups g ON g.id = p.group_id AND g.creator_id = auth.uid()
    WHERE p.id = poll_id
  )
);

-- Recaps
CREATE TABLE IF NOT EXISTS public.group_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.group_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read group recaps" ON public.group_recaps FOR SELECT USING (true);
CREATE POLICY "Members can add recaps" ON public.group_recaps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);


