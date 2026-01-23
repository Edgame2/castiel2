# Authentication Fixes Applied

## Issues Fixed

### 1. Token Refresh 400 Error ✅

**Problem**: Token refresh endpoint was returning 400 errors when tokens were expired.

**Root Cause**: 
- The `optionalAuth` middleware was trying to verify expired tokens, which failed
- The refresh endpoint's token decode logic wasn't handling all error cases properly
- The ApiClient wasn't explicitly sending the token in the Authorization header for refresh requests

**Fixes Applied**:
- Improved error handling in `/api/auth/refresh` endpoint to better handle expired tokens
- Enhanced token decode logic with proper null checks
- Updated ApiClient to explicitly send Authorization header even for expired tokens
- Added better error logging in development mode
- Reduced noise in production logs (401 errors are expected for invalid tokens)

### 2. OAuth Callback Redirect to Port 8080 ✅

**Problem**: OAuth callback was redirecting to `http://localhost:8080/auth/callback?token=...` which doesn't exist, causing `ERR_CONNECTION_REFUSED` errors.

**Root Cause**:
- Server's `FRONTEND_URL` was set to `http://localhost:8080` (default)
- Electron app runs on `http://localhost:3000/main_window/index.html` (development)
- No navigation interception in Electron to handle OAuth callbacks

**Fixes Applied**:
- Updated `server/.env` to set `FRONTEND_URL="http://localhost:3000/main_window/index.html"`
- Added OAuth callback handling in Electron main process:
  - Intercept `will-navigate` events to catch OAuth redirects with tokens
  - Send token to renderer via IPC event `oauth-callback`
  - Clean up URL after extracting token
- Updated `AuthContext` to listen for OAuth callback events from main process
- Exposed `ipcRenderer` in preload script for event listening
- Added global navigation interception in `web-contents-created` event for all windows

## Files Modified

1. **`server/src/routes/auth.ts`**:
   - Improved token refresh endpoint error handling
   - Updated OAuth callback redirect URL logic
   - Better token decode error handling

2. **`server/.env`**:
   - Changed `FRONTEND_URL` from `http://localhost:8080` to `http://localhost:3000/main_window/index.html`

3. **`src/core/api/ApiClient.ts`**:
   - Explicitly send Authorization header in refresh token requests
   - Reduced error logging noise (only log non-401 errors)

4. **`src/main/main.ts`**:
   - Added OAuth callback navigation interception
   - Handle token extraction from redirect URLs
   - Send tokens to renderer via IPC

5. **`src/main/preload.ts`**:
   - Exposed `ipcRenderer` API for event listening

6. **`src/renderer/contexts/AuthContext.tsx`**:
   - Added IPC event listener for OAuth callbacks
   - Handle tokens from both URL params and IPC events

## Testing

To test the fixes:

1. **Token Refresh**:
   - Wait for token to expire (or manually clear it)
   - Make an API request that triggers automatic refresh
   - Check that refresh succeeds without 400 errors

2. **OAuth Callback**:
   - Click "Login with Google" in the app
   - Complete OAuth flow in browser
   - Verify token is extracted and user is authenticated
   - Check that no `ERR_CONNECTION_REFUSED` errors occur

## Notes

- The OAuth callback now redirects to the Electron app's URL instead of a non-existent port 8080
- Token refresh errors are now properly handled and logged
- The app can handle OAuth callbacks from both internal navigation and external browser windows
