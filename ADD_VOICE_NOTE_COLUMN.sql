-- Add audio_url column to group_messages table for voice notes
-- Run this in Supabase SQL Editor

ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- This column will store the public URL of voice notes uploaded to storage
