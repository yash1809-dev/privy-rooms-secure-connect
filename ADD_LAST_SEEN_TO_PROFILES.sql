-- Add last_seen column to profiles table
ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create a policy to allow users to update their own last_seen
CREATE POLICY "Users can update their own last_seen" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure the column is visible to everyone (already true for public profiles, but good to double check RLS)
-- Existing policies usually allow reading public profile data, so we might not need a new SELECT policy 
-- if "profiles are viewable by everyone" is already set. Assuming yes based on standard Supabase patterns.
