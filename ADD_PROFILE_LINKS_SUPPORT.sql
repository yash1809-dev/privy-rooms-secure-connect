-- =================================================================
-- SUPPORT MULTIPLE LINKS (ROBUST VERSION)
-- Run this script in Supabase SQL Editor
-- =================================================================

-- 1. Add 'links' column (JSONB) to store array of { title, url }
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing data safely using a DO block
-- This handles cases where 'link_title' column might not exist
DO $$
BEGIN
  -- Check if link_title column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'link_title') THEN
    -- Run update using link_title
    EXECUTE 'UPDATE public.profiles
             SET links = jsonb_build_array(
               jsonb_build_object(
                 ''title'', COALESCE(link_title, ''Website''),
                 ''url'', link
               )
             )
             WHERE link IS NOT NULL AND link != '''' AND (links IS NULL OR links = ''[]''::jsonb)';
  ELSE
    -- Run update without link_title (default to 'Website')
    EXECUTE 'UPDATE public.profiles
             SET links = jsonb_build_array(
               jsonb_build_object(
                 ''title'', ''Website'',
                 ''url'', link
               )
             )
             WHERE link IS NOT NULL AND link != '''' AND (links IS NULL OR links = ''[]''::jsonb)';
  END IF;
END $$;

-- 3. Drop old columns to clean up schema
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS link,
DROP COLUMN IF EXISTS link_title;
