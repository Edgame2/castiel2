# Authentication Fixes - Secure Storage and Token Refresh

## Issues Fixed

### 1. Linux Keyring Secure Storage Error ✅

**Problem**: 
- Error: `Failed to delete API key jwt-token: No such interface "org.freedesktop.Secret.Item" on object at path /org/freedesktop/secrets/collection/login/26`
- This occurs when the Linux keyring has an invalid or corrupted entry

**Root Cause**:
- The secure storage service was throwing errors for invalid keyring items
- Linux keyring can have stale entries with invalid interfaces

**Fixes Applied**:
- Updated `SecureStorageService.deleteApiKey()` to gracefully handle Linux keyring errors
- Added checks for common Linux keyring error messages:
  - "No such interface"
  - "No such object"
  - "not found"
- Changed from throwing errors to logging warnings for keyring issues
- Errors are now silently ignored if the key doesn't exist or has invalid state

### 2. Token Refresh 400 Errors ✅

**Problem**:
- Multiple "Token refresh failed: Request failed with status code 400" errors
- Token refresh was being attempted repeatedly even when tokens were invalid

**Root Cause**:
- Token refresh was being called even when no token existed
- 400 errors (invalid token format) were not being handled properly
- Refresh attempts were not checking if token was loaded first

**Fixes Applied**:
- Added check to ensure token is loaded before attempting refresh
- Added check to prevent refresh if no token exists
- Improved error handling to treat both 400 and 401 as expected auth errors
- Clear token silently when refresh fails with 400/401
- Prevent repeated refresh attempts for invalid tokens
- Updated response interceptor to handle both 400 and 401 as auth errors

## Files Modified

1. **`src/core/services/SecureStorageService.ts`**:
   - Updated `deleteApiKey()` to gracefully handle Linux keyring errors
   - Changed from throwing errors to logging warnings
   - Added checks for common Linux keyring error patterns

2. **`src/core/api/ApiClient.ts`**:
   - Added token existence check before refresh attempts
   - Added token load promise wait before refresh
   - Improved error handling for 400 and 401 status codes
   - Clear token silently when refresh fails
   - Updated response interceptor to handle 400 as auth error

3. **`server/src/routes/auth.ts`**:
   - Added comment clarifying 401 vs 400 usage
   - Ensured refresh endpoint returns 401 (not 400) for auth failures

## Behavior Changes

### Before:
- Linux keyring errors would throw exceptions
- Token refresh would attempt even without a token
- 400 errors would be logged as unexpected errors
- Multiple refresh attempts for invalid tokens

### After:
- Linux keyring errors are silently ignored (key effectively deleted)
- Token refresh only attempts if token exists and is loaded
- 400 and 401 errors are handled as expected auth failures
- Invalid tokens are cleared automatically
- No repeated refresh attempts for invalid tokens

## Testing

To verify the fixes:

1. **Secure Storage**:
   - Try logging in/out multiple times
   - Check that no keyring errors appear in console
   - Verify tokens are stored and retrieved correctly

2. **Token Refresh**:
   - Wait for token to expire (or manually clear it)
   - Make API requests
   - Verify refresh attempts don't spam errors
   - Check that invalid tokens are cleared automatically

## Notes

- Linux keyring issues are now handled gracefully without breaking authentication
- Token refresh errors are now properly handled and don't cause repeated failures
- The app will automatically clear invalid tokens and prompt for re-authentication
