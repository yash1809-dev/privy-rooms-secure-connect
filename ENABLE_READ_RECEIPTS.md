# Enable Read Receipts - Quick Setup

## Step 1: Run Database Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project → SQL Editor
3. Copy and paste the contents of `ADD_MESSAGE_READ_STATUS.sql`
4. Click "Run" to execute the migration

The migration will:
- Add `is_read` and `read_at` columns to `group_messages` table
- Create `message_read_receipts` table to track who read which messages
- Set up Row Level Security (RLS) policies

## Step 2: Code is Already Ready!

The read receipt code has been enabled in:
- **Group.tsx** - Marks messages as read when you open a chat
- **Chats.tsx** - Shows accurate unread counts based on what you haven't read

## Step 3: Test It!

1. Open a group chat that has unread messages
2. Go back to `/chats` page
3. Verify the unread badge is removed or reduced

## How It Works

- When you open a group chat, all messages are automatically marked as read
- The Chats page only counts messages you haven't read yet
- Unread badges update in real-time

That's it! 🎉
