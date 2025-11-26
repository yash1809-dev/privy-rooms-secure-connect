-- ========================================
-- COMPLETE PROFILES TABLE FIX
-- Run this entire script in Supabase SQL Editor
-- ========================================

-- Step 1: Add bio and link columns if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS link TEXT;

-- Step 2: Disable RLS temporarily to reset policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies completely
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users based on id" ON public.profiles;

-- Step 4: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create fresh, clean policies

-- Allow everyone to view all profiles
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

-- Allow users to update ONLY their own profile
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert ONLY their own profile
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

-- Step 6: Verify the setup (this will show you the policies)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
