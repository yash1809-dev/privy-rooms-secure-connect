-- Add link_title column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS link_title TEXT;
