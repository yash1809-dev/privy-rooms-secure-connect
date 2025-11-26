-- Add bio and link fields to profiles table for Instagram-style profile editing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS link TEXT;
