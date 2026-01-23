# TODO: Auth-Broker Migration to Main-API

## 1. Overview

**Objective**: Migrate all authentication, authorization, MFA, OAuth2, SSO, and tenant management features from `@castiel/auth-broker` service into `@castiel/main-api` service, resulting in a two-service architecture: Frontend + Main-API.

**Current State**:
- Auth-Broker (Port 3002): Dedicated authentication service with 20+ services, 10 controllers, 11 route modules
- Main-API (Port 3001): Business logic API with GraphQL support
- Frontend (Port 3000): Next.js application

**Target State**:
- Main-API (Port 3001): Unified API with all auth features + business logic + GraphQL
- Frontend (Port 3000): Next.js application (unchanged)
- Auth-Broker: **DELETED**

**Migration Scope**:
- 21 Service classes
- 10 Controllers
- 11 Route modules
- 4 Middleware components
- Cache management layer
- 66 comprehensive test cases
- All dependencies and configurations

---

## 2. Functional Requirements

### 2.1 Core Authentication Features (MUST MIGRATE)
- ✅ Email/Password registration with validation
- ✅ Email verification flow (token-based)
- ✅ Login with credentials
- ✅ JWT access token generation (15min expiry)
- ✅ Refresh token management with rotation
- ✅ Token revocation and blacklisting
- ✅ Password reset flow (forgot password)
- ✅ Password complexity validation
- ✅ User profile management (GET/PATCH /auth/me)
- ✅ Logout with session cleanup

### 2.2 Multi-Factor Authentication (MFA) (MUST MIGRATE)
- ✅ TOTP (Time-based One-Time Password) enrollment and verification
- ✅ SMS-based OTP enrollment and verification
- ✅ Email-based OTP enrollment and verification
- ✅ Recovery codes generation and validation
- ✅ Trusted device management
- ✅ MFA challenge flow during login
- ✅ MFA policy management per tenant
- ✅ MFA audit logging and statistics

### 2.3 OAuth2 Authorization Server (MUST MIGRATE)
- ✅ OAuth2 authorization endpoint (`/oauth2/authorize`)
- ✅ OAuth2 token endpoint (`/oauth2/token`)
- ✅ OAuth2 token revocation endpoint (`/oauth2/revoke`)
- ✅ OAuth2 client registration and management
- ✅ Authorization code flow
- ✅ Client credentials flow
- ✅ Token introspection endpoint (`/auth/introspect`)
- ✅ PKCE (Proof Key for Code Exchange) support

### 2.4 Social OAuth Integration (MUST MIGRATE)
- ✅ Google OAuth login (`/auth/google`, `/auth/google/callback`)
- ✅ GitHub OAuth login (`/auth/github`, `/auth/github/callback`)
- ✅ OAuth state validation and CSRF protection
- ✅ OAuth user profile syncing

### 2.5 Enterprise SSO (MUST MIGRATE)
- ✅ Azure AD B2C integration
- ✅ Azure AD B2C token validation
- ✅ B2C user profile syncing
- ✅ SAML 2.0 Service Provider functionality
- ✅ SAML SSO initiation (`/sso/:organizationId/saml/login`)
- ✅ SAML assertion consumer service (ACS) endpoint
- ✅ SAML metadata endpoint (`/sso/:organizationId/saml/metadata`)
- ✅ Multi-tenant SAML configuration

### 2.6 Tenant Management (MUST MIGRATE)
- ✅ Tenant creation (POST /api/tenants)
- ✅ Tenant retrieval (GET /api/tenants/:tenantId)
- ✅ Tenant updates (PATCH /api/tenants/:tenantId)
- ✅ Tenant deletion (DELETE /api/tenants/:tenantId)
- ✅ Tenant SSO configuration
- ✅ Tenant settings management
- ✅ Multi-tenant data isolation

### 2.7 User Management (MUST MIGRATE)
- ✅ List all users per tenant (GET /api/users)
- ✅ Get user by ID (GET /api/users/:userId)
- ✅ Create user (POST /api/users)
- ✅ Update user (PATCH /api/users/:userId)
- ✅ Delete user (DELETE /api/users/:userId)
- ✅ Bulk user operations
- ✅ User search and filtering
- ✅ User status management (active/inactive/suspended)

### 2.8 Role-Based Access Control (RBAC) (MUST MIGRATE)
- ✅ List roles per tenant (GET /api/tenants/:tenantId/roles)
- ✅ Create custom role (POST /api/tenants/:tenantId/roles)
- ✅ Get role details (GET /api/tenants/:tenantId/roles/:roleId)
- ✅ Update role (PATCH /api/tenants/:tenantId/roles/:roleId)
- ✅ Delete role (DELETE /api/tenants/:tenantId/roles/:roleId)
- ✅ Assign role to user (POST /api/tenants/:tenantId/roles/:roleId/members)
- ✅ Remove role from user (DELETE /api/tenants/:tenantId/roles/:roleId/members/:userId)
- ✅ List role members (GET /api/tenants/:tenantId/roles/:roleId/members)
- ✅ Map IdP groups to roles (POST /api/tenants/:tenantId/roles/:roleId/map)
- ✅ Get IdP group mappings (GET /api/tenants/:tenantId/roles/:roleId/mappings)
- ✅ List all permissions (GET /api/permissions)
- ✅ Permission validation middleware

### 2.9 Session Management (MUST MIGRATE)
- ✅ List user sessions (GET /api/sessions)
- ✅ Get session details (GET /api/sessions/:sessionId)
- ✅ Terminate session (POST /api/sessions/:sessionId/terminate)
- ✅ Terminate all sessions (POST /api/sessions/terminate-all)
- ✅ Session activity tracking
- ✅ Device fingerprinting
- ✅ Location-based session info
- ✅ Cross-instance session invalidation (Redis Pub/Sub)

### 2.10 Audit & Security (MUST MIGRATE)
- ✅ MFA audit event logging
- ✅ MFA audit query/export (GET /api/admin/audit/mfa)
- ✅ MFA statistics (GET /api/admin/audit/mfa/stats)
- ✅ Export audit logs to CSV (GET /api/admin/audit/mfa/export)
- ✅ Rate limiting on sensitive endpoints
- ✅ IP-based security tracking
- ✅ Failed login attempt tracking
- ✅ Brute force protection

### 2.11 Email Service Integration (MUST MIGRATE)
- ✅ Verification email sending
- ✅ Welcome email sending
- ✅ Password reset email sending
- ✅ MFA OTP email sending
- ✅ Resend email service integration
- ✅ Email template management

### 2.12 Cache & Performance (MUST MIGRATE)
- ✅ Redis-based session storage
- ✅ Refresh token storage with TTL
- ✅ Token blacklist for revoked tokens
- ✅ JWT validation result caching
- ✅ User data caching with invalidation
- ✅ Cross-instance cache invalidation (Pub/Sub)
- ✅ Automatic cleanup jobs for expired tokens

---

## 3. Data Models

### 3.1 Entity: User (Cosmos DB - Users Container)
**Source**: `auth-broker/src/services/user.service.ts`

```typescript
interface User {
  id: string;                    // UUID
  type: 'user';                  // Discriminator
  email: string;                 // Unique per tenant
  passwordHash: string;          // Argon2 hash
  firstName?: string;
  lastName?: string;
  tenantId: string;              // Partition key
  roles: string[];               // Role IDs
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
  _partitionKey: string;         // = tenantId
}
```

**Validation**:
- Email: Valid format, unique per tenant
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Status: Enum validation
- TenantId: Required, must exist

### 3.2 Entity: Tenant (Cosmos DB - Tenants Container)
**Source**: `auth-broker/src/services/tenant.service.ts`

```typescript
interface Tenant {
  id: string;                    // UUID
  type: 'tenant';
  name: string;
  domain?: string;               // Optional custom domain
  settings: {
    requireEmailVerification: boolean;
    passwordPolicy: PasswordPolicy;
    sessionTimeout: number;
    mfaEnabled: boolean;
    allowedOAuthProviders: string[];
  };
  ssoConfig?: {
    enabled: boolean;
    provider: 'saml' | 'azure-b2c';
    saml?: SAMLConfig;
    azureB2C?: AzureB2CConfig;
  };
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  _partitionKey: string;         // = id
}
```

### 3.3 Entity: Role (Cosmos DB - Roles Container)
**Source**: `auth-broker/src/services/role-management.service.ts`

```typescript
interface Role {
  id: string;                    // UUID
  type: 'role';
  tenantId: string;              // Partition key
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;             // Built-in roles (admin, user)
  idpGroupMappings?: {           // IdP group to role mapping
    provider: string;
    groupId: string;
    groupName: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  _partitionKey: string;         // = tenantId
}

interface Permission {
  id: string;                    // e.g., 'user:read:own'
  resource: string;              // e.g., 'user'
  action: string;                // e.g., 'read'
  scope: 'own' | 'tenant' | 'all';
  conditions?: Record<string, any>;
}
```

### 3.4 Entity: MFAMethod (Cosmos DB - MFA Container)
**Source**: `auth-broker/src/services/mfa.service.ts`

```typescript
interface MFAMethod {
  id: string;                    // UUID
  type: 'mfa-method';
  userId: string;
  tenantId: string;              // Partition key
  methodType: 'totp' | 'sms' | 'email';
  isActive: boolean;
  isPrimary: boolean;
  secret?: string;               // Encrypted TOTP secret
  phoneNumber?: string;          // For SMS
  email?: string;                // For email OTP
  backupCodes?: string[];        // Hashed recovery codes
  createdAt: Date;
  lastUsedAt?: Date;
  _partitionKey: string;         // = tenantId
}
```

### 3.5 Entity: OAuth2Client (Cosmos DB - OAuth2Clients Container)
**Source**: `auth-broker/src/services/oauth2-client.service.ts`

```typescript
interface OAuth2Client {
  id: string;                    // Client ID
  type: 'oauth2-client';
  tenantId: string;
  clientSecret: string;          // Hashed
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  grantTypes: ('authorization_code' | 'client_credentials' | 'refresh_token')[];
  tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post';
  requirePkce: boolean;
  createdAt: Date;
  _partitionKey: string;         // = tenantId
}
```

### 3.6 Entity: MFAAuditEvent (Cosmos DB - Audit Container)
**Source**: `auth-broker/src/services/mfa-audit.service.ts`

```typescript
interface MFAAuditEvent {
  id: string;
  type: 'mfa-audit';
  tenantId: string;
  userId: string;
  eventType: 'enrollment' | 'verification' | 'disable' | 'recovery_used';
  methodType: 'totp' | 'sms' | 'email' | 'recovery';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  _partitionKey: string;         // = tenantId
}
```

### 3.7 Redis Cache Structures
**Source**: `auth-broker/src/cache/manager.ts`

```typescript
// Session: session:{userId}:{tenantId}:{sessionId}
interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  provider: 'email' | 'google' | 'github' | 'saml' | 'azure-b2c';
  deviceInfo?: {
    userAgent: string;
    ip: string;
    browser?: string;
    os?: string;
  };
  locationInfo?: {
    ip: string;
    country?: string;
    city?: string;
  };
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
}

// Refresh Token: refresh_token:{tokenId}
interface RefreshTokenData {
  userId: string;
  tenantId: string;
  tokenFamily: string;
  createdAt: number;
  expiresAt: number;
  previousTokenId?: string;
}

// Blacklist: blacklist:{tokenHash}
// Value: "1" (with TTL = token expiry)

// User Cache: user:{userId}:{tenantId}
// Value: JSON.stringify(User) (TTL: 15 minutes)

// MFA OTP: mfa:otp:{userId}:{method}
interface MFAOTPData {
  code: string;                  // Hashed
  attempts: number;
  expiresAt: number;
}

// Trusted Devices: mfa:trusted:{userId}:{fingerprint}
interface TrustedDeviceData {
  deviceName: string;
  ipAddress: string;
  createdAt: number;
  expiresAt: number;
}
```

---

## 4. API Endpoints

### 4.1 Authentication Routes (Port 3001)
**Source**: `auth-broker/src/routes/auth.routes.ts` → `main-api/src/routes/auth.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with credentials | No |
| GET | `/auth/verify-email/:token` | Verify email address | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout and invalidate tokens | Yes |
| POST | `/auth/revoke` | Revoke specific token | Yes |
| POST | `/auth/introspect` | Introspect token (for resource servers) | No |
| POST | `/auth/mfa/verify` | Complete MFA challenge | No |
| GET | `/auth/me` | Get current user profile | Yes |
| PATCH | `/auth/me` | Update current user profile | Yes |

### 4.2 MFA Routes (Port 3001)
**Source**: `auth-broker/src/routes/mfa.routes.ts` → `main-api/src/routes/mfa.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/mfa/enroll/totp` | Enroll TOTP (get QR code) | Yes |
| POST | `/api/auth/mfa/verify/totp` | Verify and activate TOTP | Yes |
| POST | `/api/auth/mfa/enroll/sms` | Enroll SMS MFA | Yes |
| POST | `/api/auth/mfa/verify/sms` | Verify SMS OTP | Yes |
| POST | `/api/auth/mfa/enroll/email` | Enroll email MFA | Yes |
| POST | `/api/auth/mfa/verify/email` | Verify email OTP | Yes |
| POST | `/api/auth/mfa/challenge` | Initiate MFA challenge | No |
| GET | `/api/auth/mfa/methods` | List user's MFA methods | Yes |
| DELETE | `/api/auth/mfa/methods/:methodId` | Disable MFA method | Yes |
| POST | `/api/auth/mfa/recovery-codes` | Generate recovery codes | Yes |
| GET | `/api/auth/mfa/trusted-devices` | List trusted devices | Yes |
| DELETE | `/api/auth/mfa/trusted-devices/:fingerprint` | Remove trusted device | Yes |
| GET | `/api/admin/mfa/policy` | Get MFA policy for tenant | Yes (Admin) |
| PUT | `/api/admin/mfa/policy` | Update MFA policy | Yes (Admin) |

### 4.3 OAuth2 Routes (Port 3001)
**Source**: `auth-broker/src/routes/oauth2.routes.ts` → `main-api/src/routes/oauth2.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/oauth2/authorize` | OAuth2 authorization endpoint | User Session |
| POST | `/oauth2/token` | OAuth2 token endpoint | Client Credentials |
| POST | `/oauth2/revoke` | OAuth2 token revocation | Client Credentials |
| POST | `/api/oauth2/clients` | Register OAuth2 client | Yes (Admin) |
| GET | `/api/oauth2/clients` | List OAuth2 clients | Yes (Admin) |
| GET | `/api/oauth2/clients/:clientId` | Get client details | Yes (Admin) |
| DELETE | `/api/oauth2/clients/:clientId` | Delete OAuth2 client | Yes (Admin) |

### 4.4 Social OAuth Routes (Port 3001)
**Source**: `auth-broker/src/routes/oauth.routes.ts` → `main-api/src/routes/oauth.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/google` | Initiate Google OAuth flow | No |
| GET | `/auth/google/callback` | Google OAuth callback | No |
| GET | `/auth/github` | Initiate GitHub OAuth flow | No |
| GET | `/auth/github/callback` | GitHub OAuth callback | No |

### 4.5 SSO Routes (Port 3001)
**Source**: `auth-broker/src/routes/sso.routes.ts` → `main-api/src/routes/sso.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/sso/:organizationId/saml/login` | Initiate SAML SSO | No |
| POST | `/sso/:organizationId/saml/acs` | SAML assertion consumer | No |
| GET | `/sso/:organizationId/saml/metadata` | SAML SP metadata | No |

### 4.6 Tenant Management Routes (Port 3001)
**Source**: `auth-broker/src/routes/tenant.routes.ts` → `main-api/src/routes/tenant.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/tenants` | Create new tenant | Yes (Super Admin) |
| GET | `/api/tenants/:tenantId` | Get tenant details | Yes (Admin) |
| PATCH | `/api/tenants/:tenantId` | Update tenant | Yes (Admin) |
| DELETE | `/api/tenants/:tenantId` | Delete tenant | Yes (Super Admin) |
| POST | `/api/tenants/:tenantId/sso` | Configure SSO | Yes (Admin) |
| GET | `/api/tenants/:tenantId/settings` | Get tenant settings | Yes (Admin) |

### 4.7 User Management Routes (Port 3001)
**Source**: `auth-broker/src/routes/user-management.routes.ts` → `main-api/src/routes/user-management.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | List all users | Yes (Admin) |
| POST | `/api/users` | Create user | Yes (Admin) |
| GET | `/api/users/:userId` | Get user details | Yes (Admin) |
| PATCH | `/api/users/:userId` | Update user | Yes (Admin) |
| DELETE | `/api/users/:userId` | Delete user | Yes (Admin) |
| POST | `/api/users/:userId/roles` | Assign role to user | Yes (Admin) |
| GET | `/api/users/search` | Search users | Yes (Admin) |

### 4.8 Role Management Routes (Port 3001)
**Source**: `auth-broker/src/routes/role-management.routes.ts` → `main-api/src/routes/role-management.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/tenants/:tenantId/roles` | List roles | Yes |
| POST | `/api/tenants/:tenantId/roles` | Create role | Yes (Admin) |
| GET | `/api/tenants/:tenantId/roles/:roleId` | Get role | Yes |
| PATCH | `/api/tenants/:tenantId/roles/:roleId` | Update role | Yes (Admin) |
| DELETE | `/api/tenants/:tenantId/roles/:roleId` | Delete role | Yes (Admin) |
| GET | `/api/tenants/:tenantId/roles/:roleId/members` | List role members | Yes |
| POST | `/api/tenants/:tenantId/roles/:roleId/members` | Add user to role | Yes (Admin) |
| DELETE | `/api/tenants/:tenantId/roles/:roleId/members/:userId` | Remove user from role | Yes (Admin) |
| POST | `/api/tenants/:tenantId/roles/:roleId/map` | Map IdP group to role | Yes (Admin) |
| GET | `/api/tenants/:tenantId/roles/:roleId/mappings` | Get IdP mappings | Yes (Admin) |
| GET | `/api/permissions` | List all permissions | Yes |

### 4.9 Session Management Routes (Port 3001)
**Source**: `auth-broker/src/routes/session-management.routes.ts` → `main-api/src/routes/session-management.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/sessions` | List user's active sessions | Yes |
| GET | `/api/sessions/:sessionId` | Get session details | Yes |
| POST | `/api/sessions/:sessionId/terminate` | Terminate specific session | Yes |
| POST | `/api/sessions/terminate-all` | Terminate all sessions | Yes |
| GET | `/api/admin/sessions` | List all sessions (admin) | Yes (Admin) |
| POST | `/api/admin/sessions/:sessionId/terminate` | Admin terminate session | Yes (Admin) |

### 4.10 Audit Routes (Port 3001)
**Source**: `auth-broker/src/routes/audit.routes.ts` → `main-api/src/routes/audit.routes.ts`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/audit/mfa` | Query MFA audit logs | Yes (Admin) |
| GET | `/api/admin/audit/mfa/export` | Export MFA audit to CSV | Yes (Admin) |
| GET | `/api/admin/audit/mfa/stats` | Get MFA statistics | Yes (Admin) |

---

## 5. UI Pages

### 5.1 Frontend Changes Required
**Location**: `services/frontend/`

#### Update API Base URL
- Change: `NEXT_PUBLIC_AUTH_URL=http://localhost:3002` 
- To: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Update all `axios` calls from auth-broker to use main-api

#### Pages Requiring Updates
- `/app/auth/login/page.tsx` - Update login endpoint
- `/app/auth/register/page.tsx` - Update registration endpoint
- `/app/auth/verify-email/page.tsx` - Update verification endpoint
- `/app/auth/forgot-password/page.tsx` - Update password reset endpoint
- `/app/dashboard/sessions/page.tsx` - Update session management endpoints
- `/app/dashboard/mfa/page.tsx` - Update MFA endpoints
- `/app/admin/users/page.tsx` - Update user management endpoints
- `/app/admin/roles/page.tsx` - Update role management endpoints
- `/app/admin/tenants/page.tsx` - Update tenant management endpoints

#### API Client Service Update
- File: `services/frontend/lib/api-client.ts`
- Consolidate `authClient` and `apiClient` into single `apiClient`
- Single base URL for all API calls

---

## 6. Workflow / Sequence

### 6.1 Migration Sequence (13 Phases)

#### **Phase 1: Pre-Migration Preparation** (1 day)
1. Create feature branch: `git checkout -b feature/auth-broker-migration`
2. Backup current database containers (Cosmos DB export)
3. Document current environment variables for both services
4. Create migration rollback plan
5. Tag current stable version: `git tag pre-auth-migration`

#### **Phase 2: Dependency Installation** (2 hours)
1. Copy auth-broker dependencies to main-api `package.json`:
   - `@fastify/jwt`
   - `@fastify/rate-limit`
   - `@node-saml/passport-saml`
   - `@sendgrid/mail`
   - `argon2`
   - `qrcode`
   - `resend`
   - `speakeasy`
   - `xml2js`
   - `@castiel/azure-ad-b2c` (already workspace package)
2. Run: `pnpm install` in main-api
3. Verify no version conflicts

#### **Phase 3: Service Layer Migration** (2 days)
1. Copy service files from `auth-broker/src/services/` to `main-api/src/services/`:
   - ✅ `user.service.ts`
   - ✅ `email.service.ts`
   - ✅ `session.service.ts`
   - ✅ `token.service.ts`
   - ✅ `token-blacklist.service.ts`
   - ✅ `jwt-validation-cache.service.ts`
   - ✅ `cleanup-job.service.ts`
   - ✅ `user-cache.service.ts`
   - ✅ `cosmos-db.service.ts`
   - ✅ `tenant.service.ts`
   - ✅ `user-management.service.ts`
   - ✅ `session-management.service.ts`
   - ✅ `mfa.service.ts`
   - ✅ `mfa-audit.service.ts`
   - ✅ `role-management.service.ts`
   - ✅ `oauth.service.ts`
   - ✅ `oauth2-client.service.ts`
   - ✅ `oauth2-auth.service.ts`
   - ✅ `sso-config.service.ts`
   - ✅ `saml.service.ts`
2. Update imports in all copied services to reflect new paths
3. Create `main-api/src/services/index.ts` to export all services

#### **Phase 4: Cache Layer Migration** (1 day)
1. Copy cache management from `auth-broker/src/cache/`:
   - ✅ `manager.ts` → `main-api/src/cache/auth-cache-manager.ts`
   - ✅ `index.ts` → Update `main-api/src/cache/index.ts`
2. Integrate auth cache with existing main-api cache
3. Ensure Redis Pub/Sub for cross-instance invalidation works
4. Update cache key prefixes if needed (avoid collisions)

#### **Phase 5: Middleware Migration** (1 day)
1. Copy middleware from `auth-broker/src/middleware/`:
   - ✅ `authenticate.ts` → Merge with `main-api/src/middleware/authenticate.ts`
   - ✅ `rate-limit.ts` → `main-api/src/middleware/rate-limit.ts`
   - ✅ `session.ts` → `main-api/src/middleware/session.ts`
   - ✅ `error-handler.ts` → Merge with existing error handler
2. Update authentication middleware to handle JWT validation
3. Add rate limiting to auth endpoints (login, register, password reset)

#### **Phase 6: Controller Migration** (2 days)
1. Copy controllers from `auth-broker/src/controllers/`:
   - ✅ `auth.controller.ts`
   - ✅ `mfa.controller.ts`
   - ✅ `oauth.controller.ts`
   - ✅ `oauth2.controller.ts`
   - ✅ `sso.controller.ts`
   - ✅ `tenant.controller.ts`
   - ✅ `user-management.controller.ts`
   - ✅ `session-management.controller.ts`
   - ✅ `role-management.controller.ts`
   - ✅ `audit.controller.ts`
2. Update controller imports to use main-api service paths
3. Create `main-api/src/controllers/index.ts`

#### **Phase 7: Route Migration** (2 days)
1. Copy routes from `auth-broker/src/routes/`:
   - ✅ `auth.routes.ts`
   - ✅ `mfa.routes.ts`
   - ✅ `oauth.routes.ts`
   - ✅ `oauth2.routes.ts`
   - ✅ `sso.routes.ts`
   - ✅ `tenant.routes.ts`
   - ✅ `user-management.routes.ts`
   - ✅ `session-management.routes.ts`
   - ✅ `role-management.routes.ts`
   - ✅ `audit.routes.ts`
2. Register all routes in `main-api/src/index.ts`
3. Ensure route prefixes are correct (keep `/auth/*`, `/oauth2/*`, `/sso/*`, `/api/*`)
4. Update health check endpoint to include auth service health

#### **Phase 8: Schema & Types Migration** (1 day)
1. Copy schemas from `auth-broker/src/schemas/`:
   - ✅ All Fastify JSON schemas for validation
2. Copy types from `auth-broker/src/types/`:
   - ✅ `user.types.ts`
   - ✅ `mfa.types.ts`
   - ✅ `oauth.types.ts`
   - ✅ `session.types.ts`
   - ✅ `tenant.types.ts`
3. Merge with existing `main-api/src/types/`
4. Resolve any type conflicts

#### **Phase 9: Configuration Migration** (1 day)
1. Merge environment variables:
   - Copy from `auth-broker/.env` to `main-api/.env`
   - Key variables:
     - `JWT_SECRET`
     - `JWT_ACCESS_TOKEN_EXPIRY`
     - `JWT_REFRESH_TOKEN_EXPIRY`
     - `RESEND_API_KEY` or `SENDGRID_API_KEY`
     - `AZURE_B2C_*` variables
     - `OAUTH_GOOGLE_*` variables
     - `OAUTH_GITHUB_*` variables
     - `AUTH_BROKER_URL` → Change to `API_URL`
2. Update `main-api/src/config/env.ts` with new variables
3. Copy Key Vault configuration from `auth-broker/src/config/key-vault.ts`
4. Copy Azure B2C configuration from `auth-broker/src/config/azure-b2c.ts`

#### **Phase 10: Main Server Initialization** (1 day)
1. Update `main-api/src/index.ts`:
   - Register `@fastify/jwt` plugin with JWT secret
   - Register rate limiting plugin
   - Initialize all auth services (UserService, MFAService, etc.)
   - Initialize cache manager with auth cache
   - Register all auth routes
   - Add cleanup job for expired tokens
2. Ensure proper initialization order:
   1. Redis connection
   2. Cosmos DB connection
   3. Cache managers
   4. Services
   5. Controllers
   6. Routes
   7. Cleanup jobs

#### **Phase 11: Test Migration** (2 days)
1. Update test configuration:
   - Change `BASE_URL` from `http://localhost:3002` to `http://localhost:3001`
   - File: `tests/config/test-config.ts`
2. Move tests:
   - Keep in root `tests/` folder (✅ as requested)
   - Update import paths if needed
3. Run all 66 authentication tests:
   - `pnpm vitest run tests/auth-email-password.test.ts`
   - Ensure 100% pass rate
4. Add integration tests for:
   - Auth + Business logic interaction
   - GraphQL with authentication
   - OAuth2 + API access

#### **Phase 12: Frontend Integration** (1 day)
1. Update `services/frontend/.env.local`:
   - `NEXT_PUBLIC_AUTH_URL` → Remove
   - `NEXT_PUBLIC_API_URL=http://localhost:3001` → Keep single URL
2. Update API client:
   - File: `services/frontend/lib/api-client.ts`
   - Remove separate `authClient`
   - Use single `apiClient` for all requests
3. Update all authentication pages to use new endpoints
4. Test all auth flows from UI:
   - Registration → Email verification → Login
   - Password reset flow
   - MFA enrollment and verification
   - OAuth login (Google, GitHub)
   - Session management

#### **Phase 13: Cleanup & Removal** (2 hours)
1. **Delete auth-broker service**:
   - `rm -rf services/auth-broker`
2. Update root files:
   - `pnpm-workspace.yaml` - Remove `services/auth-broker`
   - `package.json` - Remove auth-broker scripts
   - `scripts/start-dev.sh` - Remove auth-broker startup
   - `scripts/stop-dev.sh` - Remove auth-broker shutdown
3. Update documentation:
   - `README.md` - Update architecture diagram (2 services only)
   - `docs/backend/API.md` - Consolidate API documentation
   - `docs/backend/AUTHENTICATION.md` - Update with new architecture
4. Update Terraform/Deployment configs:
   - `terraform/app-services.tf` - Remove auth-broker App Service
   - Keep only main-api and frontend
5. Git cleanup:
   - `git add -A`
   - `git commit -m "feat: migrate auth-broker into main-api"`
   - `git push origin feature/auth-broker-migration`

---

## 7. Integrations

### 7.1 Azure AD B2C
**Purpose**: Enterprise SSO for large customers  
**Configuration**:
- Tenant: Configured via Azure Portal
- Client ID: From B2C app registration
- Client Secret: Stored in Azure Key Vault
- Authority URL: `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}`
- Redirect URI: `http://localhost:3001/auth/azure-b2c/callback`

**Files to Migrate**:
- `packages/azure-ad-b2c/` (workspace package - already accessible)
- `auth-broker/src/config/azure-b2c.ts` → `main-api/src/config/azure-b2c.ts`

**Environment Variables**:
```bash
AZURE_B2C_TENANT_NAME=castielb2c
AZURE_B2C_CLIENT_ID=xxx
AZURE_B2C_CLIENT_SECRET=xxx
AZURE_B2C_POLICY_SIGNIN=B2C_1_signin
AZURE_B2C_REDIRECT_URI=http://localhost:3001/auth/azure-b2c/callback
```

### 7.2 Azure Key Vault
**Purpose**: Secure secret storage  
**Configuration**:
- Key Vault URL: From Azure Portal
- Managed Identity: For production
- Service Principal: For development

**Files to Migrate**:
- `packages/key-vault/` (workspace package - already accessible)
- `auth-broker/src/config/key-vault.ts` → `main-api/src/config/key-vault.ts`

**Environment Variables**:
```bash
KEY_VAULT_URL=https://castiel-kv.vault.azure.net/
AZURE_CLIENT_ID=xxx
AZURE_CLIENT_SECRET=xxx
AZURE_TENANT_ID=xxx
```

### 7.3 Email Service (Resend)
**Purpose**: Transactional emails  
**Configuration**:
- API Key: Stored in env or Key Vault
- From Email: verified domain

**Files to Migrate**:
- `auth-broker/src/services/email.service.ts` → Already in Phase 3

**Environment Variables**:
```bash
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@castiel.app
EMAIL_FROM_NAME=Castiel
```

### 7.4 Google OAuth
**Purpose**: Social login  
**Configuration**:
- Client ID: From Google Cloud Console
- Client Secret: From Google Cloud Console
- Redirect URI: `http://localhost:3001/auth/google/callback`

**Environment Variables**:
```bash
OAUTH_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=xxx
OAUTH_GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

### 7.5 GitHub OAuth
**Purpose**: Social login  
**Configuration**:
- Client ID: From GitHub OAuth Apps
- Client Secret: From GitHub OAuth Apps
- Redirect URI: `http://localhost:3001/auth/github/callback`

**Environment Variables**:
```bash
OAUTH_GITHUB_CLIENT_ID=xxx
OAUTH_GITHUB_CLIENT_SECRET=xxx
OAUTH_GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback
```

### 7.6 Redis Cache
**Purpose**: Session storage, token blacklist, cache  
**Configuration**:
- Already configured in main-api
- Extend with auth cache keys

**Connection**: Already established in main-api

### 7.7 Cosmos DB
**Purpose**: User, tenant, role, MFA data storage  
**Configuration**:
- Database: `castiel` (same as main-api)
- Containers:
  - `Users` (partition key: `tenantId`)
  - `Tenants` (partition key: `id`)
  - `Roles` (partition key: `tenantId`)
  - `MFA` (partition key: `tenantId`)
  - `OAuth2Clients` (partition key: `tenantId`)
  - `Audit` (partition key: `tenantId`)

**Migration Note**: No data migration needed if containers already exist. If auth-broker uses different database, export and import data.

---

## 8. Error Handling

### 8.1 Authentication Errors
- **401 Unauthorized**: Invalid credentials, expired token, missing token
- **403 Forbidden**: Email not verified, account suspended, insufficient permissions
- **409 Conflict**: User already exists, duplicate email
- **429 Too Many Requests**: Rate limit exceeded (5 requests per minute for login)
- **500 Internal Server Error**: Database errors, external service failures

### 8.2 MFA Errors
- **400 Bad Request**: Invalid OTP code, invalid recovery code
- **404 Not Found**: MFA method not found
- **410 Gone**: OTP expired (5 minutes)
- **423 Locked**: Too many failed attempts (lock for 15 minutes)

### 8.3 OAuth2 Errors
- **invalid_request**: Missing required parameter
- **invalid_client**: Invalid client credentials
- **invalid_grant**: Invalid authorization code or refresh token
- **unsupported_grant_type**: Grant type not supported
- **invalid_scope**: Requested scope exceeds client's allowed scopes

### 8.4 Retry Logic
- **Email Service**: 3 retries with exponential backoff (1s, 2s, 4s)
- **Cosmos DB**: Automatic retries via SDK (429 throttling)
- **Redis**: Automatic reconnection on disconnect

### 8.5 Logging Rules
- **Sensitive Data**: Never log passwords, tokens, secrets
- **PII**: Hash or mask email, phone numbers in logs
- **Security Events**: Log all auth failures, MFA events, role changes
- **Performance**: Log slow queries (>1s), cache miss rates
- **Errors**: Log full stack trace for 500 errors

**Logger**: Pino (already in main-api)  
**Log Levels**:
- `trace`: Detailed debugging
- `debug`: Development info
- `info`: Normal operations (login, registration)
- `warn`: Non-critical issues (email send failure)
- `error`: Critical errors (database down, service crash)
- `fatal`: System-level failures

---

## 9. Acceptance Criteria

### ✅ Phase Completion Criteria

#### Phase 1-2: Setup
- [ ] Feature branch created
- [ ] Database backup completed
- [ ] All dependencies installed without conflicts
- [ ] No build errors in main-api

#### Phase 3-5: Core Migration
- [ ] All 21 service files copied and imports updated
- [ ] Cache manager integrated with auth features
- [ ] All middleware properly merged
- [ ] No TypeScript compilation errors

#### Phase 6-8: Business Logic Migration
- [ ] All 10 controllers migrated
- [ ] All 11 route modules registered in main-api
- [ ] All schemas and types consolidated
- [ ] Swagger documentation updated

#### Phase 9-10: Configuration & Initialization
- [ ] All environment variables migrated
- [ ] JWT plugin configured and working
- [ ] Rate limiting active on auth endpoints
- [ ] Server starts without errors on port 3001
- [ ] Health check includes auth service status

#### Phase 11: Testing
- [ ] All 66 auth tests pass (100% success rate)
- [ ] Integration tests created and passing
- [ ] No regression in existing main-api tests
- [ ] Load testing shows acceptable performance (<500ms p95)

#### Phase 12: Frontend Integration
- [ ] Frontend connects to main-api only (no auth-broker calls)
- [ ] All auth flows work from UI:
  - [ ] User registration with email verification
  - [ ] Login with credentials
  - [ ] Password reset flow
  - [ ] MFA enrollment (TOTP, SMS, Email)
  - [ ] MFA login challenge
  - [ ] Google OAuth login
  - [ ] GitHub OAuth login
  - [ ] Session management
  - [ ] User profile updates
- [ ] No console errors in browser
- [ ] No broken links or 404 errors

#### Phase 13: Cleanup
- [ ] Auth-broker directory deleted
- [ ] Workspace configuration updated
- [ ] All scripts updated (start-dev.sh, etc.)
- [ ] Documentation updated
- [ ] Terraform configs updated
- [ ] Code committed and pushed

### ✅ Final Acceptance
- [ ] **Services Running**: Only 2 services (frontend on 3000, main-api on 3001)
- [ ] **All Features Working**: Every auth-broker feature accessible via main-api
- [ ] **Tests Passing**: 100% test success rate
- [ ] **No Auth-Broker Dependencies**: Auth-broker completely removed
- [ ] **Documentation Complete**: Architecture docs reflect new structure
- [ ] **Deployment Ready**: Terraform/Azure configs updated for 2-service deployment

---

## 10. Non-Functional Requirements

### 10.1 Performance
- **Response Time**: 
  - Login: <200ms (p95)
  - Token refresh: <100ms (p95)
  - Protected endpoints: <150ms (p95)
- **Throughput**: 
  - 1000 requests/second per instance
  - Horizontally scalable
- **Cache Hit Rate**: 
  - User cache: >80%
  - JWT validation cache: >90%
- **Database Queries**: 
  - <50ms (p95) for user lookup
  - <100ms (p95) for role/permission queries

### 10.2 Security
- **Password Storage**: Argon2 hashing (time cost: 3, memory cost: 64MB)
- **JWT Tokens**: 
  - Access token: 15 minutes expiry
  - Refresh token: 7 days expiry with rotation
  - HS256 algorithm with 256-bit secret
- **Rate Limiting**:
  - Login: 5 requests/minute per IP
  - Registration: 3 requests/hour per IP
  - Password reset: 3 requests/hour per email
  - MFA verification: 5 attempts/5 minutes
- **HTTPS**: Required in production (Fastify helmet plugin)
- **CORS**: Restrict to known origins (frontend URL only)
- **Session Security**:
  - HttpOnly cookies for refresh tokens
  - Secure flag in production
  - SameSite: Strict
- **Input Validation**: All endpoints use Fastify JSON schemas
- **SQL Injection**: N/A (Cosmos DB uses parameterized queries)
- **XSS Protection**: Auto-escaped by Fastify

### 10.3 Multi-Tenancy Constraints
- **Data Isolation**: 
  - Cosmos DB partition key = `tenantId`
  - All queries filtered by tenant
  - Redis keys prefixed with tenant
- **Tenant Quotas**:
  - Max users per tenant: 10,000 (configurable)
  - Max roles per tenant: 100
  - Max OAuth2 clients per tenant: 50
- **Tenant Independence**:
  - One tenant's actions never affect another
  - Tenant deletion cascades all related data
  - Tenant suspension blocks all access

### 10.4 Tenant Isolation
- **Database Level**: Partition key ensures data segregation
- **Cache Level**: Separate Redis keys per tenant
- **API Level**: All endpoints validate tenantId from JWT
- **Session Level**: Sessions tied to tenantId
- **Audit Level**: All logs include tenantId for traceability

### 10.5 Availability
- **Uptime SLA**: 99.9% (8.76 hours downtime/year)
- **Health Checks**: `/health` endpoint returns service status
- **Graceful Shutdown**: Clean up connections, close Redis, flush logs
- **Circuit Breakers**: Fail fast on external service failures (email, B2C)
- **Monitoring**: Azure Application Insights integration (already in main-api)

### 10.6 Scalability
- **Horizontal Scaling**: Stateless design (sessions in Redis)
- **Load Balancing**: Azure App Service or Kubernetes
- **Database**: Cosmos DB auto-scales throughput (RU/s)
- **Cache**: Redis cluster for high availability
- **Background Jobs**: Cleanup job runs independently per instance

### 10.7 Maintainability
- **Code Organization**: Services, controllers, routes separated
- **Type Safety**: Full TypeScript coverage
- **Linting**: ESLint configured
- **Testing**: 100% critical path coverage
- **Documentation**: JSDoc comments on all public APIs
- **Versioning**: Semantic versioning (SemVer)

---

## 11. Migration Risks & Mitigation

### 11.1 Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database connection conflicts | High | Low | Use separate connection pools, test thoroughly |
| Cache key collisions | Medium | Medium | Prefix all auth cache keys with `auth:` |
| Port conflicts during testing | Low | High | Update all tests to use port 3001 |
| Lost auth-broker data | High | Low | Backup Cosmos DB containers before migration |
| Performance degradation | High | Medium | Load test after migration, optimize slow queries |
| Breaking changes in frontend | High | Low | Update frontend simultaneously, test all flows |
| Incomplete feature migration | High | Low | Use this checklist to track all features |

### 11.2 Rollback Plan
1. Revert Git commit: `git revert HEAD`
2. Restore database backup if data migration occurred
3. Restart auth-broker service: `pnpm --filter @castiel/auth-broker dev`
4. Revert frontend changes: Update API URLs back to auth-broker
5. Validate with smoke tests

---

## 12. Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Preparation | 1 day | None |
| Phase 2: Dependencies | 2 hours | Phase 1 |
| Phase 3: Services | 2 days | Phase 2 |
| Phase 4: Cache | 1 day | Phase 3 |
| Phase 5: Middleware | 1 day | Phase 3, 4 |
| Phase 6: Controllers | 2 days | Phase 3, 4, 5 |
| Phase 7: Routes | 2 days | Phase 6 |
| Phase 8: Schemas/Types | 1 day | Phase 3 |
| Phase 9: Configuration | 1 day | All above |
| Phase 10: Server Init | 1 day | Phase 9 |
| Phase 11: Testing | 2 days | Phase 10 |
| Phase 12: Frontend | 1 day | Phase 11 |
| Phase 13: Cleanup | 2 hours | Phase 12 |

**Total Estimated Time**: 15-17 days (3-4 weeks with testing buffer)

---

## 13. Migration Checklist

### Services (21 files)
- [ ] user.service.ts
- [ ] email.service.ts
- [ ] session.service.ts
- [ ] token.service.ts
- [ ] token-blacklist.service.ts
- [ ] jwt-validation-cache.service.ts
- [ ] cleanup-job.service.ts
- [ ] user-cache.service.ts
- [ ] cosmos-db.service.ts
- [ ] tenant.service.ts
- [ ] user-management.service.ts
- [ ] session-management.service.ts
- [ ] mfa.service.ts
- [ ] mfa-audit.service.ts
- [ ] role-management.service.ts
- [ ] oauth.service.ts
- [ ] oauth2-client.service.ts
- [ ] oauth2-auth.service.ts
- [ ] sso-config.service.ts
- [ ] saml.service.ts
- [ ] index.ts

### Controllers (10 files)
- [ ] auth.controller.ts
- [ ] mfa.controller.ts
- [ ] oauth.controller.ts
- [ ] oauth2.controller.ts
- [ ] sso.controller.ts
- [ ] tenant.controller.ts
- [ ] user-management.controller.ts
- [ ] session-management.controller.ts
- [ ] role-management.controller.ts
- [ ] audit.controller.ts

### Routes (11 files)
- [ ] auth.routes.ts
- [ ] mfa.routes.ts
- [ ] oauth.routes.ts
- [ ] oauth2.routes.ts
- [ ] sso.routes.ts
- [ ] tenant.routes.ts
- [ ] user-management.routes.ts
- [ ] session-management.routes.ts
- [ ] role-management.routes.ts
- [ ] audit.routes.ts
- [ ] health.ts (update)

### Middleware (4 files)
- [ ] authenticate.ts
- [ ] rate-limit.ts
- [ ] session.ts
- [ ] error-handler.ts (merge)

### Cache (2 files)
- [ ] manager.ts
- [ ] index.ts (update)

### Configuration (3 files)
- [ ] env.ts (merge)
- [ ] key-vault.ts
- [ ] azure-b2c.ts

### Dependencies (package.json)
- [ ] @fastify/jwt
- [ ] @fastify/rate-limit
- [ ] @node-saml/passport-saml
- [ ] @sendgrid/mail
- [ ] argon2
- [ ] qrcode
- [ ] resend
- [ ] speakeasy
- [ ] xml2js

### Environment Variables
- [ ] JWT_SECRET
- [ ] JWT_ACCESS_TOKEN_EXPIRY
- [ ] JWT_REFRESH_TOKEN_EXPIRY
- [ ] RESEND_API_KEY
- [ ] AZURE_B2C_* (all variables)
- [ ] OAUTH_GOOGLE_* (all variables)
- [ ] OAUTH_GITHUB_* (all variables)
- [ ] EMAIL_FROM
- [ ] EMAIL_FROM_NAME

### Tests (66 test cases)
- [ ] Update BASE_URL to http://localhost:3001
- [ ] Run all auth tests
- [ ] Verify 100% pass rate
- [ ] Add integration tests

### Frontend Updates
- [ ] Update .env.local (single API_URL)
- [ ] Update api-client.ts (single client)
- [ ] Update all auth pages
- [ ] Test all auth flows from UI

### Documentation
- [ ] Update README.md
- [ ] Update architecture diagrams
- [ ] Update API documentation
- [ ] Update deployment guides

### Deployment
- [ ] Update Terraform configs
- [ ] Remove auth-broker App Service
- [ ] Update environment variables in Azure
- [ ] Deploy and test in staging

### Cleanup
- [ ] Delete auth-broker directory
- [ ] Update pnpm-workspace.yaml
- [ ] Update scripts (start-dev.sh, stop-dev.sh)
- [ ] Git commit and push
- [ ] Close GitHub issue/ticket

---

## 14. Success Metrics

### Migration Success
- ✅ Auth-broker directory deleted
- ✅ Only 2 services running (frontend + main-api)
- ✅ All 66 auth tests passing
- ✅ All auth features accessible via main-api
- ✅ Frontend functional with single API endpoint
- ✅ Zero security regressions

### Performance Benchmarks
- ✅ Login response time: <200ms (p95)
- ✅ No memory leaks (stable over 24 hours)
- ✅ Cache hit rate: >80%
- ✅ Throughput: >1000 req/sec

### Business Continuity
- ✅ Zero data loss
- ✅ Zero downtime for users (during staged rollout)
- ✅ All existing user sessions remain valid
- ✅ All OAuth2 clients continue working

---

## 15. Post-Migration Tasks

### Week 1
- [ ] Monitor error rates and performance metrics
- [ ] Review logs for any anomalies
- [ ] Gather user feedback on auth flows
- [ ] Fix any critical bugs immediately

### Week 2-4
- [ ] Optimize slow queries (if any)
- [ ] Increase cache hit rates
- [ ] Add additional monitoring/alerts
- [ ] Document lessons learned

### Long-term
- [ ] Plan horizontal scaling strategy
- [ ] Add more comprehensive audit logging
- [ ] Implement advanced security features (WebAuthn, passkeys)
- [ ] Consider rate limit optimization

---

## 16. Questions & Clarifications

If you encounter issues during migration, refer to:
1. Original auth-broker code (before deletion)
2. This TODO document
3. Test suite (validates expected behavior)
4. Git history: `git log --follow <file>`

**Need Help?**
- Review auth-broker implementation before deletion
- Check test cases for expected behavior
- Use Git to compare before/after

---

**END OF TODO - Auth-Broker to Main-API Migration**
