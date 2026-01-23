# Database Schema

This document describes the database schema for the User Management System.

## Overview

The schema uses PostgreSQL with Prisma ORM. All timestamps are in UTC.

## Core Models

### User

User accounts in the system.

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
}
```

**Key Fields:**
- `email`: Unique identifier, used for login
- `passwordHash`: Bcrypt hash (nullable for OAuth-only users)
- `authProviders`: Array of linked providers
- `deletedAt`: Soft delete timestamp

**Relations:**
- `organizationMemberships`: User's organization memberships
- `sessions`: Active user sessions
- `invitations`: Invitations sent by user

### Organization

Organizations that users belong to.

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?  @db.VarChar(1000)
  logoUrl     String?
  ownerUserId String
  isActive    Boolean  @default(true)
  memberLimit Int?
  settings    Json?    // Organization-specific settings
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Key Fields:**
- `slug`: URL-friendly identifier (unique)
- `ownerUserId`: User who created the organization
- `memberLimit`: Optional limit on members
- `settings`: JSON field for flexible configuration

**Relations:**
- `memberships`: Organization memberships
- `roles`: Organization roles
- `invitations`: Organization invitations

### Role

Roles assigned to users within organizations.

```prisma
model Role {
  id            String   @id @default(cuid())
  organizationId String?
  name          String
  description   String?  @db.VarChar(500)
  isSystemRole  Boolean  @default(false)
  isCustomRole  Boolean  @default(false)
  isSuperAdmin  Boolean  @default(false)
  createdByUserId String?
  archivedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Key Fields:**
- `organizationId`: Null for system roles, set for organization roles
- `isSystemRole`: Built-in roles (Super Admin, Admin, Member, Viewer)
- `isCustomRole`: User-created roles
- `isSuperAdmin`: Grants all permissions

**Unique Constraint:**
- `organizationId_name`: Role names must be unique within organization

### Permission

System permissions that can be assigned to roles.

```prisma
model Permission {
  id                String   @id @default(cuid())
  code              String   @unique // e.g., "projects.project.create"
  displayName       String
  description       String?  @db.VarChar(500)
  module            String   // e.g., "projects"
  resource          String   // e.g., "project"
  action            String   // e.g., "create"
  scope             String?  // "all", "organization", "team", "own"
  isSystemPermission Boolean @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Key Fields:**
- `code`: Unique permission identifier (dot-separated)
- `scope`: Permission scope (all/organization/team/own)
- `isSystemPermission`: System-defined permissions

**Permission Code Format:**
```
{module}.{resource}.{action}
```

**Examples:**
- `projects.project.create`
- `users.user.read`
- `roles.role.update`

### RolePermission

Many-to-many relationship between roles and permissions.

```prisma
model RolePermission {
  id           String @id @default(cuid())
  roleId       String
  permissionId String
  createdAt    DateTime @default(now())
}
```

**Unique Constraint:**
- `roleId_permissionId`: Prevent duplicate assignments

### OrganizationMembership

Links users to organizations with a specific role.

```prisma
model OrganizationMembership {
  id            String    @id @default(cuid())
  userId        String
  organizationId String
  roleId        String
  status        String    @default("active") // active, invited, suspended, deactivated
  invitedByUserId String?
  invitedAt     DateTime?
  joinedAt      DateTime?
  lastAccessAt  DateTime?
  expiresAt     DateTime?
  leftAt        DateTime?
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

**Key Fields:**
- `status`: Membership status
- `lastAccessAt`: Last time user accessed organization (throttled updates)
- `deletedAt`: Soft delete for membership removal

**Unique Constraint:**
- `userId_organizationId`: User can only have one active membership per organization

### Invitation

Pending invitations to join organizations.

```prisma
model Invitation {
  id              String    @id @default(cuid())
  organizationId  String
  email           String
  roleId          String
  token           String    @unique
  invitedByUserId String
  message         String?   @db.VarChar(500)
  status          String    @default("pending") // pending, accepted, expired, cancelled
  expiresAt       DateTime
  acceptedAt      DateTime?
  resendCount     Int       @default(0)
  lastResentAt    DateTime?
  cancelledAt     DateTime?
  invitedUserId   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Key Fields:**
- `token`: Single-use invitation token
- `expiresAt`: Invitation expiration (default: 7 days)
- `resendCount`: Track resends (max 5)
- `invitedUserId`: User who accepted (if user existed)

### Session

Active user sessions.

```prisma
model Session {
  id              String    @id @default(cuid())
  userId          String
  organizationId  String?
  token           String    @unique
  refreshToken    String?   @unique
  deviceFingerprint String?
  ipAddress       String?
  userAgent       String?
  expiresAt       DateTime
  lastUsedAt      DateTime  @default(now())
  revokedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Key Fields:**
- `token`: JWT access token
- `refreshToken`: Long-lived refresh token
- `deviceFingerprint`: Device identification
- `organizationId`: Current organization context

### AuditLog

Audit trail of user and system actions.

```prisma
model AuditLog {
  id              String    @id @default(cuid())
  organizationId  String?
  userId          String
  action          String    // e.g., "user.created", "role.updated"
  resourceType    String    // e.g., "user", "role", "organization"
  resourceId      String?
  changes         Json?     // Before/after changes
  metadata        Json?     // Additional context
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime  @default(now())
}
```

**Key Fields:**
- `action`: Action performed
- `resourceType`: Type of resource affected
- `changes`: JSON object with before/after values
- `metadata`: Additional context (PII redacted)

## Indexes

### Performance Indexes

```prisma
// User
@@index([email])
@@index([googleId])
@@index([deletedAt])

// Organization
@@index([slug])
@@index([ownerUserId])
@@index([deletedAt])

// Role
@@index([organizationId])
@@unique([organizationId, name])

// Permission
@@index([code])
@@index([module, resource, action])

// OrganizationMembership
@@index([userId])
@@index([organizationId])
@@index([roleId])
@@index([status, deletedAt])
@@unique([userId, organizationId])

// Invitation
@@index([organizationId])
@@index([email])
@@index([token])
@@index([status, expiresAt])

// Session
@@index([userId])
@@index([token])
@@index([expiresAt])

// AuditLog
@@index([organizationId])
@@index([userId])
@@index([action])
@@index([resourceType, resourceId])
@@index([createdAt])
```

## Soft Deletes

Entities with soft delete support:
- **User**: `deletedAt`
- **Organization**: `deletedAt`
- **OrganizationMembership**: `deletedAt`

**Implementation**: Prisma Client Extensions automatically filter `deletedAt: null` in queries.

## Data Relationships

### User → OrganizationMembership → Organization

```
User (1) ──< OrganizationMembership (many) >── (1) Organization
```

A user can belong to multiple organizations, each with a different role.

### Role → RolePermission → Permission

```
Role (1) ──< RolePermission (many) >── (1) Permission
```

A role can have many permissions, and permissions can be assigned to many roles.

### Organization → Role

```
Organization (1) ──< Role (many)
```

An organization can have many roles (system and custom).

## Constraints

### Unique Constraints

- `User.email`: Email must be unique
- `User.googleId`: Google ID must be unique (if set)
- `Organization.slug`: Slug must be unique
- `Role.organizationId_name`: Role name unique within organization
- `Permission.code`: Permission code must be unique
- `OrganizationMembership.userId_organizationId`: One membership per user-org
- `Invitation.token`: Invitation token must be unique
- `Session.token`: Session token must be unique

### Foreign Key Constraints

All foreign keys have `onDelete: Cascade` or `onDelete: Restrict` as appropriate.

## Migration Strategy

See [Migration Guide](../../server/database/MIGRATION_GUIDE.md) for details on:
- Initial migration
- Data migration
- Rollback procedures

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Use soft deletes** instead of hard deletes when possible
3. **Index frequently queried fields**
4. **Use Prisma Client Extensions** for automatic filtering
5. **Validate data** at the service layer, not just database
6. **Use connection pooling** for production
7. **Monitor query performance** and optimize slow queries
