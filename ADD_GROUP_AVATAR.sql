-- Add avatar_url column to groups table if it doesn't exist
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Policy to allow anyone to read group avatars (if not already covered by public read)
-- This assumes public read is enabled for groups table, which is typical for chat apps

-- Note: Storage bucket 'avatars' policies should already be set up from Profile feature.
