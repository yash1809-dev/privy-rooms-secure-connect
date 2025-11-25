-- ============================================
-- COMPLETE DATABASE SETUP FOR PRIVYROOMS
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Migration 1: Core tables (profiles, rooms, groups)
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  password_hash TEXT,
  is_password_protected BOOLEAN DEFAULT false,
  max_participants INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms"
  ON public.rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their rooms" ON public.rooms;
CREATE POLICY "Creators can update their rooms"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their rooms" ON public.rooms;
CREATE POLICY "Creators can delete their rooms"
  ON public.rooms FOR DELETE
  USING (auth.uid() = creator_id);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  password_hash TEXT,
  is_password_protected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
CREATE POLICY "Anyone can view groups"
  ON public.groups FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their groups" ON public.groups;
CREATE POLICY "Creators can update their groups"
  ON public.groups FOR UPDATE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their groups" ON public.groups;
CREATE POLICY "Creators can delete their groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = creator_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration 2: Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read follows" ON public.follows;
CREATE POLICY "Anyone can read follows" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can follow" ON public.follows;
CREATE POLICY "Authenticated can follow" ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow themselves" ON public.follows;
CREATE POLICY "Users can unfollow themselves" ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Migration 3: Add coffee_url to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coffee_url TEXT;

-- Migration 4: Group members and messages
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members readable" ON public.group_members;
CREATE POLICY "Members readable" ON public.group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can add members" ON public.group_members;
CREATE POLICY "Admins can add members" ON public.group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND (g.creator_id = auth.uid())));

DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;
CREATE POLICY "Admins can remove members" ON public.group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND (g.creator_id = auth.uid())));

CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read group messages" ON public.group_messages;
CREATE POLICY "Anyone can read group messages" ON public.group_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can insert messages" ON public.group_messages;
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

-- Migration 5: Group notes, polls, votes, recaps
CREATE TABLE IF NOT EXISTS public.group_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read group notes" ON public.group_notes;
CREATE POLICY "Anyone can read group notes" ON public.group_notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can insert notes" ON public.group_notes;
CREATE POLICY "Members can insert notes" ON public.group_notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read group polls" ON public.group_polls;
CREATE POLICY "Anyone can read group polls" ON public.group_polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can create polls" ON public.group_polls;
CREATE POLICY "Members can create polls" ON public.group_polls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.group_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, voter_id)
);

ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read poll votes" ON public.group_poll_votes;
CREATE POLICY "Anyone can read poll votes" ON public.group_poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can vote" ON public.group_poll_votes;
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

CREATE TABLE IF NOT EXISTS public.group_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_recaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read group recaps" ON public.group_recaps;
CREATE POLICY "Anyone can read group recaps" ON public.group_recaps FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can add recaps" ON public.group_recaps;
CREATE POLICY "Members can add recaps" ON public.group_recaps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);

-- Migration 6: Timetable lectures
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

DROP POLICY IF EXISTS "Users can view own lectures" ON public.timetable_lectures;
CREATE POLICY "Users can view own lectures" ON public.timetable_lectures FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lectures" ON public.timetable_lectures;
CREATE POLICY "Users can insert own lectures" ON public.timetable_lectures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lectures" ON public.timetable_lectures;
CREATE POLICY "Users can update own lectures" ON public.timetable_lectures FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lectures" ON public.timetable_lectures;
CREATE POLICY "Users can delete own lectures" ON public.timetable_lectures FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- MIGRATION COMPLETE!
-- Next: Create the 'avatars' storage bucket
-- ============================================

-- Migration 7: Voice Recordings
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

CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON public.voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_recorded_at ON public.voice_recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_date ON public.voice_recordings(user_id, recorded_at);

ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

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

