-- =================================================================
-- SUPPORT MULTIPLE LINKS
-- Run this script in Supabase SQL Editor
-- =================================================================

-- 1. Add 'links' column (JSONB) to store array of { title, url }
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing data (if any) from old columns to new 'links' array
-- This ensures we don't lose the user's current link
UPDATE public.profiles
SET links = jsonb_build_array(
  jsonb_build_object(
    'title', COALESCE(link_title, 'Website'),
    'url', link
  )
)
WHERE link IS NOT NULL AND link != '' AND (links IS NULL OR links = '[]'::jsonb);

-- 3. Drop old columns to clean up schema
-- We do this safely by checking if they exist
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS link,
DROP COLUMN IF EXISTS link_title;
