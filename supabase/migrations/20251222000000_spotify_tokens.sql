-- Create table for storing Spotify authentication tokens
CREATE TABLE IF NOT EXISTS spotify_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors on re-run
DROP POLICY IF EXISTS "Users can read own spotify tokens" ON spotify_tokens;
DROP POLICY IF EXISTS "Users can insert own spotify tokens" ON spotify_tokens;
DROP POLICY IF EXISTS "Users can update own spotify tokens" ON spotify_tokens;
DROP POLICY IF EXISTS "Users can delete own spotify tokens" ON spotify_tokens;

-- Policy: Users can only read their own tokens
CREATE POLICY "Users can read own spotify tokens"
  ON spotify_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own spotify tokens"
  ON spotify_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own spotify tokens"
  ON spotify_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own spotify tokens"
  ON spotify_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_spotify_tokens_user_id ON spotify_tokens(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_spotify_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to prevent errors
DROP TRIGGER IF EXISTS spotify_tokens_updated_at ON spotify_tokens;

-- Create trigger to call the function
CREATE TRIGGER spotify_tokens_updated_at
  BEFORE UPDATE ON spotify_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_spotify_tokens_updated_at();
