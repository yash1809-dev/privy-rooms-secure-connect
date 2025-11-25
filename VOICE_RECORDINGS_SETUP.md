# Voice Recordings Setup Instructions

## Database Migration

The voice recordings feature requires a new database table. Follow these steps:

### Option 1: Using Supabase CLI (If installed)
```bash
npm run db:push
```

### Option 2: Manual Setup (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20251125000000_voice_recordings.sql`
5. Click **Run** to execute the migration

## Storage Bucket Setup

The voice recordings feature stores audio files in Supabase Storage. Create the bucket manually:  

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Click **Create a new bucket**
4. Configure the bucket:
   - **Name**: `voice-recordings`
   - **Public bucket**: ❌ **Unchecked** (files should be private)
   - **File size limit**: 50 MB (optional but recommended)
   - **Allowed MIME types**: `audio/webm`, `audio/wav`, `audio/mpeg`, `audio/mp4`

5. After creating the bucket, set up RLS policies:
   - Go to **Storage** > **Policies** tab
   - Click on `voice-recordings` bucket
   - Add the following policies:

### Policy 1: Allow users to upload their own files
```sql
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Allow users to read their own files
```sql
CREATE POLICY "Users can read own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Verification

After completing the setup:

1. Refresh your application
2. Navigate to the Dashboard
3. Try creating a voice recording
4. Check the Supabase Dashboard:
   - **Table Editor** > `voice_recordings` should show your new recording
   - **Storage** > `voice-recordings` should contain the audio file

## Troubleshooting

### "voice_recordings table not found"
- Make sure you ran the migration SQL in the Supabase SQL Editor

### "Failed to upload audio file"
- Verify the storage bucket is created with the exact name: `voice-recordings`
- Check that RLS policies are correctly set up
- Ensure you're logged in to the application

### TypeScript errors for voice_recordings
- These are expected until you regenerate Supabase types
- The application will still work at runtime
- To fix: regenerate types using your Supabase project

## Next Steps

Once setup is complete, you can:
- ✅ Record audio notes with transcription
- ✅ View recordings by date using the calendar icon
- ✅ Access historical recordings
- ✅ Recordings automatically reset daily (only today's shown by default)
