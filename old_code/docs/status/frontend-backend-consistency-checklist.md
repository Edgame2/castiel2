# Frontend-Backend Authentication Consistency Checklist

**Version**: 1.0  
**Date**: December 15, 2025  
**Status**: Ready for Implementation  

---

## Quick Reference: File Changes Required

### Backend Files to Modify
| File | Change | Priority |
|------|--------|----------|
| `apps/api/src/middleware/authenticate.ts:53` | Remove `false &&` from cache condition | P0 |
| `apps/api/src/index.ts:1012-1023` | Update helmet CSP & HSTS config | P1 |
| `apps/api/src/controllers/auth.controller.ts` | Add rate limiting, MFA enforcement, enhanced logout | P0 |
| `apps/api/src/config/env.ts` | Standardize JWT expiry values | P1 |

### Frontend Files to Modify
| File | Change | Priority |
|------|--------|----------|
| `apps/web/src/app/api/auth/set-tokens/route.ts` | CREATE - Secure token storage endpoint | P0 |
| `apps/web/src/contexts/auth-context.tsx` | Use set-tokens endpoint, update logout | P0 |
| `apps/web/src/lib/api/client.ts` | Remove localStorage token usage | P0 |
| `apps/web/src/lib/auth-utils.ts` | Deprecate localStorage functions | P1 |

### New Test Files
| File | Purpose |
|------|---------|
| `tests/auth-security.test.ts` | Security-specific test cases |
| `tests/auth-integration.test.ts` | Frontend-backend integration tests |

---

## Detailed Consistency Matrix

### 1. Token Storage & Transport

**Requirement**: Tokens must be secure, XSS-resistant, and automatically sent with requests

| Item | Backend | Frontend | Current Consistency | Target Consistency |
|------|---------|----------|--------------------|--------------------|
| **Access Token Storage** | Redis (internal) | localStorage | ❌ Mismatch | ✅ httpOnly cookie |
| **Refresh Token Storage** | Redis (internal) | localStorage | ❌ Mismatch | ✅ httpOnly cookie |
| **Token Transmission** | Bearer header required | Manual localStorage read | ⚠️ Works but risky | ✅ Automatic with credentials |
| **XSS Protection** | N/A | None (localStorage accessible) | ❌ Vulnerable | ✅ httpOnly prevents JS access |
| **CSRF Protection** | SameSite not set | localStorage doesn't help | ❌ Missing | ✅ SameSite=Strict |

**Actions**:
1. Create `apps/web/src/app/api/auth/set-tokens/route.ts` to set httpOnly cookies
2. Update `apps/web/src/contexts/auth-context.tsx` to call set-tokens after login
3. Update `apps/web/src/lib/api/client.ts` to use cookies (credentials: include)
4. Update all auth endpoints to set cookies with httpOnly, Secure, SameSite=Strict

---

### 2. Token Expiry & Refresh

**Requirement**: All token expiry times must be consistent across API and frontend

| Item | Backend Config | Backend Actual | Frontend | Issue | Fix |
|------|----------------|--------------------|----------|-------|-----|
| **Access Token Expiry** | `JWT_ACCESS_TOKEN_EXPIRY` or '15m' | '9h' (actual) | Uses /api/auth/token | ⚠️ Config mismatch | Standardize on '9h' |
| **Refresh Token Expiry** | `JWT_REFRESH_TOKEN_EXPIRY` or '7d' | '7d' | Uses /api/auth/token | ✅ Consistent | No change |
| **Cache TTL** | `JWT_VALIDATION_CACHE_TTL` = 300s | Disabled (if (false &&)) | N/A | ❌ Cache disabled | Enable cache |

**Actions**:
1. Set `JWT_ACCESS_TOKEN_EXPIRY=9h` in `.env`
2. Set `JWT_REFRESH_TOKEN_EXPIRY=7d` in `.env`
3. Set `JWT_VALIDATION_CACHE_ENABLED=true` in `.env`
4. Remove `if (false &&)` from token cache check
5. Frontend should refresh tokens every 8 hours (buffer)

---

### 3. Authentication Flows

**Requirement**: Login, logout, refresh, and MFA flows must be consistent

#### 3.1 Login Flow

```
Frontend                          Backend
  |                                 |
  +----POST /api/v1/auth/login----->|
  |   email, password, tenantId      |
  |                                  | Verify credentials
  |                                  | Check MFA requirement
  |                                  | Generate tokens
  |<---accessToken, refreshToken-----+
  |                                   |
  +--POST /api/auth/set-tokens------->| (Next.js API Route)
  |   accessToken, refreshToken        | Set httpOnly cookies
  |<---Set-Cookie headers-----+--------+
  |    (httpOnly, Secure, SameSite)   |
  |                                    |
  +---GET /api/auth/me------+-------->| (with cookies)
  |   (credentials: include)           |
  |<---User data, roles------+---------+
  |
```

**Consistency Check**:
- [ ] Backend returns both accessToken and refreshToken
- [ ] Frontend calls `/api/auth/set-tokens` with returned tokens
- [ ] `/api/auth/set-tokens` sets httpOnly cookies with correct attributes
- [ ] Frontend confirms `/api/auth/me` succeeds (validates cookies work)

#### 3.2 Token Refresh Flow

```
Frontend                          Backend
  |                                 |
  | Access token expired             |
  | Automatic request 401            |
  |                                  |
  +--POST /api/v1/auth/refresh----->|
  |   (with refresh token cookie)     |
  |                                  | Verify refresh token
  |                                  | Check for reuse/blacklist
  |                                  | Generate new tokens
  |<---accessToken, refreshToken-----+
  |                                   |
  +--POST /api/auth/set-tokens------->| 
  |   (new tokens)                    | Update cookies
  |<---Set-Cookie headers-----+-------+
  |                            |
  | Retry original request    |
  |<---Success-----------+----+
  |
```

**Consistency Check**:
- [ ] Refresh token must be sent in httpOnly cookie (automatic)
- [ ] API returns new access token
- [ ] Frontend updates cookie via `/api/auth/set-tokens`
- [ ] Old token must be blacklisted (prevent reuse)

#### 3.3 Logout Flow

```
Frontend                          Backend
  |                                 |
  +--POST /api/v1/auth/logout------->|
  |   (with access token)            |
  |                                  | Blacklist token
  |                                  | Revoke refresh tokens
  |                                  | Delete all sessions
  |<---{ success: true }------+------+
  |                           |
  | Clear local auth state    |
  | Delete cookies            |
  | Redirect to /login        |
  |
```

**Consistency Check**:
- [ ] Frontend calls logout endpoint with current token
- [ ] Backend revokes all sessions and refresh tokens
- [ ] Frontend clears cookies and redirects
- [ ] Old tokens rejected with 401

#### 3.4 MFA Flow

```
Frontend                          Backend
  |                                 |
  +--POST /api/v1/auth/login------->|
  |   email, password               |
  |                                  | Password valid
  |                                  | Check if MFA required
  |<---{ mfaChallenge: "required" }--+
  |                                   |
  | Show MFA form                    |
  |                                  |
  +--POST /api/v1/auth/mfa/verify-->|
  |   code, method                   |
  |                                  | Verify code
  |                                  | Generate tokens
  |<---accessToken, refreshToken----+
  |                                   |
  +--POST /api/auth/set-tokens------->|
  |   (new tokens)                    | Set cookies
  |<---Set-Cookie headers-----+-------+
  |
```

**Consistency Check**:
- [ ] Backend enforces MFA if tenant policy requires it
- [ ] API returns 403 with `mfaRequired: true` if MFA not set up
- [ ] Frontend redirects to MFA setup flow
- [ ] After MFA success, frontend receives and stores tokens
- [ ] Audit logs all MFA events

#### 3.5 Tenant Switch Flow

```
Frontend                          Backend
  |                                 |
  +--POST /api/v1/auth/switch-tenant>|
  |   tenantId                       |
  |   (with current token)           |
  |                                  | Verify user in tenant
  |                                  | Blacklist old token
  |                                  | Generate new tokens
  |<---accessToken, refreshToken----+
  |                                   |
  +--POST /api/auth/set-tokens------->|
  |   (new tokens)                    | Update cookies
  |<---Set-Cookie headers-----+-------+
  |
  | Try to use old token             |
  | Should get 401 (blacklisted)    |
  |
```

**Consistency Check**:
- [ ] Old token immediately blacklisted
- [ ] New token has correct tenantId
- [ ] User cannot access resources from old tenant
- [ ] Audit logs tenant switch event
- [ ] Device fingerprint validates switch

---

### 4. Security Headers & CSRF

**Requirement**: All security headers must be present and correctly configured

#### 4.1 Backend Security Headers

| Header | Current | Target | Action |
|--------|---------|--------|--------|
| `Strict-Transport-Security` | ✅ In helmet | ✅ Verify max-age=31536000 | Confirm config |
| `X-Frame-Options` | ✅ In helmet | ✅ Set to DENY | Verify directive |
| `X-Content-Type-Options` | ✅ In helmet | ✅ nosniff | Verify |
| `Content-Security-Policy` | ✅ In helmet | ✅ Update directives | Update |
| `Set-Cookie` attributes | ⚠️ Via jwt plugin | ✅ httpOnly; Secure; SameSite=Strict | Update all cookie setters |

**Actions**:
1. Verify helmet config has all required directives
2. Update CSP to include frameDest: ["'none'"]
3. Add X-Frame-Options explicitly
4. Ensure all cookies set with httpOnly, Secure, SameSite=Strict

#### 4.2 CSRF Protection

**Requirement**: Prevent cross-site request forgery on state-changing endpoints

| Method | Current | Issue | Fix |
|--------|---------|-------|-----|
| **SameSite Cookies** | Not enforced on all cookies | CSRF possible via older browsers | Set SameSite=Strict on all auth cookies |
| **CSRF Token** | Not implemented | Extra layer of protection needed? | Optional (SameSite usually sufficient) |
| **Custom Headers** | Not used | Can't rely on for CSRF prevention | Use only with SameSite |

**Actions**:
1. Update `/api/auth/set-tokens` to set `SameSite=Strict` on cookies
2. Ensure all token-setting endpoints use Strict
3. Add CSRF token validation (optional, defense-in-depth)

---

### 5. Error Handling & Messages

**Requirement**: Consistent error messages across API and frontend

| Scenario | Backend Response | Frontend Handling | Issue | Fix |
|----------|-----------------|-------------------|-------|-----|
| **Invalid credentials** | 401, "Invalid email or password" | Show error message | Generic message (good) | Keep as-is |
| **MFA required** | 403, mfaRequired: true | Redirect to MFA setup | Allows differentiation (good) | Keep as-is |
| **Token expired** | 401, message varies | Auto-refresh or redirect | Automatic refresh (good) | Verify consistency |
| **Tenant mismatch** | 401, "Tenant mismatch" | Request failed | Clear error (good) | Keep as-is |
| **Rate limited** | 429, "Too many requests" | Show retry message | Consistent (good) | Add retryAfter header |

**Actions**:
1. Ensure all 401 responses are for "invalid or expired token"
2. Ensure all 403 responses include reason (MFA, tenant, etc.)
3. Ensure all 429 responses include `Retry-After` header
4. Frontend should parse and handle each appropriately

---

### 6. Session & Device Management

**Requirement**: Sessions and devices must be consistently tracked

| Item | Backend | Frontend | Consistency |
|------|---------|----------|-------------|
| **Device Fingerprinting** | ✅ Enabled | ⚠️ Available but not enforced | Partial |
| **Session Tracking** | ✅ Redis sessions | ⚠️ AuthContext only | Partial |
| **Multi-device Detection** | ✅ Multiple sessions | ⚠️ No limit checks | Partial |
| **Logout All Devices** | ✅ Revokes all | ⚠️ Just clears local state | Partial |

**Actions**:
1. Frontend should validate device fingerprint on each request
2. Frontend should warn if new device detected
3. Frontend should list active sessions (if available)
4. Backend should support logout-all-devices

---

### 7. Audit & Compliance

**Requirement**: All auth events must be logged consistently

| Event | Backend Logs | Frontend Logs | Consistency |
|-------|--------------|---------------|-------------|
| **Login success** | ✅ Event logged | ⚠️ Console only | Partial |
| **Login failure** | ✅ Event logged | ⚠️ Console only | Partial |
| **MFA challenge** | ✅ Event logged | ⚠️ Not logged | Missing |
| **Token refresh** | ✅ Event logged | ⚠️ Not logged | Missing |
| **Logout** | ✅ Event logged | ⚠️ Console only | Partial |
| **Tenant switch** | ✅ Event logged | ⚠️ Not logged | Missing |
| **Device change** | ✅ Attempted | ⚠️ Not detected | Missing |

**Actions**:
1. Ensure all audit events include: userId, email, tenantId, ipAddress, timestamp, outcome
2. Frontend should log auth events to analytics (Application Insights)
3. Create audit dashboard to view auth events

---

## Implementation Sequence

### Step 1: Backend Foundation (Day 1)
1. Enable token validation cache
2. Fix token expiry consistency in config
3. Add rate limiting to login
4. Verify helmet security headers

**Why**: Improves API security without breaking frontend

### Step 2: Frontend Security (Day 2)
1. Create `/api/auth/set-tokens` endpoint
2. Update auth context to use set-tokens
3. Update api/client.ts to use cookies
4. Remove localStorage token handling

**Why**: XSS-resistant token storage

### Step 3: Session Management (Day 3)
1. Implement MFA enforcement
2. Enhance logout flow
3. Improve tenant isolation
4. Add cross-tenant validation

**Why**: Complete session lifecycle security

### Step 4: Testing & Validation (Day 4-5)
1. Create security test suite
2. Create integration tests
3. Security audit verification
4. Document findings

**Why**: Ensure all changes work correctly

---

## Rollback Plan

If issues occur during implementation:

1. **After Phase 1 (Token Cache)**: Disable cache via env var `JWT_VALIDATION_CACHE_ENABLED=false`
2. **After Phase 2 (httpOnly)**: Revert frontend to localStorage if cookies don't work (check CORS credentials)
3. **After Phase 3 (MFA)**: Disable enforcement via tenant config
4. **After Phase 4 (Logout)**: Use old logout logic if issues with session revocation

---

## Sign-Off Checklist

### Security Review
- [ ] All findings addressed
- [ ] No new vulnerabilities introduced
- [ ] Compliance requirements met
- [ ] Audit logging complete

### Performance Review
- [ ] Token cache improves latency
- [ ] No regression in API performance
- [ ] Cookie overhead acceptable
- [ ] Database queries optimized

### Testing Review
- [ ] Unit tests all passing
- [ ] Integration tests all passing
- [ ] Security tests all passing
- [ ] Manual testing complete

### Documentation Review
- [ ] API documentation updated
- [ ] Frontend integration guide updated
- [ ] Deployment guide updated
- [ ] Troubleshooting guide created

### Deployment Review
- [ ] Deployment script prepared
- [ ] Rollback plan tested
- [ ] Monitoring alerts configured
- [ ] Support team trained

