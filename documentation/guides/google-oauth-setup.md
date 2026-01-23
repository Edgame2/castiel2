# Google OAuth Setup Guide

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add scopes: `openid`, `profile`, `email`
   - Add test users if in testing mode
6. Create OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Name**: Coder IDE (or your preferred name)
   - **Authorized redirect URIs**: 
     - For development: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Environment Variables

Edit the `server/.env` file and add/update these variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**Important Notes:**
- Replace `your-actual-client-id-here` with your actual Client ID from Google Cloud Console
- Replace `your-actual-client-secret-here` with your actual Client Secret
- The redirect URI **must match exactly** what you configured in Google Cloud Console
- The redirect URI in Google Cloud Console must be exactly: `http://localhost:3000/api/auth/google/callback`

## Step 3: Restart the Server

After updating the `.env` file, restart the server:

```bash
cd server
npm run dev
```

## Troubleshooting

### Error: "invalid_client" or "OAuth client was not found"
- **Cause**: Client ID or Client Secret is incorrect, or the redirect URI doesn't match
- **Solution**: 
  1. Double-check the Client ID and Secret in `server/.env`
  2. Verify the redirect URI in Google Cloud Console matches exactly: `http://localhost:3000/api/auth/google/callback`
  3. Make sure there are no extra spaces or quotes in the `.env` file

### Error: "redirect_uri_mismatch"
- **Cause**: The redirect URI in your `.env` doesn't match what's configured in Google Cloud Console
- **Solution**: 
  1. Go to Google Cloud Console → Credentials → Your OAuth Client
  2. Add `http://localhost:3000/api/auth/google/callback` to Authorized redirect URIs
  3. Make sure `GOOGLE_REDIRECT_URI` in `.env` matches exactly

### Error: "access_denied"
- **Cause**: OAuth consent screen not properly configured or app is in testing mode and user is not a test user
- **Solution**: 
  1. Complete the OAuth consent screen configuration
  2. Add your email as a test user if the app is in testing mode
  3. Or publish the app (for production use)

## Current Server Configuration

- **Server Port**: 3000 (default, can be changed with `PORT` environment variable)
- **OAuth Route**: `/api/auth/google`
- **Callback Route**: `/api/auth/google/callback`
- **Full Callback URL**: `http://localhost:3000/api/auth/google/callback`

## Example .env File

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080

# Database Configuration
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;

# JWT Configuration
JWT_SECRET=change-me-in-production-development-only-32chars

# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Related Documentation

- [Setup Guide](./setup-guide.md) - Complete setup instructions
- [Docker Setup Guide](./docker-setup.md) - Containerized deployment
- [Backend Authentication Module](../modules/backend/auth/) - Authentication implementation details
