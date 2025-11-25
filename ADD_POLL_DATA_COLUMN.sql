-- Add poll_data column to support inline polls in chat
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS poll_data jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.group_messages.poll_data IS 'Stores poll data with question, options, and votes for inline polls in chat messages';
