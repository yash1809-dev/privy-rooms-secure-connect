-- =================================================================
-- FINAL FIX FOR PROFILE UPDATES
-- Run this script in the Supabase SQL Editor to fix the RLS error.
-- =================================================================

-- 1. Ensure the profiles table has the necessary columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS link TEXT;

-- 2. Enable RLS (ensure it's on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to start fresh (covering all previous names)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- 4. Create simplified, robust policies

-- Policy 1: Allow everyone to VIEW profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Policy 2: Allow users to UPDATE their own profile
-- This covers both the condition to find the row (USING) and verify the new row (WITH CHECK)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to INSERT their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Grant necessary permissions to authenticated users
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 6. Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
