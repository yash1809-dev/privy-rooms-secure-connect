# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: PrivyRooms (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
   - Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard:
2. Go to **Settings** → **API**
3. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys" → "anon public")

## Step 3: Set Up Environment Variables

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
   ```

3. Save the file

## Step 4: Run Database Migrations

### Option A: Using Supabase SQL Editor (Recommended for first-time setup)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Run each migration file in order (copy-paste the SQL):

   **Migration 1**: `supabase/migrations/20251105073237_8b0876bf-ded0-44b0-975b-35dd3cf3910d.sql`
   
   **Migration 2**: `supabase/migrations/20251105073246_423d895d-5d96-4ff9-b8b9-62bab42164c6.sql`
   
   **Migration 3**: `supabase/migrations/20251106000000_add_follows_table.sql`
   
   **Migration 4**: `supabase/migrations/20251106001000_add_coffee_url_to_profiles.sql`
   
   **Migration 5**: `supabase/migrations/20251106003000_groups_members_messages.sql`
   
   **Migration 6**: `supabase/migrations/20251106012000_group_realtime_artifacts.sql`
   
   **Migration 7**: `supabase/migrations/20251106020000_timetable_lectures.sql`

4. Click **Run** for each migration

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-id

# Push migrations
npm run db:push
```

## Step 5: Set Up Storage Bucket (for profile pictures)

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it: `avatars`
4. Make it **Public**
5. Click **Create bucket**

## Step 6: Restart Your Dev Server

```bash
npm run dev
```

## Troubleshooting

- **"Project not visible"**: Make sure you're logged into the correct Supabase account
- **"Table not found"**: Run the migrations (Step 4)
- **"Invalid API key"**: Double-check your `.env` file has the correct values
- **"Storage bucket not found"**: Create the `avatars` bucket (Step 5)

## Need Help?

- Check Supabase docs: https://supabase.com/docs
- Verify your `.env` file is in the project root
- Make sure you restart the dev server after changing `.env`

