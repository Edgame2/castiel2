# Authentication System - Missing Features Implementation TODO

## Overview

This document outlines the missing features in the authentication system that need to be implemented. Each feature includes both API (backend) and UI (frontend) requirements, along with admin management capabilities.

**Last Updated**: November 2025  
**Priority Legend**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Table of Contents

1. [MFA Challenge Verification (Critical Fix)](#1-mfa-challenge-verification-critical-fix)
2. [Magic Link (Passwordless) Authentication](#2-magic-link-passwordless-authentication)
3. [SAML/SSO Integration](#3-samlsso-integration)
4. [Microsoft OAuth](#4-microsoft-oauth)
5. [Azure AD B2C Integration](#5-azure-ad-b2c-integration)
6. [MFA Audit & Analytics](#6-mfa-audit--analytics)
7. [Admin Management Dashboards](#7-admin-management-dashboards)

---

## 1. MFA Challenge Verification (Critical Fix)

**Priority**: 🔴 Critical  
**Current Status**: Returns 501 Not Implemented  
**Impact**: Users with MFA enabled cannot complete login

### 1.1 Backend API Tasks

#### 1.1.1 Fix MFA Challenge Endpoint
- [ ] **File**: `services/main-api/src/controllers/mfa.controller.ts`
- [ ] Implement full MFA challenge verification in `mfaChallenge()` method
- [ ] Verify challenge token and extract user info
- [ ] Support all MFA methods: TOTP, SMS, Email, Recovery codes
- [ ] Issue full access token after successful verification
- [ ] Handle trusted device registration when `rememberDevice` is true
- [ ] Create audit log entry for MFA verification
- [ ] Implement rate limiting for failed attempts (5 attempts per 5 minutes)

```typescript
// Expected implementation structure
async mfaChallenge(request: FastifyRequest, reply: FastifyReply) {
  // 1. Verify challenge token
  // 2. Get user from database
  // 3. Verify MFA code based on method (totp/sms/email/recovery)
  // 4. Register trusted device if requested
  // 5. Generate full access token
  // 6. Create session
  // 7. Audit log the successful MFA verification
  // 8. Return tokens
}
```

#### 1.1.2 Add Recovery Code Verification
- [ ] **File**: `services/main-api/src/services/auth/mfa.service.ts`
- [ ] Add method `verifyRecoveryCode(userId, tenantId, code)`
- [ ] Invalidate recovery code after use (one-time use)
- [ ] Track which recovery code was used in audit log

#### 1.1.3 Update Auth Schema
- [ ] **File**: `services/main-api/src/schemas/mfa.schemas.ts`
- [ ] Add `recovery` to allowed methods in challenge schema
- [ ] Add `rememberDevice` boolean field

### 1.2 Frontend UI Tasks

#### 1.2.1 Fix MFA Challenge Page Integration
- [ ] **File**: `services/frontend/src/app/(auth)/mfa/challenge/page.tsx`
- [ ] Ensure `useCompleteMFAChallenge` hook calls correct endpoint
- [ ] Handle all error responses properly
- [ ] Add proper loading states

#### 1.2.2 Update MFA Hook
- [ ] **File**: `services/frontend/src/hooks/use-mfa.ts`
- [ ] Verify `completeMFAChallenge` mutation calls `/api/auth/mfa/challenge`
- [ ] Handle trusted device response

### 1.3 Testing
- [ ] Add unit tests for MFA challenge controller
- [ ] Add integration tests for full MFA login flow
- [ ] Test each MFA method (TOTP, SMS, Email, Recovery)
- [ ] Test trusted device flow

---

## 2. Magic Link (Passwordless) Authentication

**Priority**: 🟠 High  
**Current Status**: Not implemented  
**Impact**: Modern passwordless auth not available

### 2.1 Backend API Tasks

#### 2.1.1 Create Magic Link Service
- [ ] **New File**: `services/main-api/src/services/auth/magic-link.service.ts`

```typescript
export class MagicLinkService {
  // Generate secure magic link token
  async generateMagicLink(email: string, tenantId: string): Promise<{
    token: string;
    expiresAt: Date;
  }>;

  // Validate magic link token
  async validateMagicLink(token: string): Promise<{
    userId: string;
    email: string;
    tenantId: string;
  } | null>;

  // Invalidate token after use
  async invalidateToken(token: string): Promise<void>;
}
```

**Implementation Details**:
- [ ] Generate cryptographically secure token (32 bytes)
- [ ] Store token in Redis with 15-minute TTL
- [ ] Token format: `ml_${randomBytes(32).toString('hex')}`
- [ ] One-time use - delete after successful validation
- [ ] Rate limit: 3 magic links per email per hour

#### 2.1.2 Create Magic Link Controller
- [ ] **New File**: `services/main-api/src/controllers/magic-link.controller.ts`

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/magic-link/request` | Request magic link email |
| GET | `/auth/magic-link/verify/:token` | Verify magic link and login |

#### 2.1.3 Create Magic Link Routes
- [ ] **New File**: `services/main-api/src/routes/magic-link.routes.ts`
- [ ] Register routes in `services/main-api/src/routes/index.ts`

#### 2.1.4 Create Magic Link Schemas
- [ ] **New File**: `services/main-api/src/schemas/magic-link.schemas.ts`

```typescript
export const requestMagicLinkSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
      tenantId: { type: 'string' },
      returnUrl: { type: 'string' },
    },
  },
};
```

#### 2.1.5 Add Magic Link Email Template
- [ ] **File**: `services/main-api/src/services/auth/email.service.ts`
- [ ] Add `sendMagicLinkEmail(to, magicLinkUrl)` method
- [ ] Create branded HTML email template

### 2.2 Frontend UI Tasks

#### 2.2.1 Create Magic Link Request Page
- [ ] **New File**: `services/frontend/src/app/(auth)/magic-link/page.tsx`
- [ ] Email input form
- [ ] Success state showing "Check your email"
- [ ] Resend link button (with cooldown)
- [ ] Link to regular login

#### 2.2.2 Create Magic Link Verify Page
- [ ] **New File**: `services/frontend/src/app/(auth)/magic-link/verify/page.tsx`
- [ ] Handle token from URL parameter
- [ ] Show loading state during verification
- [ ] Handle success (redirect to dashboard)
- [ ] Handle expired/invalid token errors
- [ ] Option to request new link

#### 2.2.3 Update Login Page
- [ ] **File**: `services/frontend/src/app/(auth)/login/page.tsx`
- [ ] Add "Sign in with magic link" button/link
- [ ] Add divider between password and magic link options

#### 2.2.4 Create Magic Link Hooks
- [ ] **New File**: `services/frontend/src/hooks/use-magic-link.ts`

```typescript
export function useRequestMagicLink();
export function useVerifyMagicLink();
```

### 2.3 Admin Features

#### 2.3.1 Tenant Settings - Enable/Disable Magic Link
- [ ] **File**: `services/main-api/src/types/tenant.types.ts`
- [ ] Add `allowMagicLink: boolean` to tenant settings
- [ ] **File**: `services/frontend/src/app/(dashboard)/tenant/settings/page.tsx`
- [ ] Add toggle for magic link authentication

### 2.4 Testing
- [ ] Unit tests for magic link service
- [ ] Integration tests for full flow
- [ ] E2E tests with Playwright

---

## 3. SAML/SSO Integration

**Priority**: 🟠 High  
**Current Status**: Service exists but no routes registered  
**Impact**: Enterprise SSO not functional

### 3.1 Backend API Tasks

#### 3.1.1 Create SSO Routes
- [ ] **New File**: `services/main-api/src/routes/sso.routes.ts`

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sso/:tenantId/saml/login` | Initiate SAML SSO |
| POST | `/sso/:tenantId/saml/acs` | SAML Assertion Consumer Service |
| GET | `/sso/:tenantId/saml/metadata` | SP Metadata XML |
| GET | `/sso/:tenantId/saml/slo` | Single Logout |

#### 3.1.2 Create SSO Controller
- [ ] **New File**: `services/main-api/src/controllers/sso.controller.ts`

```typescript
export class SSOController {
  constructor(
    private samlService: SAMLService,
    private ssoConfigService: SSOConfigService,
    private userService: UserService,
    private cacheManager: CacheManager
  ) {}

  // Initiate SAML login
  async initiateSAMLLogin(request, reply): Promise<void>;
  
  // Handle SAML assertion
  async handleSAMLAssertion(request, reply): Promise<void>;
  
  // Return SP metadata
  async getMetadata(request, reply): Promise<void>;
  
  // Handle single logout
  async handleLogout(request, reply): Promise<void>;
}
```

#### 3.1.3 Create SSO Schemas
- [ ] **New File**: `services/main-api/src/schemas/sso.schemas.ts`

#### 3.1.4 Register SSO Routes
- [ ] **File**: `services/main-api/src/routes/index.ts`
- [ ] Import and register SSO routes
- [ ] Initialize SSO controller with dependencies

#### 3.1.5 Update SAML Service
- [ ] **File**: `services/main-api/src/services/auth/saml.service.ts`
- [ ] Add method to map SAML attributes to user properties
- [ ] Add method to handle just-in-time (JIT) user provisioning
- [ ] Add group-to-role mapping

### 3.2 Frontend UI Tasks

#### 3.2.1 Create SSO Login Page
- [ ] **New File**: `services/frontend/src/app/(auth)/sso/page.tsx`
- [ ] Email/domain input for SSO discovery
- [ ] Redirect to IdP

#### 3.2.2 Create SSO Callback Page
- [ ] **New File**: `services/frontend/src/app/(auth)/sso/callback/page.tsx`
- [ ] Handle SSO redirect with tokens
- [ ] Error handling for failed SSO

#### 3.2.3 Update Login Page
- [ ] **File**: `services/frontend/src/app/(auth)/login/page.tsx`
- [ ] Add "Sign in with SSO" button
- [ ] Domain-based SSO detection (e.g., `@company.com` triggers SSO)

### 3.3 Tenant Admin Features

#### 3.3.1 SSO Configuration API
- [ ] **File**: `services/main-api/src/routes/tenant.routes.ts`
- [ ] Add endpoints for SSO configuration:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenants/:tenantId/sso` | Get SSO configuration |
| PUT | `/api/tenants/:tenantId/sso` | Update SSO configuration |
| DELETE | `/api/tenants/:tenantId/sso` | Disable SSO |
| POST | `/api/tenants/:tenantId/sso/test` | Test SSO configuration |

#### 3.3.2 SSO Configuration UI
- [ ] **New File**: `services/frontend/src/app/(dashboard)/tenant/settings/sso/page.tsx`
- [ ] Provider selection (Okta, Azure AD, Google Workspace, Generic SAML)
- [ ] IdP metadata URL input OR manual configuration
- [ ] Certificate upload
- [ ] Attribute mapping configuration
- [ ] Test connection button
- [ ] SP metadata download

#### 3.3.3 SSO Group Mapping UI
- [ ] **New File**: `services/frontend/src/app/(dashboard)/tenant/settings/sso/group-mapping/page.tsx`
- [ ] Map IdP groups to tenant roles
- [ ] Default role for new SSO users
- [ ] JIT provisioning toggle

### 3.4 Super Admin Features

#### 3.4.1 SSO Overview Dashboard
- [ ] **New File**: `services/frontend/src/app/(dashboard)/admin/sso/page.tsx`
- [ ] List all tenants with SSO enabled
- [ ] SSO health status per tenant
- [ ] Recent SSO login activity

### 3.5 Testing
- [ ] Unit tests for SAML service
- [ ] Integration tests with mock IdP
- [ ] Test IdP-initiated and SP-initiated flows

---

## 4. Microsoft OAuth

**Priority**: 🟡 Medium  
**Current Status**: Not implemented (only Google/GitHub)  
**Impact**: Common enterprise auth method missing

### 4.1 Backend API Tasks

#### 4.1.1 Add Microsoft OAuth Configuration
- [ ] **File**: `services/main-api/src/config/env.ts`
- [ ] Add Microsoft OAuth environment variables:
  - `OAUTH_MICROSOFT_CLIENT_ID`
  - `OAUTH_MICROSOFT_CLIENT_SECRET`
  - `OAUTH_MICROSOFT_TENANT_ID` (or "common" for multi-tenant)
  - `OAUTH_MICROSOFT_REDIRECT_URI`

#### 4.1.2 Update OAuth Service
- [ ] **File**: `services/main-api/src/services/auth/oauth.service.ts`
- [ ] Add Microsoft provider configuration
- [ ] Add Microsoft token exchange method
- [ ] Add Microsoft user info method

```typescript
// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token';
const MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me';
```

#### 4.1.3 Update OAuth Controller
- [ ] **File**: `services/main-api/src/controllers/oauth.controller.ts`
- [ ] Add `initiateMicrosoft()` method
- [ ] Add `handleMicrosoftCallback()` method

#### 4.1.4 Update OAuth Routes
- [ ] **File**: `services/main-api/src/routes/oauth.routes.ts`
- [ ] Add Microsoft routes:

```typescript
server.get('/auth/microsoft', ..., oauthController.initiateMicrosoft);
server.get('/auth/microsoft/callback', ..., oauthController.handleMicrosoftCallback);
```

#### 4.1.5 Update OAuth Schemas
- [ ] **File**: `services/main-api/src/schemas/oauth.schemas.ts`
- [ ] Add Microsoft OAuth schemas

### 4.2 Frontend UI Tasks

#### 4.2.1 Update Login Page
- [ ] **File**: `services/frontend/src/app/(auth)/login/page.tsx`
- [ ] Add Microsoft sign-in button with icon

#### 4.2.2 Update Register Page
- [ ] **File**: `services/frontend/src/app/(auth)/register/page.tsx`
- [ ] Add Microsoft sign-up button

#### 4.2.3 Add Microsoft Icon
- [ ] Add Microsoft logo SVG to assets or use icon library

### 4.3 Tenant Admin Features

#### 4.3.1 OAuth Provider Settings
- [ ] **File**: `services/frontend/src/app/(dashboard)/tenant/settings/page.tsx`
- [ ] Add toggle for Microsoft OAuth (enable/disable per tenant)
- [ ] Add to `allowedOAuthProviders` array in tenant settings

### 4.4 Testing
- [ ] Unit tests for Microsoft OAuth service methods
- [ ] Integration tests with mock Microsoft OAuth
- [ ] Manual testing with real Microsoft account

---

## 5. Azure AD B2C Integration

**Priority**: 🟠 High (for enterprise customers)  
**Current Status**: Types/config exist but no routes  
**Impact**: Enterprise Azure SSO not functional

### 5.1 Backend API Tasks

#### 5.1.1 Create Azure B2C Controller
- [ ] **New File**: `services/main-api/src/controllers/azure-b2c.controller.ts`

```typescript
export class AzureB2CController {
  // Initiate B2C login flow
  async initiateLogin(request, reply): Promise<void>;
  
  // Handle B2C callback
  async handleCallback(request, reply): Promise<void>;
  
  // Handle B2C logout
  async handleLogout(request, reply): Promise<void>;
  
  // Refresh B2C token
  async refreshToken(request, reply): Promise<void>;
}
```

#### 5.1.2 Create Azure B2C Routes
- [ ] **New File**: `services/main-api/src/routes/azure-b2c.routes.ts`

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/azure-b2c/login` | Initiate B2C login |
| GET | `/auth/azure-b2c/callback` | B2C callback handler |
| GET | `/auth/azure-b2c/logout` | B2C logout |
| POST | `/auth/azure-b2c/refresh` | Refresh B2C token |

#### 5.1.3 Create Azure B2C Service
- [ ] **New File**: `services/main-api/src/services/auth/azure-b2c.service.ts`
- [ ] Integrate with `@castiel/azure-ad-b2c` package
- [ ] Handle token validation
- [ ] Handle user provisioning from B2C claims

#### 5.1.4 Register Routes
- [ ] **File**: `services/main-api/src/routes/index.ts`
- [ ] Import and register Azure B2C routes

### 5.2 Frontend UI Tasks

#### 5.2.1 Create B2C Login Button
- [ ] **File**: `services/frontend/src/app/(auth)/login/page.tsx`
- [ ] Add "Sign in with Azure AD" button (conditional based on tenant config)

#### 5.2.2 Create B2C Callback Handler
- [ ] **New File**: `services/frontend/src/app/(auth)/azure-b2c/callback/page.tsx`
- [ ] Handle B2C redirect with id_token
- [ ] Exchange for application tokens
- [ ] Redirect to dashboard

### 5.3 Tenant Admin Features

#### 5.3.1 Azure B2C Configuration API
- [ ] Add endpoints to tenant routes for B2C config
- [ ] Store B2C configuration per tenant

#### 5.3.2 Azure B2C Configuration UI
- [ ] **New File**: `services/frontend/src/app/(dashboard)/tenant/settings/azure-b2c/page.tsx`
- [ ] Tenant name input
- [ ] Client ID input
- [ ] Policy names (sign-in, sign-up, password reset)
- [ ] Custom domain configuration
- [ ] Test connection

### 5.4 Super Admin Features

#### 5.4.1 B2C Overview
- [ ] Add B2C status to SSO admin dashboard
- [ ] Show which tenants use B2C

### 5.5 Testing
- [ ] Unit tests for B2C service
- [ ] Integration tests with B2C test tenant
- [ ] Manual E2E testing

---

## 6. MFA Audit & Analytics

**Priority**: 🟡 Medium  
**Current Status**: General audit exists, no dedicated MFA audit  
**Impact**: Limited visibility into MFA usage

### 6.1 Backend API Tasks

#### 6.1.1 Create MFA Audit Service
- [ ] **New File**: `services/main-api/src/services/audit/mfa-audit.service.ts`

```typescript
export class MFAAuditService {
  // Log MFA event
  async logMFAEvent(event: MFAAuditEvent): Promise<void>;
  
  // Query MFA audit logs
  async queryLogs(query: MFAAuditQuery): Promise<MFAAuditLog[]>;
  
  // Get MFA statistics
  async getStats(tenantId: string, dateRange: DateRange): Promise<MFAStats>;
  
  // Export MFA audit logs
  async exportLogs(query: MFAAuditQuery, format: 'csv' | 'json'): Promise<Buffer>;
}
```

#### 6.1.2 Create MFA Audit Controller
- [ ] **New File**: `services/main-api/src/controllers/mfa-audit.controller.ts`

#### 6.1.3 Create MFA Audit Routes
- [ ] **New File**: `services/main-api/src/routes/mfa-audit.routes.ts`

**Endpoints**:
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/audit/mfa` | Query MFA audit logs | Admin |
| GET | `/api/admin/audit/mfa/stats` | Get MFA statistics | Admin |
| GET | `/api/admin/audit/mfa/export` | Export MFA audit | Admin |
| GET | `/api/admin/audit/mfa/user/:userId` | User MFA history | Admin |

#### 6.1.4 Create MFA Audit Types
- [ ] **New File**: `services/main-api/src/types/mfa-audit.types.ts`

```typescript
export interface MFAAuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  eventType: 'enrollment' | 'verification' | 'disable' | 'recovery_used' | 'policy_change';
  methodType: MFAMethodType | 'recovery' | 'policy';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface MFAStats {
  totalEnrollments: number;
  enrollmentsByMethod: Record<MFAMethodType, number>;
  verificationSuccessRate: number;
  failedAttempts: number;
  recoveryCodesUsed: number;
  usersWithMFA: number;
  usersWithoutMFA: number;
}
```

#### 6.1.5 Update MFA Service to Log Events
- [ ] **File**: `services/main-api/src/services/auth/mfa.service.ts`
- [ ] Inject MFA audit service
- [ ] Add audit logging to all MFA operations

### 6.2 Frontend UI Tasks

#### 6.2.1 MFA Audit Dashboard
- [ ] **File**: `services/frontend/src/app/(dashboard)/admin/audit/mfa/page.tsx` (enhance existing)
- [ ] Stats cards (enrollments, verifications, failures)
- [ ] Charts (enrollment trends, method distribution)
- [ ] Filterable audit log table
- [ ] Export functionality

#### 6.2.2 MFA User History Component
- [ ] **New File**: `services/frontend/src/components/admin/mfa-user-history.tsx`
- [ ] Show MFA history for specific user
- [ ] Used in user detail page

### 6.3 Tenant Admin Features

#### 6.3.1 Tenant MFA Analytics
- [ ] **New File**: `services/frontend/src/app/(dashboard)/tenant/analytics/mfa/page.tsx`
- [ ] Tenant-scoped MFA statistics
- [ ] MFA adoption rate
- [ ] Method popularity

### 6.4 Testing
- [ ] Unit tests for MFA audit service
- [ ] Integration tests for audit logging

---

## 7. Admin Management Dashboards

**Priority**: 🟡 Medium  
**Current Status**: Partial implementation  
**Impact**: Admin visibility and control limited

### 7.1 Super Admin Dashboard

#### 7.1.1 Authentication Overview Page
- [ ] **New File**: `services/frontend/src/app/(dashboard)/admin/auth/page.tsx`
- [ ] System-wide authentication statistics
- [ ] Active sessions count
- [ ] Login success/failure rates
- [ ] Geographic distribution of logins
- [ ] Suspicious activity alerts

#### 7.1.2 SSO Management Page
- [ ] **New File**: `services/frontend/src/app/(dashboard)/admin/sso/page.tsx`
- [ ] List all SSO configurations across tenants
- [ ] SSO health status
- [ ] Quick actions (disable, test)

#### 7.1.3 OAuth Providers Management
- [ ] **New File**: `services/frontend/src/app/(dashboard)/admin/oauth/page.tsx`
- [ ] OAuth provider status
- [ ] Usage statistics per provider
- [ ] Configuration management

#### 7.1.4 Security Alerts Dashboard
- [ ] **New File**: `services/frontend/src/app/(dashboard)/admin/security/page.tsx`
- [ ] Failed login attempts (brute force detection)
- [ ] Unusual login patterns
- [ ] MFA bypass attempts
- [ ] Account lockouts

### 7.2 Tenant Admin Dashboard

#### 7.2.1 Tenant Auth Settings Page
- [ ] **Enhance**: `services/frontend/src/app/(dashboard)/tenant/settings/page.tsx`
- [ ] Add sections for:
  - [ ] Password policy configuration
  - [ ] Session timeout settings
  - [ ] MFA enforcement level (off/optional/required)
  - [ ] Allowed authentication methods
  - [ ] IP allowlisting

#### 7.2.2 Tenant Security Dashboard
- [ ] **New File**: `services/frontend/src/app/(dashboard)/tenant/security/page.tsx`
- [ ] Tenant-scoped security overview
- [ ] User MFA adoption
- [ ] Recent security events
- [ ] Active sessions overview

#### 7.2.3 User Security Management
- [ ] **Enhance**: `services/frontend/src/app/(protected)/users/[id]/page.tsx`
- [ ] Add security tab showing:
  - [ ] User's MFA methods
  - [ ] Active sessions
  - [ ] Login history
  - [ ] Force password reset button
  - [ ] Force MFA enrollment button
  - [ ] Revoke all sessions button

### 7.3 Backend API Support

#### 7.3.1 Admin Statistics Endpoints
- [ ] **New File**: `services/main-api/src/routes/admin-stats.routes.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats/auth` | System-wide auth stats |
| GET | `/api/admin/stats/sessions` | Session statistics |
| GET | `/api/admin/stats/security` | Security metrics |
| GET | `/api/admin/stats/tenants/:tenantId/auth` | Tenant auth stats |

#### 7.3.2 Admin Actions Endpoints
- [ ] **File**: `services/main-api/src/routes/user-management.routes.ts`
- [ ] Add endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/:userId/force-password-reset` | Force password reset |
| POST | `/api/users/:userId/force-mfa-enrollment` | Require MFA setup |
| POST | `/api/users/:userId/revoke-all-sessions` | Revoke all user sessions |
| POST | `/api/users/:userId/unlock` | Unlock locked account |

### 7.4 Testing
- [ ] Unit tests for admin stats service
- [ ] Integration tests for admin endpoints
- [ ] E2E tests for admin dashboards

---

## Implementation Order

### Phase 1: Critical Fixes (Week 1)
1. ✅ MFA Challenge Verification fix
2. ✅ Recovery code verification

### Phase 2: Core Features (Weeks 2-3)
3. Magic Link Authentication
4. Microsoft OAuth
5. MFA Audit & Analytics

### Phase 3: Enterprise Features (Weeks 4-5)
6. SAML/SSO Routes and UI
7. Azure AD B2C Integration

### Phase 4: Admin Tools (Week 6)
8. Admin Management Dashboards
9. Security Monitoring

---

## Environment Variables Required

Add to `.env` files:

```bash
# Magic Link
MAGIC_LINK_SECRET=your-magic-link-secret
MAGIC_LINK_EXPIRY_MINUTES=15

# Microsoft OAuth
OAUTH_MICROSOFT_CLIENT_ID=
OAUTH_MICROSOFT_CLIENT_SECRET=
OAUTH_MICROSOFT_TENANT_ID=common
OAUTH_MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/microsoft/callback

# Azure AD B2C (if using)
AZURE_B2C_TENANT_NAME=
AZURE_B2C_CLIENT_ID=
AZURE_B2C_CLIENT_SECRET=
AZURE_B2C_POLICY_SIGNIN=B2C_1_signin
AZURE_B2C_POLICY_SIGNUP=B2C_1_signup
AZURE_B2C_POLICY_PASSWORD_RESET=B2C_1_password_reset
AZURE_B2C_REDIRECT_URI=http://localhost:3001/auth/azure-b2c/callback
```

---

## Database Schema Updates

### New Cosmos DB Container: MFAAuditLogs
```typescript
{
  id: string;
  tenantId: string;        // Partition key
  userId: string;
  eventType: string;
  methodType: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  metadata: object;
  timestamp: Date;
}
```

### Update Tenants Container
Add to tenant settings:
```typescript
{
  settings: {
    // ... existing
    allowMagicLink: boolean;
    allowedOAuthProviders: string[];  // ['google', 'github', 'microsoft']
    ssoEnabled: boolean;
    mfaEnforcement: 'off' | 'optional' | 'required';
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      expiryDays: number;
      preventReuse: number;
    };
    sessionSettings: {
      maxConcurrentSessions: number;
      sessionTimeout: number;
      extendOnActivity: boolean;
    };
  }
}
```

---

## File Structure (New Files)

```
services/main-api/src/
├── controllers/
│   ├── azure-b2c.controller.ts        [NEW]
│   ├── magic-link.controller.ts       [NEW]
│   ├── mfa-audit.controller.ts        [NEW]
│   └── sso.controller.ts              [NEW]
├── routes/
│   ├── admin-stats.routes.ts          [NEW]
│   ├── azure-b2c.routes.ts            [NEW]
│   ├── magic-link.routes.ts           [NEW]
│   ├── mfa-audit.routes.ts            [NEW]
│   └── sso.routes.ts                  [NEW]
├── schemas/
│   ├── azure-b2c.schemas.ts           [NEW]
│   ├── magic-link.schemas.ts          [NEW]
│   ├── mfa-audit.schemas.ts           [NEW]
│   └── sso.schemas.ts                 [NEW]
├── services/
│   └── auth/
│       ├── azure-b2c.service.ts       [NEW]
│       ├── magic-link.service.ts      [NEW]
│       └── mfa-audit.service.ts       [NEW]
└── types/
    ├── magic-link.types.ts            [NEW]
    └── mfa-audit.types.ts             [NEW]

services/frontend/src/
├── app/
│   └── (auth)/
│       ├── azure-b2c/
│       │   └── callback/
│       │       └── page.tsx           [NEW]
│       ├── magic-link/
│       │   ├── page.tsx               [NEW]
│       │   └── verify/
│       │       └── page.tsx           [NEW]
│       └── sso/
│           ├── page.tsx               [NEW]
│           └── callback/
│               └── page.tsx           [NEW]
│   └── (dashboard)/
│       ├── admin/
│       │   ├── auth/
│       │   │   └── page.tsx           [NEW]
│       │   ├── oauth/
│       │   │   └── page.tsx           [NEW]
│       │   ├── security/
│       │   │   └── page.tsx           [NEW]
│       │   └── sso/
│       │       └── page.tsx           [NEW]
│       └── tenant/
│           ├── analytics/
│           │   └── mfa/
│           │       └── page.tsx       [NEW]
│           ├── security/
│           │   └── page.tsx           [NEW]
│           └── settings/
│               ├── azure-b2c/
│               │   └── page.tsx       [NEW]
│               └── sso/
│                   ├── page.tsx       [NEW]
│                   └── group-mapping/
│                       └── page.tsx   [NEW]
├── components/
│   └── admin/
│       └── mfa-user-history.tsx       [NEW]
└── hooks/
    └── use-magic-link.ts              [NEW]
```

---

## Acceptance Criteria

### MFA Challenge Fix
- [ ] Users with MFA can complete login
- [ ] All MFA methods work (TOTP, SMS, Email, Recovery)
- [ ] Trusted device registration works
- [ ] Rate limiting prevents brute force

### Magic Link
- [ ] Users can request magic link
- [ ] Magic link expires after 15 minutes
- [ ] Magic link is one-time use
- [ ] Email template is branded
- [ ] Rate limiting prevents abuse

### SAML/SSO
- [ ] SP-initiated SSO works
- [ ] IdP-initiated SSO works
- [ ] User provisioning (JIT) works
- [ ] Group-to-role mapping works
- [ ] Tenant admins can configure SSO

### Microsoft OAuth
- [ ] Microsoft login works
- [ ] User profile synced from Microsoft
- [ ] Works with personal and work accounts

### Azure AD B2C
- [ ] B2C login flow works
- [ ] Custom policies supported
- [ ] Token refresh works
- [ ] Tenant admins can configure B2C

### MFA Audit
- [ ] All MFA events logged
- [ ] Statistics accurate
- [ ] Export works (CSV, JSON)
- [ ] Admin dashboard shows data

### Admin Dashboards
- [ ] Super admin sees system-wide stats
- [ ] Tenant admin sees tenant stats
- [ ] Security alerts visible
- [ ] User security management works

---

**Document Owner**: Engineering Team  
**Review Cycle**: Weekly during implementation



