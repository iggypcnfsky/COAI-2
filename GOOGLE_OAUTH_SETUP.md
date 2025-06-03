# Google OAuth Setup for COAI

This guide will help you configure Google OAuth authentication for the COAI application.

## Prerequisites

- Access to your Supabase project dashboard
- Google Cloud Console access
- Your Supabase project URL: `https://hiuinnexazfqhodamhgk.supabase.co`

## Step 1: Configure Google Cloud Console

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

### 1.2 Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in required fields:
     - App name: "COAI"
     - User support email: your email
     - Developer contact information: your email
   - Add scopes: `../auth/userinfo.email` and `../auth/userinfo.profile`
   - Add test users if needed

4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "COAI Web Client"
   - Authorized redirect URIs:
     ```
     https://hiuinnexazfqhodamhgk.supabase.co/auth/v1/callback
     ```

5. **Save the Client ID and Client Secret** - you'll need these for Supabase

## Step 2: Configure Supabase Authentication

### 2.1 Enable Google Provider
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Prototyp Club**
3. Go to **Authentication** → **Providers**
4. Find **Google** and click to configure it
5. Toggle **Enable sign in with Google** to ON
6. Enter your Google OAuth credentials:
   - **Client ID**: From Step 1.3
   - **Client Secret**: From Step 1.3
7. Click **Save**

### 2.2 Configure URL Settings
1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL**: 
   - Development: `http://localhost:5173`
   - Production: Your production domain
3. Add **Redirect URLs**:
   ```
   http://localhost:5173/**
   https://yourdomain.com/**
   ```
4. Click **Save**

## Step 3: Test the Integration

### 3.1 Start Development Server
```bash
npm run dev
```

### 3.2 Test Sign-in Flow
1. Open your application at `http://localhost:5173`
2. Click **"Sign in with Google"** button in the header
3. Complete the Google OAuth flow
4. You should be redirected back to your app and see your profile in the header

### 3.3 Verify Database
1. Go to Supabase Dashboard → **Table Editor**
2. Check the `auth.users` table - you should see your user
3. Check the `coai-profiles` table - a profile should be auto-created

## Troubleshooting

### Common Issues

**"redirect_uri_mismatch" error:**
- Ensure the redirect URI in Google Cloud Console exactly matches:
  `https://hiuinnexazfqhodamhgk.supabase.co/auth/v1/callback`

**"This app isn't verified" warning:**
- This is normal during development
- Click "Advanced" → "Go to COAI (unsafe)" for testing
- For production, you'll need to verify your app with Google

**User not appearing in coai-profiles:**
- Check the browser console for errors
- Verify RLS policies are correctly set up
- Check Supabase logs in Dashboard → Logs

**Auth not working locally:**
- Ensure your site URL in Supabase matches exactly: `http://localhost:5173`
- Check that redirect URLs include the wildcard pattern

### Debug Tips

1. **Check Supabase Logs:**
   - Go to Dashboard → Logs
   - Filter by "Auth" to see authentication events

2. **Browser Console:**
   - Check for JavaScript errors
   - Look for auth-related messages

3. **Network Tab:**
   - Monitor OAuth redirect flow
   - Check for failed API calls

## Production Deployment

When deploying to production:

1. **Update Google OAuth Settings:**
   - Add your production domain to authorized redirect URIs
   - Update OAuth consent screen with production URL

2. **Update Supabase Settings:**
   - Change Site URL to your production domain
   - Update redirect URLs to include production patterns

3. **Environment Variables:**
   - Ensure production environment has correct Supabase keys
   - No additional Google credentials needed in frontend (handled by Supabase)

## Security Notes

- The Google Client Secret should only be stored in Supabase, never in your frontend code
- Client ID can be public (it's designed to be client-side)
- Always use HTTPS in production for OAuth flows
- Regularly rotate your OAuth credentials for security

## Support

If you encounter issues:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth/social-login/auth-google
2. Check Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
3. Review the troubleshooting section above 