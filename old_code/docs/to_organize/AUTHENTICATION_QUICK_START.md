# Authentication Implementation - Quick Start Guide

**Duration**: 4-5 days  
**Priority**: Critical Security Fixes  
**Complexity**: Medium  

---

## Start Here: Day 1 (2 hours)

### 1.1 Enable Token Validation Cache (15 min)
**File**: `apps/api/src/middleware/authenticate.ts` line 53

**Current**:
```typescript
if (false && tokenCache) {
```

**Change to**:
```typescript
if (tokenCache && config.jwt.validationCacheEnabled !== false) {
```

**Why**: JWT verification cached for 5 minutes = 85% latency reduction  
**Test**:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/me
# First request: ~500ms, Second request: ~50ms
```

---

### 1.2 Fix Token Expiry Config (10 min)
**File**: `apps/api/src/config/env.ts` or environment variables

**Update/Verify**:
```bash
JWT_ACCESS_TOKEN_EXPIRY=9h
JWT_REFRESH_TOKEN_EXPIRY=7d
JWT_VALIDATION_CACHE_ENABLED=true
JWT_VALIDATION_CACHE_TTL=300
```

**Why**: Consistency across codebase  
**Verify in code**: Search for all uses of `accessTokenExpiry` to ensure '9h' is used everywhere

---

### 1.3 Add Security Headers (15 min)
**File**: `apps/api/src/index.ts` around line 1012

**Find existing helmet config** and update to:
```typescript
await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameDest: ["'none'"], // Add this line
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
})
```

**Why**: Protects against XSS, clickjacking, MIME sniffing

---

## Day 2 (4 hours)

### 2.1 Create Secure Token Storage Endpoint (1 hour)
**Create new file**: `apps/web/src/app/api/auth/set-tokens/route.ts`

```typescript
import { NextResponse } from 'next/server'

interface SetTokensRequest {
  accessToken: string
  refreshToken?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SetTokensRequest
    const { accessToken, refreshToken } = body

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ success: true })

    // Set access token as httpOnly cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 9 * 60 * 60,
      path: '/',
    })

    // Set refresh token if provided
    if (refreshToken) {
      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Set tokens error:', error)
    return NextResponse.json(
      { error: 'Failed to set tokens' },
      { status: 500 }
    )
  }
}
```

**Test**:
```bash
curl -X POST http://localhost:3000/api/auth/set-tokens \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"eyJ...","refreshToken":"eyJ..."}'

# Check response headers for Set-Cookie with HttpOnly; Secure; SameSite=Strict
```

---

### 2.2 Update Auth Context (1.5 hours)
**File**: `apps/web/src/contexts/auth-context.tsx`

**Key changes**:

1. Remove localStorage token handling
2. Call `/api/auth/set-tokens` after login
3. Update logout to clear cookies

**Replace entire logout method** with:
```typescript
const logout = async () => {
  try {
    console.log('Logout: Starting logout process...')
    
    // Fire API logout (don't wait)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000),
    }).catch(error => {
      console.error('API logout error:', error.message)
    })
    
    // Clear local state
    setUser(null)
    clearTokenCache()
    
    // Clear cookies
    document.cookie = 'access_token=; Max-Age=-1; path=/'
    document.cookie = 'refresh_token=; Max-Age=-1; path=/'
    
    console.log('Logout complete, redirecting...')
    window.location.href = '/login'
  } catch (error) {
    console.error('Logout error:', error)
    setUser(null)
    clearTokenCache()
    window.location.href = '/login'
  }
}
```

**In fetchUser() method**, update token handling:
```typescript
const response = await fetch('/api/auth/me')
if (response.ok && mounted) {
  const userData = await response.json()
  
  // If login response includes tokens, set them securely
  if ('accessToken' in userData && 'refreshToken' in userData) {
    await fetch('/api/auth/set-tokens', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
      }),
    })
  }
  
  const normalizedUser = {
    ...userData,
    name: userData.name || userData.displayName || 
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
          userData.email,
    role: userData.role || userData.roles?.[0] || 'user',
  }
  setUser(normalizedUser)
  await ensureAuth()
}
```

---

### 2.3 Update API Client (1.5 hours)
**File**: `apps/web/src/lib/api/client.ts`

**Key changes**:
1. Remove manual localStorage token handling
2. Keep credentials: 'include' for automatic cookie sending
3. Remove getAccessToken() calls from interceptor

**Update request interceptor**:
```typescript
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Token is now in httpOnly cookie, sent automatically
      
      // Add tenant context if available
      const tenantId = localStorage.getItem('tenantId')
      if (tenantId && config.headers) {
        config.headers['X-Tenant-ID'] = tenantId
      }
      
      // Prevent caching
      if (config.headers) {
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        config.headers['Pragma'] = 'no-cache'
      }
      
      console.log('[API Request]', config.method?.toUpperCase(), config.url)
    }
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)
```

**Remove these functions** (deprecated):
- `setAuthToken()`
- `getAccessToken()`
- `getRefreshToken()`

Keep these (still needed):
- `initializeAuth()`
- `ensureAuth()`
- `clearTokenCache()`

---

## Day 3 (3 hours)

### 3.1 Add Rate Limiting to Login (1 hour)
**File**: `apps/api/src/controllers/auth.controller.ts` login method

**Add at start of login**:
```typescript
async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { email, password, tenantId, deviceFingerprint, rememberDevice } = request.body as any

  try {
    // Rate limit by IP + email
    const rateLimiter = (request.server as any).rateLimiter
    const limitKey = `login:${request.ip}:${email.toLowerCase()}`
    const isLimited = await rateLimiter.isLimited(limitKey, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (isLimited) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: 900,
      })
    }

    // ... existing login logic ...
    
    // On success, reset counter
    await rateLimiter.reset(limitKey)
```

---

### 3.2 Add MFA Enforcement (1 hour)
**File**: `apps/api/src/controllers/auth.controller.ts`

**Add method**:
```typescript
private async shouldEnforceMFA(user: any, tenantId: string): Promise<boolean> {
  if (!this.tenantService) return false
  try {
    const tenant = await this.tenantService.getTenant(tenantId)
    return tenant?.mfaRequired === true || tenant?.mfaEnforcementLevel === 'mandatory'
  } catch (err) {
    return false
  }
}
```

**In login method, after password verification**:
```typescript
const shouldEnforceMFA = await this.shouldEnforceMFA(user, resolvedTenantId)
const hasMFA = await this.mfaController?.userHasActiveMFA(user.id, user.tenantId)

if (shouldEnforceMFA && !hasMFA) {
  await this.logAuthEvent(
    AuditEventType.LOGIN_MFA_SETUP_REQUIRED,
    AuditOutcome.FAILURE,
    resolvedTenantId,
    {
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: request.ip,
      message: 'MFA setup required for user',
    }
  )

  return reply.status(403).send({
    error: 'MFA Required',
    message: 'Multi-factor authentication is required for your organization.',
    mfaRequired: true,
    setupUrl: `${this.publicApiUrl}/auth/mfa/setup`,
  })
}
```

---

### 3.3 Enhance Logout Flow (1 hour)
**File**: `apps/api/src/controllers/auth.controller.ts`

**Replace logout method**:
```typescript
async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization' })
    }

    const token = authHeader.substring(7)
    let user: any
    try {
      user = await (request.server as any).jwt.verify(token)
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid token' })
    }

    // Blacklist access token
    if (token) {
      const exp = user.exp || Math.floor(Date.now() / 1000) + 900
      const remainingTTL = exp - Math.floor(Date.now() / 1000)
      await this.cacheManager.blacklist.blacklistToken(
        token,
        Math.max(remainingTTL, 0)
      )
    }

    // Delete ALL sessions
    const deletedCount = await this.cacheManager.sessions.deleteAllUserSessions(
      user.sub,
      user.tenantId
    )

    // Revoke ALL refresh tokens
    const revokedCount = await this.cacheManager.tokens.revokeAllUserTokens(
      user.sub,
      user.tenantId
    )

    await this.logAuthEvent(
      AuditEventType.LOGOUT,
      AuditOutcome.SUCCESS,
      user.tenantId,
      {
        actorId: user.sub,
        actorEmail: user.email,
        ipAddress: request.ip,
        message: `Logged out from ${deletedCount} device(s)`,
        details: { sessionsRevoked: deletedCount, tokensRevoked: revokedCount },
      }
    )

    reply.status(200).send({
      success: true,
      message: `Logged out from ${deletedCount} device(s)`,
    })
  } catch (error: any) {
    request.log.error({ error }, 'Logout error')
    reply.status(200).send({ success: true })
  }
}
```

---

## Day 4 (2 hours)

### 4.1 Enhanced Tenant Switching
**File**: `apps/api/src/controllers/auth.controller.ts` switchTenant method

**Key addition**: Blacklist old token
```typescript
// After verifying user has access to target tenant:

// ⭐ Blacklist old token
const oldTokenId = decoded.jti || crypto.createHash('sha256').update(token).digest('hex')
await this.cacheManager.blacklist.blacklistToken(token, 3600)

// Issue new tokens for target tenant...
```

---

### 4.2 Test Everything (1 hour)
**Test Script**:
```bash
#!/bin/bash

echo "🔐 Testing Authentication System"
echo ""

# Test 1: Cache
echo "✅ Test 1: Token Cache"
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' | jq -r '.accessToken')

time curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/me > /dev/null
time curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/me > /dev/null
echo ""

# Test 2: Cookies
echo "✅ Test 2: httpOnly Cookies"
curl -s -X POST http://localhost:3000/api/auth/set-tokens \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\":\"$TOKEN\"}" | grep -q Set-Cookie && echo "Cookies set ✅" || echo "Cookies failed ❌"
echo ""

# Test 3: Rate Limiting
echo "✅ Test 3: Rate Limiting"
for i in {1..6}; do
  RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  
  if echo "$RESPONSE" | grep -q "429"; then
    echo "Rate limited after $i attempts ✅"
    break
  fi
done
echo ""

# Test 4: Logout
echo "✅ Test 4: Logout Revocation"
curl -s -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.success'

# Try to use same token (should fail)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/me | grep -q "401" && echo "Token revoked ✅" || echo "Token still valid ❌"
echo ""

echo "✅ All tests complete!"
```

---

## Day 5 (2 hours)

### 5.1 Write Tests
**File**: `tests/auth-security.test.ts`

Create focused tests for:
- Token cache hits/misses
- httpOnly cookie security
- Rate limiting enforcement
- MFA enforcement
- Token expiry
- Logout revocation

### 5.2 Documentation & Deployment

1. Update API docs with new endpoints
2. Update deployment guide
3. Create runbook for monitoring
4. Train support team

---

## Quick Verification Checklist

Before declaring complete:

```bash
# ✅ Token Cache Enabled
grep -n "if (tokenCache" apps/api/src/middleware/authenticate.ts
# Should show: if (tokenCache && config.jwt.validationCacheEnabled !== false)

# ✅ set-tokens Endpoint Exists
test -f apps/web/src/app/api/auth/set-tokens/route.ts && echo "✅ Exists"

# ✅ Auth Context Updated
grep -n "set-tokens" apps/web/src/contexts/auth-context.tsx
# Should have calls to /api/auth/set-tokens

# ✅ API Client Uses Cookies
grep -n "credentials: 'include'" apps/web/src/lib/api/client.ts
# Should have credentials: 'include' in axios config

# ✅ Helmet Config Updated
grep -n "frameDest.*none" apps/api/src/index.ts
# Should have frame protection

# ✅ Rate Limiting in Login
grep -n "rateLimiter" apps/api/src/controllers/auth.controller.ts
# Should have rate limiting logic

# ✅ MFA Enforcement
grep -n "shouldEnforceMFA" apps/api/src/controllers/auth.controller.ts
# Should have enforcement logic

# ✅ Enhanced Logout
grep -n "deleteAllUserSessions\|revokeAllUserTokens" apps/api/src/controllers/auth.controller.ts
# Should have complete session revocation
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Cookies not being set** | Check `credentials: 'include'` in axios config |
| **CORS errors** | Verify CORS origin matches frontend domain |
| **Cache not working** | Check `JWT_VALIDATION_CACHE_ENABLED=true` env var |
| **MFA not enforcing** | Verify tenant has `mfaRequired: true` set |
| **Logout doesn't revoke** | Check Redis connection for session storage |
| **Rate limiting not working** | Verify rateLimiter is initialized on server |

---

## Support & Questions

If you encounter issues:

1. Check the comprehensive plan: `AUTHENTICATION_IMPLEMENTATION_PLAN.md`
2. Check consistency checklist: `FRONTEND_BACKEND_CONSISTENCY_CHECKLIST.md`
3. Review test cases in `tests/auth-security.test.ts`
4. Check API logs for specific error messages
5. Verify all env vars are set correctly

