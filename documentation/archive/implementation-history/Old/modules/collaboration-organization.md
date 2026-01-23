# Collaboration & Organization Modules Documentation

**Last Updated:** 2025-01-27  
**Purpose:** Comprehensive documentation of the Collaboration & Organization modules implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Module Architecture](#module-architecture)
3. [Authentication & Authorization Module](#authentication--authorization-module)
4. [User & Team Management Module](#user--team-management-module)
5. [RBAC Module](#rbac-module)
6. [Organization Context Module](#organization-context-module)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Frontend Integration](#frontend-integration)
10. [Security Features](#security-features)
11. [Usage Examples](#usage-examples)

---

## Overview

The Collaboration & Organization modules provide the foundation for multi-user, multi-organization collaboration in the Coder IDE. These modules handle:

- **User Authentication**: Google OAuth 2.0 integration with JWT token management
- **User Management**: Profile management, session management, account operations
- **Team Management**: Hierarchical team structure with member management
- **Organization Management**: Multi-organization support with settings and memberships
- **Role-Based Access Control (RBAC)**: Fine-grained permission system with wildcard support
- **Organization Context**: Multi-organization switching and context management

### Key Features

- ✅ Google OAuth 2.0 authentication
- ✅ JWT token-based authentication with secure storage
- ✅ Multi-organization support
- ✅ Hierarchical team structure
- ✅ Role-based permissions with wildcard support
- ✅ Permission scoping (own/team/organization/all)
- ✅ Resource-level permissions
- ✅ Session management
- ✅ User profile management
- ✅ Organization settings management

---

## Module Architecture

### Component Structure

```
Collaboration & Organization Modules
├── Authentication & Authorization
│   ├── Backend: server/src/auth/
│   ├── Backend: server/src/middleware/auth.ts
│   ├── Backend: server/src/routes/auth.ts
│   ├── Frontend: src/renderer/contexts/AuthContext.tsx
│   └── IPC: src/main/ipc/authHandlers.ts
│
├── User & Team Management
│   ├── Backend: server/src/services/userService.ts
│   ├── Backend: server/src/routes/users.ts
│   ├── Backend: server/src/routes/teams.ts
│   └── Frontend: src/renderer/components/TeamManagementView.tsx
│
├── RBAC (Role-Based Access Control)
│   ├── Backend: server/src/middleware/rbac.ts
│   ├── Backend: server/src/services/permissionService.ts
│   └── Database: Permission, Role, RolePermission models
│
└── Organization Context
    ├── Backend: server/src/services/organizationService.ts
    ├── Backend: server/src/routes/organizations.ts
    └── Frontend: src/renderer/contexts/OrganizationContext.tsx
```

### Data Flow

```
User Request
    ↓
Authentication Middleware (JWT verification)
    ↓
RBAC Middleware (Permission check)
    ↓
Route Handler
    ↓
Service Layer (Business logic)
    ↓
Database (Prisma ORM)
    ↓
Response
```

---

## Authentication & Authorization Module

### Overview

Handles user authentication via Google OAuth 2.0 and JWT token management. Provides secure token storage, session management, and authentication middleware.

### Backend Implementation

#### Location
- **OAuth Setup**: `server/src/auth/GoogleOAuth.ts`
- **Auth Middleware**: `server/src/middleware/auth.ts`
- **Auth Routes**: `server/src/routes/auth.ts`

#### Key Components

**1. Google OAuth Integration** (`server/src/auth/GoogleOAuth.ts`)

```typescript
export function setupGoogleOAuth(fastify: FastifyInstance, config: GoogleOAuthConfig): void
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo>
```

- Configures Fastify OAuth2 plugin for Google
- Handles OAuth callback and user info retrieval
- Scopes: `openid`, `profile`, `email`

**2. Authentication Middleware** (`server/src/middleware/auth.ts`)

```typescript
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void>

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void>
```

**Features:**
- Extracts JWT token from `Authorization` header or cookies
- Verifies JWT token using Fastify JWT plugin
- Validates user exists in database
- Attaches `user` object to request: `{ id, email, name }`
- Returns 401 if authentication fails

**Token Extraction Priority:**
1. `Authorization: Bearer <token>` header
2. `accessToken` cookie

**3. Authentication Routes** (`server/src/routes/auth.ts`)

**OAuth Flow:**
```
GET /api/auth/google → Redirects to Google OAuth
GET /api/auth/google/callback → Handles OAuth callback
  → Creates/updates user
  → Generates JWT token
  → Sets cookie
  → Redirects to frontend with token
```

**User Management Endpoints:**
- `GET /api/auth/me` - Get current user with profile
- `POST /api/auth/logout` - Logout (revokes session)
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/providers` - Get linked auth providers
- `POST /api/auth/link-google` - Link Google account
- `POST /api/auth/unlink-provider` - Unlink provider
- `POST /api/auth/switch-organization` - Switch organization context

**JWT Token Structure:**
```typescript
{
  userId: string;
  email: string;
  // Optional: sessionId, organizationId
}
```

**Token Expiration:** 7 days (configurable via `JWT_EXPIRATION`)

### Frontend Implementation

#### Location
- **Auth Context**: `src/renderer/contexts/AuthContext.tsx`

#### Key Features

**AuthContext API:**
```typescript
interface AuthContextType {
  user: User | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}
```

**OAuth Flow:**
1. User clicks login → `login()` called
2. Opens Google OAuth URL in browser
3. User authenticates with Google
4. Callback redirects to app with token
5. Token extracted from URL or IPC event
6. Token stored securely via IPC
7. User data fetched and stored in context

**Token Storage:**
- Stored securely using Electron's `keytar` (via IPC)
- Persisted across app restarts
- Automatically included in API requests

**Organization Management:**
- Automatically loads user's organizations on login
- Restores last selected organization from localStorage
- Refreshes permissions when organization changes

---

## User & Team Management Module

### Overview

Manages user profiles, sessions, and team structures. Provides CRUD operations for users and teams with proper access control.

### User Management

#### Backend Services

**Location**: `server/src/services/userService.ts`

**Key Functions:**

```typescript
// Profile Management
getUserProfile(userId: string): Promise<UserProfile>
updateUserProfile(userId: string, updates: {...}): Promise<UserProfile>

// Password Management
changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>

// Session Management
listUserSessions(userId: string): Promise<UserSession[]>
revokeUserSession(userId: string, sessionId: string): Promise<void>
revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void>

// Account Management
deactivateUser(userId: string, deactivatedBy: string): Promise<void>
reactivateUser(userId: string, reactivatedBy: string): Promise<void>
deleteUser(userId: string, deletedBy: string): Promise<void>
```

**User Profile Fields:**
- `id`, `email`, `name`, `firstName`, `lastName`
- `phoneNumber` (E.164 format)
- `avatarUrl`, `picture`
- `isEmailVerified`, `isActive`
- `lastLoginAt`, `createdAt`, `updatedAt`
- `authProviders` (array: `['google', 'email']`)

**Account Lifecycle:**
1. **Active** → User can log in and use system
2. **Deactivated** → User cannot log in, sessions revoked
3. **Soft Deleted** → `deletedAt` set, 90-day grace period
4. **Hard Deleted** → Permanently removed after 90 days

**Access Control:**
- Users can manage their own profile
- Super Admins can deactivate/reactivate/delete other users
- Self-deactivation allowed

#### API Endpoints

**Location**: `server/src/routes/users.ts`

**Endpoints:**
- `PUT /api/users/me` - Update own profile
- `GET /api/users/me/sessions` - List own sessions
- `DELETE /api/users/me/sessions/:sessionId` - Revoke session
- `POST /api/users/me/sessions/revoke-all-others` - Revoke all other sessions
- `GET /api/users/me/organizations` - List user organizations
- `POST /api/users/me/deactivate` - Deactivate own account
- `POST /api/users/:userId/deactivate` - Deactivate user (Super Admin)
- `POST /api/users/:userId/reactivate` - Reactivate user (Super Admin)
- `DELETE /api/users/:userId` - Delete user (Super Admin, after 90 days)
- `GET /api/users/:userId/permissions` - Get user permissions

### Team Management

#### Backend Routes

**Location**: `server/src/routes/teams.ts`

**Team Structure:**
- Hierarchical teams (parent-child relationships)
- Teams belong to organizations
- Team members with roles
- Teams can have projects

**API Endpoints:**
- `GET /api/teams` - List teams user belongs to
- `POST /api/teams` - Create team (requires `teams.team.create` permission)
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add team member
- `DELETE /api/teams/:id/members/:userId` - Remove team member

**Team Fields:**
- `id`, `name`, `description`
- `parentTeamId` (for hierarchy)
- `organizationId`
- `createdById`
- `members` (TeamMember[])
- `projects` (Project[])

**Access Control:**
- Team creator can manage team
- Project Managers can manage teams
- Members can view team
- Cannot delete team with projects or subteams

**Team Member Roles:**
- `Project Manager` - Full team management
- `Developer` - Team member
- Custom roles (via RBAC)

---

## RBAC Module

### Overview

Role-Based Access Control system with fine-grained permissions, wildcard support, and resource-level permissions.

### Permission System

#### Permission Code Format

```
{module}.{resource}.{action}.{scope}
```

**Examples:**
- `projects.project.create` - Create projects
- `teams.team.read.all` - Read all teams
- `users.user.update.own` - Update own user
- `projects.*` - All project permissions (wildcard)

#### Permission Scopes

- **`all`** - No scope restriction
- **`organization`** - Within organization
- **`team`** - Within team
- **`own`** - Own resources only

#### Database Schema

**Permission Model:**
```prisma
model Permission {
  id                 String   @id
  module             String   // "projects", "teams", "users"
  resource           String   // "project", "team", "user"
  action             String   // "create", "read", "update", "delete"
  scope              String?  // "own", "team", "organization", "all"
  code               String   @unique // "projects.project.create"
  displayName        String
  description        String?
  isSystemPermission Boolean  @default(true)
}
```

**Role Model:**
```prisma
model Role {
  id            String   @id
  organizationId String?
  name          String
  isSuperAdmin  Boolean  @default(false)
  isSystemRole  Boolean  @default(false)
  isCustomRole  Boolean  @default(false)
  permissions   RolePermission[]
}
```

**RolePermission Model:**
```prisma
model RolePermission {
  id           String @id
  roleId       String
  permissionId String
  grantedAt    DateTime
  grantedByUserId String?
}
```

### Permission Service

#### Location
`server/src/services/permissionService.ts`

#### Key Functions

```typescript
// Permission Listing
listAllPermissions(): Promise<PermissionGroup[]>
getPermissionByCode(code: string): Promise<Permission | null>

// User Permissions (with caching)
getUserPermissions(userId: string, organizationId: string): Promise<string[]>

// Wildcard Resolution
resolveWildcardPermissions(permissions: string[]): Promise<string[]>

// Permission Checking
checkPermission(
  userId: string,
  organizationId: string,
  permissionCode: string,
  resourceId?: string
): Promise<boolean>

// Scope Checking
checkScope(
  permissionCode: string,
  resourceId: string | undefined,
  userId: string,
  organizationId: string
): Promise<boolean>
```

#### Permission Check Flow

```
1. Check if user is Super Admin → Allow (bypass)
2. Get user permissions (cached) → [permission codes]
3. Check wildcard match → matchesWildcard()
4. If match → Check scope (own/team/org/all)
5. If no match → Check resource-level permissions
6. Return result
```

#### Caching

- User permissions cached in Redis for 5 minutes
- Cache key: `user:permissions:{userId}:{organizationId}`
- Cache invalidation on role/permission changes
- Super Admin check bypasses cache

#### Wildcard Support

**Wildcard Patterns:**
- `*` - All permissions
- `projects.*` - All project module permissions
- `projects.project.*` - All project resource permissions
- `*.read` - All read permissions

**Matching Algorithm:**
- Exact match first (fast path)
- Wildcard `*` matches everything
- Pattern matching for partial wildcards
- Supports multi-level wildcards

### RBAC Middleware

#### Location
`server/src/middleware/rbac.ts`

#### Usage

```typescript
// Simple permission check
fastify.get('/api/projects', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.read.all')
  ],
  handler
});

// With resource type
fastify.put('/api/projects/:id', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.update.own', 'project')
  ],
  handler
});
```

**Permission Check Function:**
```typescript
export async function checkPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  check: PermissionCheck
): Promise<boolean>
```

**Features:**
- Extracts organization ID from request (params, body, or context)
- Extracts resource ID from params
- Calls permission service
- Returns 403 if permission denied
- Logs permission denials

### Super Admin

**Super Admin Role:**
- `isSuperAdmin: true` on Role model
- Bypasses all permission checks
- Has `*` (all permissions) in permission list
- Can manage all organizations

**Super Admin Check:**
```typescript
if (membership?.role.isSuperAdmin) {
  return true; // Bypass all checks
}
```

### Resource-Level Permissions

**ResourcePermission Model:**
```prisma
model ResourcePermission {
  id              String @id
  userId          String
  organizationId  String
  resourceType    String // "project", "team", etc.
  resourceId      String
  permissionLevel String // "owner", "editor", "viewer"
  expiresAt       DateTime?
}
```

**Union Approach:**
- Role permissions checked first
- If denied, check resource-level permissions
- Resource permissions can grant additional access
- Supports expiration for temporary access

---

## Organization Context Module

### Overview

Manages organization context, settings, memberships, and invitations. Provides multi-organization support with switching capabilities.

### Organization Service

#### Location
`server/src/services/organizationService.ts`

#### Key Functions

```typescript
// Organization CRUD
createOrganization(userId: string, name: string, slug?: string, description?: string): Promise<Organization>
updateOrganization(organizationId: string, userId: string, updates: {...}): Promise<Organization>
getOrganization(organizationId: string, userId?: string): Promise<Organization | null>
deactivateOrganization(organizationId: string, userId: string): Promise<void>

// Organization Lists
listUserOrganizations(userId: string, includeInactive?: boolean): Promise<Organization[]>

// Settings
getOrganizationSettings(organizationId: string): Promise<OrganizationSettings>
updateOrganizationSettings(organizationId: string, userId: string, settings: {...}): Promise<OrganizationSettings>
```

#### Organization Creation Flow

```
1. Validate name and generate slug
2. Check slug uniqueness
3. Create organization
4. Seed system roles (Super Admin, Admin, Member, Viewer)
5. Create membership for creator with Super Admin role
6. Return organization
```

#### Organization Fields

- `id`, `name`, `slug` (unique, URL-friendly)
- `description`, `logoUrl`
- `ownerUserId` (creator)
- `isActive`, `deletedAt` (soft delete)
- `memberLimit` (default: 500)
- `settings` (JSON, max 64KB)
- `subscriptionTier`, `subscriptionStatus`

#### Slug Generation

- Auto-generated from name if not provided
- Format: lowercase, alphanumeric, hyphens
- Validation: `isValidSlug()`
- Uniqueness check before creation

### Organization Membership

#### Membership Model

```prisma
model OrganizationMembership {
  id              String    @id
  userId          String
  organizationId  String
  roleId          String
  status          String    // "active", "inactive", "pending"
  joinedAt        DateTime
  invitedByUserId String?
  invitedAt       DateTime?
  expiresAt       DateTime?
}
```

#### Membership Status

- **`active`** - Active member, can access organization
- **`inactive`** - Inactive member, cannot access
- **`pending`** - Invitation pending acceptance

### Frontend Implementation

#### Location
`src/renderer/contexts/OrganizationContext.tsx`

#### OrganizationContext API

```typescript
interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  memberships: OrganizationMembership[];
  settings: OrganizationSettings | null;
  invitations: Invitation[];
  isLoading: boolean;
  error: string | null;
  
  // Loading
  loadOrganizations: () => Promise<void>;
  loadCurrentOrganization: (orgId: string) => Promise<void>;
  loadMemberships: (orgId: string) => Promise<void>;
  loadSettings: (orgId: string) => Promise<void>;
  loadInvitations: (orgId: string) => Promise<void>;
  
  // CRUD
  createOrganization: (org: {...}) => Promise<Organization | null>;
  updateOrganization: (orgId: string, updates: {...}) => Promise<void>;
  updateSettings: (orgId: string, settings: {...}) => Promise<void>;
  
  // Organization Switching
  switchOrganization: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

#### Organization Switching

**Flow:**
1. User selects organization
2. `switchOrganization(orgId)` called
3. Backend updates session with new `organizationId`
4. New JWT token issued with updated context
5. Frontend updates `currentOrganization`
6. Permissions refreshed for new organization
7. All subsequent requests use new organization context

**Implementation:**
```typescript
// Backend: server/src/routes/auth.ts
POST /api/auth/switch-organization
Body: { organizationId: string }
Response: { token: string } // New JWT with updated context
```

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String?
  name            String?
  firstName       String?
  lastName        String?
  avatarUrl       String?
  googleId        String?  @unique
  picture         String?
  isActive        Boolean  @default(true)
  isEmailVerified Boolean  @default(false)
  authProviders   String[] // ['google', 'email']
  deletedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  organizationMemberships OrganizationMembership[]
  sessions                Session[]
  profile                 UserProfile?
}
```

#### Organization
```prisma
model Organization {
  id                 String    @id @default(cuid())
  name               String
  slug               String    @unique
  description        String?
  logoUrl            String?
  ownerUserId        String
  isActive            Boolean   @default(true)
  settings           Json?      // Max 64KB
  subscriptionTier   String?
  subscriptionStatus String?
  memberLimit        Int       @default(500)
  deletedAt          DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  // Relations
  creator      User                       @relation("OrganizationCreator")
  memberships  OrganizationMembership[]
  roles        Role[]
  teams        Team[]
  invitations  Invitation[]
}
```

#### OrganizationMembership
```prisma
model OrganizationMembership {
  id              String    @id @default(cuid())
  userId          String
  organizationId  String
  roleId          String
  status          String    // "active", "inactive", "pending"
  joinedAt        DateTime
  invitedByUserId String?
  invitedAt       DateTime?
  expiresAt       DateTime?
  
  // Relations
  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])
  role         Role        @relation(fields: [roleId], references: [id])
}
```

#### Role
```prisma
model Role {
  id            String   @id @default(cuid())
  organizationId String?
  name          String
  description   String?
  isSystemRole  Boolean  @default(false)
  isCustomRole  Boolean  @default(false)
  isSuperAdmin  Boolean  @default(false)
  createdByUserId String?
  archivedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  organization        Organization?
  permissions        RolePermission[]
  memberships        OrganizationMembership[]
}
```

#### Permission
```prisma
model Permission {
  id                 String   @id @default(cuid())
  module             String   // "projects", "teams", "users"
  resource           String   // "project", "team", "user"
  action             String   // "create", "read", "update", "delete"
  scope              String?  // "own", "team", "organization", "all"
  code               String   @unique // "projects.project.create"
  displayName        String
  description        String?
  isSystemPermission Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  // Relations
  rolePermissions RolePermission[]
}
```

#### Team
```prisma
model Team {
  id            String   @id @default(cuid())
  name          String
  description   String?
  parentTeamId  String?
  organizationId String?
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  organization Organization? @relation(fields: [organizationId], references: [id])
  parentTeam   Team?          @relation("TeamHierarchy", fields: [parentTeamId], references: [id])
  subteams     Team[]         @relation("TeamHierarchy")
  members      TeamMember[]
  projects     Project[]
}
```

#### Session
```prisma
model Session {
  id              String    @id @default(cuid())
  userId          String
  organizationId  String?
  token           String    @unique
  deviceInfo      String?
  ipAddress       String?
  userAgent       String?
  isRememberMe   Boolean   @default(false)
  expiresAt       DateTime
  lastActivityAt DateTime?
  revokedAt      DateTime?
  createdAt       DateTime  @default(now())
  
  // Relations
  user User @relation(fields: [userId], references: [id])
}
```

### Indexes

**Performance Indexes:**
- `User.email` - Unique index
- `User.googleId` - Unique index
- `Organization.slug` - Unique index
- `Permission.code` - Unique index
- `OrganizationMembership(userId, organizationId, status)` - Composite index
- `Role(organizationId, name)` - Composite unique constraint

---

## API Endpoints

### Authentication Endpoints

**Base Path**: `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/google` | No | Initiate Google OAuth |
| GET | `/google/callback` | No | OAuth callback handler |
| GET | `/me` | Yes | Get current user |
| POST | `/logout` | Yes | Logout (revoke session) |
| POST | `/change-password` | Yes | Change password |
| GET | `/providers` | Yes | Get linked providers |
| POST | `/link-google` | Yes | Link Google account |
| POST | `/unlink-provider` | Yes | Unlink provider |
| POST | `/switch-organization` | Yes | Switch organization context |

### User Endpoints

**Base Path**: `/api/users`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| PUT | `/me` | Yes | - | Update own profile |
| GET | `/me/sessions` | Yes | - | List own sessions |
| DELETE | `/me/sessions/:sessionId` | Yes | - | Revoke session |
| POST | `/me/sessions/revoke-all-others` | Yes | - | Revoke all other sessions |
| GET | `/me/organizations` | Yes | - | List user organizations |
| POST | `/me/deactivate` | Yes | - | Deactivate own account |
| POST | `/:userId/deactivate` | Yes | Super Admin | Deactivate user |
| POST | `/:userId/reactivate` | Yes | Super Admin | Reactivate user |
| DELETE | `/:userId` | Yes | Super Admin | Delete user (after 90 days) |
| GET | `/:userId/permissions` | Yes | Self or Super Admin | Get user permissions |

### Team Endpoints

**Base Path**: `/api/teams`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List user's teams |
| POST | `/` | Yes | `teams.team.create` | Create team |
| GET | `/:id` | Yes | Team member | Get team details |
| PUT | `/:id` | Yes | Team creator/PM | Update team |
| DELETE | `/:id` | Yes | Team creator/PM | Delete team |
| POST | `/:id/members` | Yes | Team creator/PM | Add member |
| DELETE | `/:id/members/:userId` | Yes | Team creator/PM | Remove member |

### Organization Endpoints

**Base Path**: `/api/organizations`

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | Yes | - | List user organizations |
| POST | `/` | Yes | - | Create organization |
| GET | `/:id` | Yes | Member | Get organization |
| PUT | `/:id` | Yes | Owner/Super Admin | Update organization |
| DELETE | `/:id` | Yes | Owner/Super Admin | Deactivate organization |
| GET | `/:id/settings` | Yes | Member | Get settings |
| PUT | `/:id/settings` | Yes | Owner/Super Admin | Update settings |
| GET | `/:id/memberships` | Yes | Member | List memberships |
| POST | `/:id/memberships` | Yes | Owner/Super Admin | Create membership |
| PUT | `/:id/memberships/:membershipId` | Yes | Owner/Super Admin | Update membership |
| DELETE | `/:id/memberships/:membershipId` | Yes | Owner/Super Admin | Remove membership |

---

## Frontend Integration

### React Context Providers

**AuthContext** (`src/renderer/contexts/AuthContext.tsx`)
- Manages user authentication state
- Handles OAuth flow
- Manages organization context
- Provides permissions

**OrganizationContext** (`src/renderer/contexts/OrganizationContext.tsx`)
- Manages organization state
- Handles organization switching
- Manages memberships and settings

### IPC Communication

**Auth Handlers** (`src/main/ipc/authHandlers.ts`)
- `auth.login()` - Initiate OAuth
- `auth.logout()` - Logout
- `auth.getCurrentUser()` - Get current user
- `auth.setToken(token)` - Store token securely
- `auth.switchOrganization({ organizationId })` - Switch org

**Organization Handlers** (`src/main/ipc/organizationHandlers.ts`)
- `organization.list()` - List organizations
- `organization.get(id)` - Get organization
- `organization.create(data)` - Create organization
- `organization.update(id, data)` - Update organization
- `organization.getSettings(id)` - Get settings
- `organization.updateSettings(id, settings)` - Update settings

### Secure Token Storage

**Implementation:**
- Uses Electron's `keytar` for secure storage
- Tokens stored in OS credential store
- Platform-specific:
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: libsecret

**IPC Flow:**
```
Frontend → IPC → Main Process → keytar → OS Credential Store
```

---

## Security Features

### Authentication Security

1. **JWT Tokens**
   - Signed with secret key
   - Expiration: 7 days (configurable)
   - Stored securely in OS credential store
   - HttpOnly cookies for web

2. **OAuth 2.0**
   - Google OAuth with PKCE (if supported)
   - Secure token exchange
   - State parameter validation

3. **Session Management**
   - Multiple sessions per user
   - Session revocation
   - Device tracking
   - IP address logging
   - Last activity tracking

4. **Password Security**
   - Bcrypt hashing (10 rounds)
   - Password history (prevents reuse)
   - Password strength validation
   - HIBP integration (breach checking)

### Authorization Security

1. **RBAC**
   - Fine-grained permissions
   - Wildcard support with validation
   - Scope checking (own/team/org/all)
   - Resource-level permissions

2. **Super Admin**
   - Explicit `isSuperAdmin` flag
   - Bypass all permission checks
   - Audit logging for Super Admin actions

3. **Permission Caching**
   - Redis caching with TTL
   - Cache invalidation on changes
   - Prevents stale permissions

4. **Access Control**
   - Organization-scoped permissions
   - Team-scoped resources
   - Resource ownership checks
   - Soft delete protection

### Data Security

1. **Input Validation**
   - String sanitization
   - Email validation
   - URL validation
   - Phone number validation (E.164)

2. **SQL Injection Prevention**
   - Prisma ORM (parameterized queries)
   - No raw SQL queries

3. **XSS Prevention**
   - Input sanitization
   - Output encoding
   - CSP headers (if applicable)

4. **CSRF Protection**
   - SameSite cookies
   - Token validation (if applicable)

---

## Usage Examples

### Frontend: User Login

```typescript
import { useAuth } from './contexts/AuthContext';

function LoginButton() {
  const { login, isAuthenticated, user } = useAuth();
  
  if (isAuthenticated) {
    return <div>Logged in as {user?.email}</div>;
  }
  
  return <button onClick={login}>Login with Google</button>;
}
```

### Frontend: Organization Switching

```typescript
import { useAuth, useOrganization } from './contexts';

function OrganizationSwitcher() {
  const { organizations, currentOrganization, switchOrganization } = useAuth();
  const { loadMemberships, loadSettings } = useOrganization();
  
  const handleSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    await loadMemberships(orgId);
    await loadSettings(orgId);
  };
  
  return (
    <select 
      value={currentOrganization?.id} 
      onChange={(e) => handleSwitch(e.target.value)}
    >
      {organizations.map(org => (
        <option key={org.id} value={org.id}>{org.name}</option>
      ))}
    </select>
  );
}
```

### Backend: Protected Route

```typescript
import { authenticateRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

fastify.get('/api/projects', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.read.all')
  ],
  handler: async (request, reply) => {
    // User is authenticated and has permission
    const projects = await getProjects();
    return { projects };
  }
});
```

### Backend: Resource-Level Permission Check

```typescript
import { checkPermission } from '../services/permissionService';

async function updateProject(projectId: string, userId: string, organizationId: string, updates: any) {
  // Check permission with resource ID
  const hasPermission = await checkPermission(
    userId,
    organizationId,
    'projects.project.update.own',
    projectId // Resource ID for scope checking
  );
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // Update project...
}
```

### Backend: Create Organization

```typescript
import { createOrganization } from '../services/organizationService';

async function handleCreateOrganization(userId: string, name: string) {
  try {
    const org = await createOrganization(userId, name);
    // Organization created with:
    // - System roles seeded
    // - User added as Super Admin
    return org;
  } catch (error) {
    if (error.message.includes('slug')) {
      // Handle slug conflict
    }
    throw error;
  }
}
```

---

## Summary

The Collaboration & Organization modules provide a comprehensive foundation for multi-user, multi-organization collaboration:

- **Authentication**: Google OAuth 2.0 with JWT tokens and secure storage
- **User Management**: Profile management, sessions, account lifecycle
- **Team Management**: Hierarchical teams with member management
- **RBAC**: Fine-grained permissions with wildcards and scoping
- **Organization Context**: Multi-organization support with switching
- **Security**: Comprehensive security features and best practices

All modules are fully integrated with the frontend React context system and backend Fastify API, providing a seamless user experience with proper access control and security.
