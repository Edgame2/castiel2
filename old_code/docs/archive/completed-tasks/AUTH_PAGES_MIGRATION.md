# Authentication Pages Migration

## Overview

Login and Registration pages have been migrated from the Auth-Broker service to the Frontend service for better UX, maintainability, and separation of concerns.

## Changes Made

### 1. **Frontend Pages Created** ✅

#### Login Page
- **Location**: `/services/frontend/src/app/(auth)/login/page.tsx`
- **URL**: http://localhost:3000/login
- **Features**:
  - React-based form with shadcn/ui components
  - Client-side validation
  - Loading states and error handling
  - "Forgot password" link
  - Link to registration page
  - OAuth provider buttons (Google, GitHub)
  - Responsive design
  - Returns to `returnUrl` query parameter after login

#### Registration Page
- **Location**: `/services/frontend/src/app/(auth)/register/page.tsx`
- **URL**: http://localhost:3000/register
- **Features**:
  - React-based form with shadcn/ui components
  - Fields: firstName, lastName, email, password, confirmPassword
  - Client-side password validation
  - Success message with auto-redirect to login
  - Link to login page
  - OAuth provider buttons
  - Terms of Service and Privacy Policy links

#### Auth Layout
- **Location**: `/services/frontend/src/app/(auth)/layout.tsx`
- **Purpose**: Provides fullscreen layout without sidebar for auth pages

### 2. **Auth-Broker Updated** ✅

#### Removed HTML Pages
- Removed: GET `/auth/login` HTML page
- Removed: GET `/auth/register` HTML page
- **Kept**: All POST API endpoints (API-only)

#### OAuth Redirect Updated
- **File**: `/services/auth-broker/src/controllers/oauth2.controller.ts`
- **Change**: OAuth now redirects to frontend login page
- **Before**: `http://localhost:3002/auth/login?returnUrl=...`
- **After**: `http://localhost:3000/login?returnUrl=...`

#### Environment Variable Added
- **Variable**: `FRONTEND_URL`
- **Default**: `http://localhost:3000`
- **Purpose**: Configure where OAuth redirects for login
- **Files Updated**:
  - `.env.example`
  - `.env` (if exists)

### 3. **API Endpoints (Unchanged)** ✅

All auth-broker API endpoints remain functional:

```typescript
POST /auth/register          // Create user account
POST /auth/login             // Login with credentials
GET  /auth/verify-email/:token  // Email verification
POST /auth/forgot-password   // Request password reset
POST /auth/reset-password    // Reset password with token
POST /auth/refresh           // Refresh access token
POST /auth/logout            // Logout
POST /auth/revoke            // Revoke token
POST /auth/introspect        // Token introspection
```

## Architecture

### Before (HTML in Auth-Broker)
```
Browser → Auth-Broker (:3002)
        → GET /auth/login (HTML page)
        → POST /auth/login (API)
        → Return tokens
```

### After (React in Frontend)
```
Browser → Frontend (:3000)
        → GET /login (React page)
        → POST to Auth-Broker /auth/login (API)
        → Store tokens
        → Redirect to dashboard
```

## OAuth Flow

### Complete Authentication Flow

1. **User visits protected page**
   ```
   http://localhost:3000/dashboard (not authenticated)
   ```

2. **Frontend redirects to OAuth**
   ```
   http://localhost:3002/oauth2/authorize?client_id=...&redirect_uri=...
   ```

3. **OAuth redirects to login** (if not authenticated)
   ```
   http://localhost:3000/login?returnUrl=http%3A%2F%2Flocalhost%3A3002%2Foauth2%2Fauthorize...
   ```

4. **User logs in via React form**
   - Form submits to `POST /auth/login`
   - Receives access_token and refresh_token
   - Stores tokens in localStorage/cookies

5. **Frontend redirects to returnUrl**
   ```
   http://localhost:3002/oauth2/authorize (now authenticated)
   ```

6. **OAuth generates auth code**
   ```
   Redirects to: http://localhost:3000/auth/callback?code=...
   ```

7. **Frontend exchanges code for tokens**
   - Complete authentication
   - User can access protected resources

## Benefits

### 1. **Better User Experience**
- Consistent UI/UX with rest of application
- Use of design system (shadcn/ui)
- Better animations and transitions
- Responsive design out of the box

### 2. **Development Benefits**
- Frontend devs can modify auth UI without touching backend
- Hot reload works properly
- TypeScript types from API
- Easier to test with React Testing Library

### 3. **Architecture Benefits**
- Clear separation of concerns (UI vs API)
- Auth-broker is pure API (RESTful)
- Same API works for web, mobile, desktop
- No HTML rendering in backend

### 4. **Security Benefits**
- CORS properly configured
- Tokens stored client-side (secure cookies)
- OAuth flow remains secure
- No session mixing between services

## Testing

Run the test script to verify everything works:

```bash
./test-auth-migration.sh
```

### Manual Testing

1. **Test Login Page**
   ```bash
   # Visit in browser
   open http://localhost:3000/login
   
   # Should show React form with shadcn/ui styling
   # Try logging in with existing user
   ```

2. **Test Registration Page**
   ```bash
   # Visit in browser
   open http://localhost:3000/register
   
   # Fill form and submit
   # Should show success message
   # Auto-redirect to login after 2 seconds
   ```

3. **Test OAuth Flow**
   ```bash
   # Visit protected page
   open http://localhost:3000/dashboard
   
   # Should redirect through OAuth to login page
   # Login should complete OAuth flow
   ```

## Configuration

### Frontend Environment Variables

Located in `/services/frontend/.env`:

```bash
NEXT_PUBLIC_AUTH_BROKER_URL=http://localhost:3002
NEXT_PUBLIC_OAUTH_CLIENT_ID=auth-broker
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Auth-Broker Environment Variables

Located in `/services/auth-broker/.env`:

```bash
FRONTEND_URL=http://localhost:3000
PORT=3002
```

## Troubleshooting

### Login page shows 404
- **Cause**: Frontend server not running or not restarted
- **Fix**: Restart frontend: `cd services/frontend && pnpm dev`

### OAuth redirects to wrong URL
- **Cause**: `FRONTEND_URL` not set in auth-broker
- **Fix**: Add `FRONTEND_URL=http://localhost:3000` to `.env`

### CORS errors
- **Cause**: Auth-broker not allowing frontend origin
- **Fix**: Check CORS configuration in auth-broker allows `http://localhost:3000`

### Tokens not stored
- **Cause**: localStorage being cleared or cookies not set
- **Fix**: Check browser console, ensure `credentials: 'include'` in fetch calls

## Production Deployment

### Environment Variables

**Frontend (Vercel/Azure Static Web Apps)**:
```bash
NEXT_PUBLIC_AUTH_BROKER_URL=https://auth.castiel.app
NEXT_PUBLIC_OAUTH_CLIENT_ID=production-client-id
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://app.castiel.com/auth/callback
```

**Auth-Broker (Azure App Service)**:
```bash
FRONTEND_URL=https://app.castiel.com
CORS_ORIGINS=https://app.castiel.com
```

### CORS Configuration

Ensure auth-broker allows frontend domain:

```typescript
// services/auth-broker/src/index.ts
fastify.register(cors, {
  origin: [
    'http://localhost:3000',           // Development
    'https://app.castiel.com',         // Production
    'https://staging.castiel.com'      // Staging
  ],
  credentials: true
})
```

## Next Steps

- [ ] Test complete authentication flow in browser
- [ ] Update any documentation referencing old HTML pages
- [ ] Configure CORS for production domains
- [ ] Implement "Forgot Password" page in frontend
- [ ] Add OAuth provider implementations (Google, GitHub)
- [ ] Implement session management UI
- [ ] Add multi-factor authentication (MFA) pages

## Files Changed

### Created
- `/services/frontend/src/app/(auth)/login/page.tsx`
- `/services/frontend/src/app/(auth)/register/page.tsx`
- `/services/frontend/src/app/(auth)/layout.tsx`
- `/test-auth-migration.sh`
- `/docs/authentication/AUTH_PAGES_MIGRATION.md` (this file)

### Modified
- `/services/auth-broker/src/controllers/oauth2.controller.ts`
- `/services/auth-broker/src/routes/auth.routes.ts` (removed HTML pages)
- `/services/auth-broker/.env.example`
- `/services/auth-broker/.env`

### Removed
- HTML login page from auth-broker (GET `/auth/login`)
- HTML registration page from auth-broker (GET `/auth/register`)
