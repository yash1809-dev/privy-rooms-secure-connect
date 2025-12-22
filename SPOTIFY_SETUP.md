# Spotify Integration Setup Guide

## Prerequisites

You need a Spotify Developer application to use this feature.

## Setup Steps

### 1. Create a Spotify Developer Application

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the application details:
   - **App name**: CollegeOS Focus
   - **App description**: Focus timer with Spotify integration
   - **Redirect URIs**: 
     - For development: `http://localhost:5173/auth/spotify/callback`
     - For production: `https://yourdomain.com/auth/spotify/callback`
   - **APIs used**: Check "Web Playback SDK"
5. Click **Save**

### 2. Get Your Credentials

1. In your app dashboard, click **Settings**
2. Copy your **Client ID**
3. Click **View client secret** and copy it (you'll need this for backend operations if you implement token refresh server-side)

### 3. Update Environment Variables

Edit your `.env` file and replace the placeholder values:

```bash
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/auth/spotify/callback
```

For production deployment, update the redirect URI to your production domain.

### 4. Run Database Migration

You need to create the `spotify_tokens` table in your Supabase database:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open and run the migration file: `supabase/migrations/20251222000000_spotify_tokens.sql`

Alternatively, if using Supabase CLI:
```bash
supabase db push
```

### 5. Start the Development Server

```bash
npm run dev
```

## Usage

1. Navigate to the **Focus Sanctuary** section on your dashboard
2. Scroll down to the **Focus Music** section
3. Click **"Connect Spotify"**
4. Authorize the app in the Spotify login popup
5. Select a playlist from your library
6. Click **Play** to start listening while you focus!

## Important Notes

- **Spotify Premium Required**: The Web Playback SDK requires a Spotify Premium account
- **No Autoplay**: Music will NOT start automatically when you load the page (user interaction required)
- **Independent Timer**: The focus timer works independently of Spotify playback
- **Token Refresh**: Access tokens are automatically refreshed when they expire

## Browser Compatibility

The Spotify Web Playback SDK works on:
- Chrome (recommended)
- Firefox
- Safari 14.1+
- Edge

## Troubleshooting

### "No valid Spotify access token" error
- Make sure you've connected your Spotify account
- Try disconnecting and reconnecting

### Playback not starting
- Ensure you have Spotify Premium
- Check that the Spotify player is "Ready" (green badge)
- Try selecting a different playlist

### "Failed to connect Spotify" error
- Check that your `VITE_SPOTIFY_CLIENT_ID` is correct
- Verify the redirect URI matches what's in your Spotify app settings
- Check browser console for detailed error messages

## Security Notes

- Tokens are stored securely in Supabase with Row Level Security (RLS) policies
- Each user can only access their own tokens
- Tokens are automatically refreshed before expiry
- Never commit your `.env` file with real credentials to version control
