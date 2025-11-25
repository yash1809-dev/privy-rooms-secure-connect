-- Storage bucket policies for chat attachments
-- Bucket: chat-documents
CREATE POLICY "users_can_upload_own_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_read_own_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_delete_own_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Bucket: chat-photos
CREATE POLICY "users_can_upload_own_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_read_own_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_delete_own_photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
