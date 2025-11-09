# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3d70247f-a80a-4c60-96e9-667bf4774951

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3d70247f-a80a-4c60-96e9-667bf4774951) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Supabase Setup (Required)

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in project details and create the project
4. Wait for the project to be ready (takes 1-2 minutes)

### Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 3: Create `.env` File

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

Replace with your actual values from Step 2.

### Step 4: Run Database Migrations

Open Supabase **SQL Editor** and run these migration files **in order**:

1. `supabase/migrations/20251105073237_8b0876bf-ded0-44b0-975b-35dd3cf3910d.sql`
2. `supabase/migrations/20251105073246_423d895d-5d96-4ff9-b8b9-62bab42164c6.sql`
3. `supabase/migrations/20251106000000_add_follows_table.sql`
4. `supabase/migrations/20251106001000_add_coffee_url_to_profiles.sql`
5. `supabase/migrations/20251106003000_groups_members_messages.sql`
6. `supabase/migrations/20251106012000_group_realtime_artifacts.sql`
7. `supabase/migrations/20251106020000_timetable_lectures.sql`

### Step 5: Create Storage Bucket (for profile pictures)

1. In Supabase dashboard → **Storage**
2. Click **"New bucket"**
3. Name: `avatars`
4. Make it **Public**
5. Click **Create**

### Step 6: Restart Dev Server

```bash
npm run dev
```

**See `SUPABASE_SETUP.md` for detailed step-by-step instructions.**

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3d70247f-a80a-4c60-96e9-667bf4774951) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
