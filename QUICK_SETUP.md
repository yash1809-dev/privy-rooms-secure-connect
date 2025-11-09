# Quick Setup - Almost Done! 🚀

Your `.env` file has been created with your Supabase credentials.

## Next Steps:

### 1. Run Database Migrations (2 minutes)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/wqzlguyqnowvofaraums
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file: `supabase/migrations/ALL_MIGRATIONS.sql`
5. Copy the **entire contents** of that file
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Wait for "Success. No rows returned" message

### 2. Create Storage Bucket (1 minute)

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `avatars`
4. **Important**: Toggle **Public bucket** to ON
5. Click **Create bucket**

### 3. Restart Your Dev Server

```bash
npm run dev
```

### 4. Test It Out!

1. Go to http://localhost:5173
2. Sign up for a new account
3. Try adding a lecture to the timetable
4. Everything should work now! ✅

---

**That's it!** Your PrivyRooms app is now fully set up and ready to use.

