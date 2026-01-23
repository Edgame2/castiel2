# Admin Role and User Management System - Implementation Analysis

**Date**: 2025-01-27  
**Status**: Analysis Complete - Ready for Implementation

---

## Current State Analysis

### Existing Infrastructure

1. **User Model**: Basic user model exists
   - Has: id, email, name, googleId, picture
   - Missing: passwordHash, phoneNumber, avatarUrl, deletedAt, failedLoginAttempts

2. **Organization Model**: Basic model exists
   - Has: id, name, description, createdById
   - Missing: slug, settings (JSON), deletedAt, maxMembers, subscriptionTier

3. **Role & Permission System**: Exists but is global, not organization-scoped
   - Roles are unique globally (name is unique)
   - Permissions are global
   - RBAC middleware exists but only checks project/team/user scoped permissions

4. **Missing Models**:
   - OrganizationMembership (users → organizations with roles)
   - Invitation
   - Session (likely using JWT, not stored)
   - AuditLog (referenced but model may not exist)

5. **Existing Routes**:
   - `/api/auth/*` - Authentication (OAuth, JWT)
   - `/api/users` - Empty (TODO)
   - `/api/roles` - Role management (global roles)
   - `/api/projects`, `/api/teams` - Project/team management

---

## Implementation Strategy

Given the comprehensive questions document, I recommend a **phased approach** with **reasonable defaults** for questions that don't have explicit requirements:

### Phase 1: Database Schema & Core Models
### Phase 2: Backend Services & API
### Phase 3: Frontend UI Components
### Phase 4: Integration & Testing

---

## Answers to Implementation Questions

### Section 1: Database Schema & Data Model

#### 1.1 User Model
- **passwordHash**: Optional (users can exist with only OAuth) ✅
- **Multiple auth methods**: Yes, support both OAuth and email/password ✅
- **firstName/lastName max length**: 100 characters (reasonable default)
- **phoneNumber format**: E.164 format validation
- **avatarUrl**: Support both external URLs and uploaded files
- **deletedAt records**: Soft delete, permanent deletion after 90 days (configurable)
- **Failed login attempts**: Yes, track and lockout after 5 attempts

#### 1.2 Organization Model
- **slug generation**: Auto-generated from name, editable after creation
- **slug validation**: Lowercase, alphanumeric + hyphens, 3-50 chars, unique per organization
- **slug editable**: Yes, but requires validation
- **settings JSON max size**: 64KB (reasonable limit)
- **max members**: Configurable per organization (default: unlimited)
- **subscription tiers**: Not in v1, but schema should support it
- **reactivation**: Yes, can be reactivated within 90 days

#### 1.3 OrganizationMembership Model
- **Multiple active memberships**: No, one active membership per user per organization
- **Suspended users**: Can view read-only content (no write operations)
- **lastAccessAt**: Updated on every API call (for activity tracking)
- **Membership history**: Yes, track role changes with audit log
- **Re-invitation**: Yes, if previous invitation expired
- **Grace period**: 7 days before permanent deletion

#### 1.4 Role Model
- **System roles**: Created per organization (not globally shared)
- **Custom role names**: Can have same name as system roles in different organizations
- **Max permissions**: No limit (but UI should warn if > 50)
- **Role archiving**: Yes, archive instead of delete
- **Role versioning**: Not in v1, but schema should support it
- **Role deletion**: Assign default role (Member) before deletion

#### 1.5 Permission Model
- **Permission scope**: Global (shared across all organizations)
- **Runtime permissions**: Fixed at deployment (permissions are code-defined)
- **Hierarchical permissions**: Yes, support wildcards (e.g., `projects.*`)
- **Permission conflicts**: Union (user has both = has both permissions)
- **Conditional permissions**: Not in v1 (future enhancement)
- **Permission templates**: Not in v1 (future enhancement)

#### 1.6 Invitation Model
- **Token type**: Single-use (invalidated after acceptance)
- **Default expiration**: 7 days
- **Resendable**: Yes, generates new token
- **Multiple invitations**: No, one pending invitation per email per organization
- **Acceptance history**: Yes, track in audit log
- **Custom messages**: Yes, support custom message from inviter

#### 1.7 Session Model
- **Storage**: Database (for audit and revocation capabilities)
- **Concurrent sessions**: 5 sessions per user (configurable)
- **Remember device**: Yes, support "remember me" (30 days)
- **Cleanup**: Automatic cleanup via cron job (daily)
- **Activity tracking**: Yes, track last API call timestamp

#### 1.8 AuditLog Model
- **Retention period**: 90 days (configurable per organization)
- **Archiving**: Yes, archive to cold storage after 90 days
- **Compression**: Not in v1 (future enhancement)
- **Sensitive data redaction**: Yes, redact passwords, tokens, API keys
- **Immutability**: Yes, no updates/deletes allowed

---

### Section 2: Permission System & RBAC

#### 2.1 Permission Structure
- **Wildcards**: Yes, `projects.*` grants all project permissions
- **Inheritance**: Explicit only (no automatic hierarchy)
- **Super Admin**: Special flag that bypasses all checks
- **Scope resolution**: own → team → organization → all
- **Resource-level overrides**: Not in v1 (future enhancement)

#### 2.2 Role Assignment
- **Multiple roles**: No, one role per user per organization
- **Permission resolution**: Union (if user had multiple roles, combine permissions)
- **Approval workflow**: Not in v1 (future enhancement)
- **Self-assignment**: No, requires admin permission
- **Expiration dates**: Not in v1 (future enhancement)

#### 2.3 Permission Checking
- **Caching**: Yes, cache for 5 minutes (Redis or in-memory)
- **Permission delegation**: Not in v1 (future enhancement)
- **Nested resources**: Inherit from parent (task inherits from project)
- **Conditional permissions**: Not in v1 (future enhancement)
- **Permission check logging**: Yes, log failed checks for debugging

#### 2.4 Super Admin vs Admin
- **Demotion**: Yes, Super Admin can be demoted (but requires another Super Admin)
- **Multiple Super Admins**: Yes, can have multiple
- **Detailed logging**: Yes, Super Admin actions logged with more detail
- **Ownership transfer**: Yes, Super Admin can transfer ownership
- **Last Super Admin**: Cannot leave until another Super Admin is assigned

---

### Section 3: User Management

#### 3.1 User CRUD Operations
- **Admin user creation**: Admins can create users directly (no invitation required)
- **Email verification**: Yes, require email verification before activation
- **User deletion**: Soft delete (deactivated), permanent after 90 days
- **Cascade deletion**: Yes, remove from all organizations on deletion
- **Reactivation**: Yes, reactivated users retain previous roles
- **Bulk import**: Not in v1 (future enhancement)

#### 3.2 User Profile Management
- **Self-editing**: Yes, users can edit their own profiles
- **Approval workflow**: Not in v1 (future enhancement)
- **Email change**: Requires admin approval or email verification
- **Profile pictures**: Support both upload and URL
- **Change history**: Yes, track in audit log

#### 3.3 User Activation/Deactivation
- **Suspended vs Deactivated**: 
  - Suspended: Temporary, can view read-only
  - Deactivated: Permanent, no access
- **Suspended access**: Yes, read-only access
- **Deactivation timing**: Immediate
- **Notifications**: Yes, send email notifications
- **Self-deactivation**: Yes, users can deactivate their own accounts

#### 3.4 Bulk Operations
- **Max batch size**: 100 users per operation
- **Asynchronous**: Yes, use background jobs for > 10 users
- **Progress tracking**: Yes, provide progress updates
- **Reversibility**: Not in v1 (future enhancement)
- **Confirmation**: Yes, require confirmation for destructive operations

---

### Section 4-20: Additional Decisions

**Key Decisions for v1:**
- **Organization switching**: Instant, remember last active org
- **Email service**: Use environment variable (SendGrid, AWS SES, SMTP)
- **Rate limiting**: Per-user and per-IP, configurable per organization
- **2FA**: Not in v1 (future enhancement)
- **API structure**: RESTful, organization-scoped endpoints
- **Testing**: Unit tests (80% coverage), integration tests, E2E tests
- **Documentation**: OpenAPI/Swagger for API docs

**Deferred to Future:**
- SSO/SAML
- Permission delegation
- Conditional permissions
- Role versioning
- Bulk import/export
- Advanced approval workflows

---

## Implementation Plan

### Step 1: Database Schema Updates
1. Update User model (add passwordHash, phoneNumber, etc.)
2. Update Organization model (add slug, settings, etc.)
3. Create OrganizationMembership model
4. Create Invitation model
5. Create Session model
6. Create/Update AuditLog model
7. Update Role model (make organization-scoped)
8. Create database migration

### Step 2: Backend Services
1. OrganizationService (CRUD, settings)
2. OrganizationMembershipService (join, leave, role assignment)
3. InvitationService (create, send, accept, cancel)
4. SessionService (create, validate, revoke)
5. AuditLogService (log, query, export)
6. PermissionService (check, cache)

### Step 3: API Routes
1. `/api/organizations/*` - Organization management
2. `/api/organizations/:orgId/members/*` - Member management
3. `/api/organizations/:orgId/invitations/*` - Invitation management
4. `/api/organizations/:orgId/roles/*` - Role management (org-scoped)
5. `/api/organizations/:orgId/audit-logs/*` - Audit log access
6. `/api/sessions/*` - Session management

### Step 4: Frontend Components
1. OrganizationSwitcher component
2. UserManagementView component
3. RoleManagementView component (org-scoped)
4. InvitationManagementView component
5. AuditLogView component
6. OrganizationSettingsView component

### Step 5: Integration & Testing
1. Update RBAC middleware for organization context
2. Update existing routes to require organization context
3. Add permission checks to all admin endpoints
4. Write unit tests
5. Write integration tests
6. Write E2E tests

---

## Next Steps

1. ✅ Analysis complete
2. ⏭️ Start with Step 1: Database Schema Updates
3. ⏭️ Create migration script
4. ⏭️ Implement backend services
5. ⏭️ Implement API routes
6. ⏭️ Implement frontend components

---

**Ready to proceed with implementation?** Let's start with the database schema updates.
