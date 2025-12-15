-- Create storage bucket for voice recordings if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload voice recordings
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-recordings');

-- Policy to allow public access to voice recordings
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-recordings');

-- Create storage bucket for chat documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-documents', 'chat-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-documents');

CREATE POLICY "Allow public read access docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-documents');

-- Create storage bucket for chat photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-photos', 'chat-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-photos');

CREATE POLICY "Allow public read access photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-photos');
