# Admin Role Implementation - Database Migration Guide

**Date**: 2025-01-27  
**Status**: Ready for Migration

---

## Schema Changes Summary

This migration adds support for multi-organization admin role management system.

### New Models
1. **OrganizationMembership** - Links users to organizations with roles
2. **Invitation** - Invitation system for adding users to organizations
3. **Session** - Session management for authentication and activity tracking

### Updated Models
1. **User** - Added fields for password auth, phone, soft delete, security
2. **Organization** - Added slug, settings, soft delete, member limits
3. **Role** - Made organization-scoped (added organizationId)
4. **AuditLog** - Added organizationId for organization context

---

## Migration Steps

### Step 1: Verify Schema

```bash
cd server
npx prisma format
npx prisma validate
```

### Step 2: Generate Migration

```bash
cd server
npx prisma migrate dev --name add_admin_role_system
```

This will:
- Create migration SQL files in `server/database/migrations/`
- Apply migrations to your development database
- Regenerate Prisma Client

### Step 3: Review Migration SQL

Before applying to production, review the generated migration SQL:
- Check for data loss risks
- Verify foreign key constraints
- Ensure indexes are created
- Check for any breaking changes

### Step 4: Apply to Production

```bash
cd server
npx prisma migrate deploy
```

---

## Schema Changes Details

### User Model Changes

**Added Fields:**
- `firstName` (String?, max 100 chars)
- `lastName` (String?, max 100 chars)
- `passwordHash` (String?, optional - supports OAuth-only users)
- `phoneNumber` (String?, E.164 format)
- `avatarUrl` (String?, alternative avatar field)
- `deletedAt` (DateTime?, soft delete)
- `failedLoginAttempts` (Int, default 0)
- `lockedUntil` (DateTime?, account lockout)
- `emailVerified` (Boolean, default false)

**New Relations:**
- `organizationMemberships` → OrganizationMembership[]
- `sentInvitations` → Invitation[] (as inviter)
- `receivedInvitations` → Invitation[] (as invitee)
- `sessions` → Session[]

### Organization Model Changes

**Added Fields:**
- `slug` (String, unique, 3-50 chars, lowercase alphanumeric + hyphens)
- `settings` (Json?, max 64KB)
- `deletedAt` (DateTime?, soft delete, reactivatable within 90 days)
- `maxMembers` (Int?, configurable member limit, null = unlimited)
- `subscriptionTier` (String?, future: free, pro, enterprise)

**New Relations:**
- `memberships` → OrganizationMembership[]
- `invitations` → Invitation[]
- `roles` → Role[] (organization-scoped roles)
- `auditLogs` → AuditLog[]

### New: OrganizationMembership Model

**Fields:**
- `id` (String, cuid)
- `organizationId` (String, FK to Organization)
- `userId` (String, FK to User)
- `roleId` (String?, FK to Role, null = default Member role)
- `status` (String, default "active": active, suspended, inactive)
- `lastAccessAt` (DateTime?, updated on every API call)
- `joinedAt` (DateTime, default now)
- `leftAt` (DateTime?, when user left)
- `deletedAt` (DateTime?, soft delete, permanent after 7 days)
- `createdAt`, `updatedAt` (DateTime)

**Constraints:**
- `@@unique([organizationId, userId])` - One active membership per user per organization
- Indexes on: organizationId, userId, roleId, status, deletedAt

### New: Invitation Model

**Fields:**
- `id` (String, cuid)
- `organizationId` (String, FK to Organization)
- `email` (String, email of invited user)
- `token` (String, unique, single-use)
- `roleId` (String?, FK to Role, null = default Member role)
- `status` (String, default "pending": pending, accepted, expired, cancelled)
- `expiresAt` (DateTime, default 7 days from creation)
- `acceptedAt` (DateTime?)
- `cancelledAt` (DateTime?)
- `customMessage` (String?, custom message from inviter)
- `inviterId` (String, FK to User, who sent invitation)
- `invitedUserId` (String?, FK to User, who accepted)
- `createdAt`, `updatedAt` (DateTime)

**Constraints:**
- `@@unique([organizationId, email, status])` - One pending invitation per email per organization
- Indexes on: organizationId, email, token, status, expiresAt

### New: Session Model

**Fields:**
- `id` (String, cuid)
- `userId` (String, FK to User)
- `token` (String, unique, JWT or session token)
- `refreshToken` (String?, unique, refresh token if using JWT)
- `deviceInfo` (String?, user agent, device type)
- `ipAddress` (String?)
- `lastActivityAt` (DateTime, default now, updated on every API call)
- `expiresAt` (DateTime)
- `rememberMe` (Boolean, default false, 30 days if true)
- `revokedAt` (DateTime?, when manually revoked)
- `createdAt`, `updatedAt` (DateTime)

**Constraints:**
- Indexes on: userId, token, expiresAt, revokedAt

### Role Model Changes

**Added Fields:**
- `organizationId` (String?, null = global/system role, otherwise org-scoped)
- `isArchived` (Boolean, default false, archive instead of delete)

**Changed Constraints:**
- `@@unique([organizationId, name])` - Unique name per organization (or globally if organizationId is null)

**New Relations:**
- `organization` → Organization? (optional, for org-scoped roles)
- `memberships` → OrganizationMembership[]
- `invitations` → Invitation[]

### AuditLog Model Changes

**Added Fields:**
- `organizationId` (String?, FK to Organization, organization context)

**New Relations:**
- `organization` → Organization?

**New Index:**
- Index on organizationId

---

## Data Migration Considerations

### Existing Data

1. **Existing Users:**
   - All existing users will have `deletedAt = null` (active)
   - `emailVerified = false` (will need verification flow)
   - `failedLoginAttempts = 0`
   - No passwordHash (OAuth users only)

2. **Existing Organizations:**
   - Need to generate `slug` from `name` for existing organizations
   - `deletedAt = null` (active)
   - `maxMembers = null` (unlimited)

3. **Existing Roles:**
   - All existing roles will have `organizationId = null` (global/system roles)
   - `isArchived = false`
   - These can be migrated to organization-scoped roles later

4. **Organization Memberships:**
   - Need to create OrganizationMembership records for existing organization creators
   - Assign Super Admin role to organization creators

### Migration Script Needed

After running Prisma migration, you may need to:

1. **Generate slugs for existing organizations:**
```sql
UPDATE "Organization" 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;
```

2. **Create memberships for organization creators:**
```sql
INSERT INTO "OrganizationMembership" (id, "organizationId", "userId", "roleId", status, "joinedAt", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  o.id,
  o."createdById",
  r.id,
  'active',
  o."createdAt",
  NOW(),
  NOW()
FROM "Organization" o
LEFT JOIN "Role" r ON r.name = 'Super Admin' AND r."organizationId" IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "OrganizationMembership" om 
  WHERE om."organizationId" = o.id AND om."userId" = o."createdById"
);
```

3. **Create Super Admin role if it doesn't exist:**
```sql
INSERT INTO "Role" (id, name, description, "isSystem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Super Admin', 'Full access to organization', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE name = 'Super Admin' AND "organizationId" IS NULL);
```

---

## Rollback Plan

If migration needs to be rolled back:

1. **Backup database before migration**
2. **Rollback steps:**
   - Drop new tables: OrganizationMembership, Invitation, Session
   - Remove new columns from User, Organization, Role, AuditLog
   - Restore from backup if needed

**Note:** This is a significant schema change. Ensure you have a database backup before applying.

---

## Verification Checklist

After migration:

- [ ] All tables created successfully
- [ ] All indexes created
- [ ] Foreign key constraints working
- [ ] Existing data preserved
- [ ] Organization slugs generated
- [ ] Organization memberships created for creators
- [ ] Super Admin role exists
- [ ] Prisma Client regenerated
- [ ] Application starts without errors
- [ ] API endpoints work correctly

---

## Next Steps After Migration

1. **Backend Services:**
   - OrganizationService
   - OrganizationMembershipService
   - InvitationService
   - SessionService
   - AuditLogService

2. **API Routes:**
   - `/api/organizations/*`
   - `/api/organizations/:orgId/members/*`
   - `/api/organizations/:orgId/invitations/*`
   - `/api/organizations/:orgId/roles/*`
   - `/api/sessions/*`

3. **Frontend Components:**
   - OrganizationSwitcher
   - UserManagementView
   - RoleManagementView
   - InvitationManagementView
   - AuditLogView

---

**Ready to proceed with migration generation.**
