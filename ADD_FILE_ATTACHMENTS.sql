-- Add file attachment support to group_messages
-- Run this in Supabase SQL Editor

ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- file_url: Public URL to the uploaded file in Supabase storage
-- file_type: MIME type (e.g., 'application/pdf', 'image/png')
-- file_name: Original filename
-- file_size: Size in bytes

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_messages_file_type ON public.group_messages(file_type);

COMMENT ON COLUMN public.group_messages.file_url IS 'Public URL to uploaded file in Supabase storage';
COMMENT ON COLUMN public.group_messages.file_type IS 'MIME type of uploaded file';
COMMENT ON COLUMN public.group_messages.file_name IS 'Original filename';
COMMENT ON COLUMN public.group_messages.file_size IS 'File size in bytes';
