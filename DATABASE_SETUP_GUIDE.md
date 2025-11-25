# Quick Setup Guide - Run Database Migrations

## ⚠️ Important: Database Migrations Required

Your polls aren't appearing because the database columns don't exist yet. You need to run these SQL scripts in **Supabase SQL Editor**:

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to your Supabase project
- Click on "SQL Editor" in the left sidebar

### 2. Run Migration 1: File Attachments
Copy and paste the contents of `ADD_FILE_ATTACHMENTS.sql`:

```sql
-- Add file attachment columns to group_messages
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_type text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_size bigint;
```

Click "Run" to execute.

### 3. Run Migration 2: Poll Data  
Copy and paste the contents of `ADD_POLL_DATA_COLUMN.sql`:

```sql
-- Add poll_data column to support inline polls in chat
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS poll_data jsonb;
```

Click "Run" to execute.

### 4. (Optional) Run Migration 3: Read Receipts
Copy and paste the contents of `ADD_MESSAGE_READ_STATUS.sql`:

```sql
-- Add read tracking columns
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Create read receipts table
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_insert_own_read_receipts"
ON public.message_read_receipts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_view_read_receipts_in_their_groups"
ON public.message_read_receipts FOR SELECT
TO authenticated
USING (
  message_id IN (
    SELECT gm.id FROM public.group_messages gm
    INNER JOIN public.group_members mem ON gm.group_id = mem.group_id
    WHERE mem.user_id = auth.uid()
  )
);
```

Click "Run" to execute.

## After Running Migrations

1. Refresh your browser at `http://localhost:8080`
2. Navigate to a group chat
3. Click the + icon
4. Select "Poll"
5. Create a poll - it should now appear in chat with options!

## Troubleshooting

**If polls still don't appear:**
1. Check browser console for errors (F12 → Console tab)
2. Verify migrations ran successfully in Supabase
3. Refresh the page

**If you see "column does not exist" errors:**
- One or more migrations didn't run
- Go back to Supabase SQL Editor and run the missing migration
