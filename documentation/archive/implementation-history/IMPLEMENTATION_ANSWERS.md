# Admin Role and User Management System - Implementation Answers
**Priority: Security & Flexibility**
**Migration Concern: Data loss acceptable**

---

## 1. Database Schema & Data Model

### 1.1 User Model
- **Should `passwordHash` be required for email/password users?** 
  - ✅ **No** - Make it nullable to support OAuth-only users. Use application-level validation to require it only when authentication method is email/password.

- **Should we support multiple authentication methods per user?**
  - ✅ **Yes** - Users should be able to link both Google OAuth AND email/password. This provides flexibility and prevents account lockout if one provider has issues. Add `authProviders` JSON field to track all linked methods.

- **What is the maximum length for `firstName` and `lastName`?**
  - ✅ **100 characters each** - Accommodates most international names while preventing abuse.

- **Should `phoneNumber` have format validation?**
  - ✅ **Yes, E.164 format** - Store in standardized format (e.g., +353871234567) for consistency. Validate on input, store without formatting.

- **Should `avatarUrl` support external URLs or only uploaded files?**
  - ✅ **Both** - Allow external URLs (OAuth profile pics) and uploaded files (self-hosted). Validate external URLs to prevent XSS/SSRF attacks. Set reasonable size limits (2MB) for uploads.

- **What happens to `deletedAt` records?**
  - ✅ **Keep for 90 days, then permanently delete** - Soft delete with grace period allows recovery from mistakes. After 90 days, run scheduled job to hard delete. Audit logs remain.

- **Should we track failed login attempts?**
  - ✅ **Yes, critical for security** - Track failed attempts in separate `login_attempts` table. Lock account after 5 failed attempts within 15 minutes. Unlock after 30 minutes or via password reset.

### 1.2 Organization Model
- **How should `slug` be generated?**
  - ✅ **Auto-generated from name, user can override** - Generate slug automatically (lowercase, hyphens, remove special chars). Allow manual override during creation. Example: "My Company" → "my-company"

- **What are the slug validation rules?**
  - ✅ **Lowercase alphanumeric + hyphens, 3-63 chars, globally unique** - Regex: `^[a-z0-9][a-z0-9-]*[a-z0-9]$`. No consecutive hyphens. Must start/end with alphanumeric.

- **Should `slug` be editable after creation?**
  - ✅ **Yes, but with caution** - Allow Super Admin to edit. Implement redirect from old slug to new slug for 90 days to prevent broken links. Warn about URL changes.

- **What is the maximum size for `settings` JSON field?**
  - ✅ **64KB (65,536 bytes)** - Sufficient for reasonable configs, prevents abuse. Validate JSON structure on save.

- **Should organizations have a maximum number of members?**
  - ✅ **Yes, 500 members initially** - Soft limit enforced in application. Configurable per organization for future scaling. Can be increased for specific orgs.

- **Should organizations have subscription/billing tiers?**
  - ✅ **Design schema to support it, implement later** - Add `subscription_tier` enum field (free, pro, enterprise) and `subscription_status` (active, cancelled, expired). Keep nullable for now.

- **Can organizations be reactivated after deletion?**
  - ✅ **Yes, within 30-day grace period** - Soft delete allows reactivation by Super Admin or owner within 30 days. After that, permanent deletion via scheduled job.

### 1.3 OrganizationMembership Model
- **Can a user have multiple active memberships in the same organization?**
  - ✅ **No** - One active membership per user per organization. Single role assignment keeps model simple and reduces permission resolution complexity. Unique constraint on (user_id, organization_id, status='active').

- **What happens when a user is "suspended"?**
  - ✅ **Complete access denial** - Suspended = locked out entirely. No read-only access. Clear distinction: suspended = temporary lockout, deactivated = soft delete (can reactivate).

- **Should `lastAccessAt` be updated on every API call?**
  - ✅ **No, update every 5 minutes maximum** - Prevents excessive DB writes. Use in-memory cache to track last update time per user/org. Only write to DB if >5 minutes since last update.

- **Should we track membership history?**
  - ✅ **Yes, via audit logs** - Don't create separate membership_history table. Audit logs capture all role changes with before/after values. Query audit logs for history.

- **Can a user be invited to the same organization multiple times?**
  - ✅ **Yes, but cancel previous pending invitations first** - When new invitation sent, auto-cancel any pending invitations for same email to same org. Prevents confusion.

- **Should there be a grace period before permanent deletion?**
  - ✅ **No** - When membership is removed, it's immediate. User loses access instantly. Soft delete membership record for audit trail (can query historical memberships).

### 1.4 Role Model
- **Should system roles be created per organization or globally shared?**
  - ✅ **Created per organization** - Each org gets its own copy of system roles (Super Admin, Admin, Member, Viewer) at creation time. Allows future customization per org while maintaining templates. Use `is_system_role=true` flag.

- **Can custom roles have the same name as system roles?**
  - ✅ **No** - Enforce unique names within an organization, including system role names. Prevents confusion. Validation: if creating custom role, check name doesn't match any existing role in org.

- **Should roles have a maximum number of permissions?**
  - ✅ **Yes, 100 permissions per role** - Reasonable limit prevents bloated roles. If role needs >100 permissions, it's poorly designed. Encourages proper role decomposition.

- **Can roles be archived instead of deleted?**
  - ✅ **Yes, add `archived_at` timestamp** - Archived roles cannot be assigned to new users but remain for historical reference. Active memberships with archived roles continue working. Provides soft-delete alternative.

- **Should roles have versioning?**
  - ✅ **No, use audit logs** - Versioning adds complexity. Audit logs track all permission changes to roles with timestamps and who made changes. Sufficient for historical tracking.

- **What happens to users when their role is deleted?**
  - ✅ **Prevent deletion, require reassignment first** - Before deleting role, check if any active memberships use it. If yes, return error with list of affected users. Admin must reassign users to different role before deletion.

### 1.5 Permission Model
- **Should permissions be global or organization-specific?**
  - ✅ **Global (shared across all organizations)** - Permissions are system-defined capabilities. All orgs use same permission set. Simplifies permission management and allows new permissions to be added system-wide. Roles are org-specific, permissions are global.

- **Can new permissions be added at runtime?**
  - ✅ **No, permissions are deployment-time fixed** - Permissions defined in code, seeded during deployment. Adding permissions requires code change + migration. This is intentional for security and consistency.

- **Should permissions support hierarchical structure?**
  - ✅ **Yes, with wildcards** - Support `projects.*` to grant all project permissions. Resolve hierarchically: `projects.*` includes `projects.project.create`, `projects.project.read.all`, etc. Implement careful validation to prevent overly broad grants.

- **How should permission conflicts be resolved?**
  - ✅ **Most permissive wins (union)** - If user has both `read.own` and `read.all`, grant `read.all`. Always favor broader access when permissions overlap. This is intuitive and secure (explicit grant philosophy).

- **Should permissions support conditions?**
  - ✅ **No, keep simple initially** - Conditional permissions (time-based, attribute-based) add significant complexity. Use scope levels (own/team/all) for now. Can add ABAC layer later if needed.

- **Should we support permission templates?**
  - ✅ **Yes, via system roles** - System roles (Admin, Member, Viewer) serve as templates. Users can clone these when creating custom roles. No separate template system needed.

### 1.6 Invitation Model
- **Should invitation tokens be single-use or multi-use?**
  - ✅ **Single-use** - Token invalidated immediately upon acceptance. More secure, prevents token sharing. User must request new invitation if token lost/expired.

- **What is the default expiration time?**
  - ✅ **7 days** - Balances security (tokens shouldn't live forever) with usability (enough time to accept). Configurable in env vars for flexibility.

- **Should invitations be resendable with new token?**
  - ✅ **Yes, generate new token** - Resend creates entirely new invitation with new token, old token invalidated. Tracks resend count and last resend time. Limit resends to 5 per invitation.

- **Can the same email be invited multiple times?**
  - ✅ **No, cancel previous pending invitation first** - Auto-cancel previous pending invitation when new one sent. Only one active pending invitation per email per org.

- **Should we track invitation acceptance history?**
  - ✅ **Yes, via audit logs** - Audit logs capture invitation sent, accepted, cancelled, expired events. No separate history table needed.

- **Should invitations support custom messages?**
  - ✅ **Yes, optional message field (500 chars max)** - Allow inviter to add personal message. Sanitize for XSS. Include in invitation email.

### 1.7 Session Model
- **Should sessions be stored in database or Redis?**
  - ✅ **Redis for active sessions, database for audit trail** - Redis for fast access, TTL management, and scalability. Write session creation/deletion events to DB audit log. Best of both worlds.

- **How many concurrent sessions allowed?**
  - ✅ **10 concurrent sessions** - Reasonable limit. Prevents abuse while allowing multiple devices (phone, laptop, tablet, etc.). Configurable per user if needed.

- **Should we support "remember device"?**
  - ✅ **Yes, extend session to 30 days** - "Remember me" checkbox extends session expiration from 8 hours to 30 days. Still require token refresh. Device fingerprinting for added security.

- **Should sessions be automatically cleaned up?**
  - ✅ **Both** - Redis TTL handles expiration automatically. Run daily cron job to clean up Redis expired keys and update DB audit trail. On-demand cleanup on user logout.

- **Should we track session activity?**
  - ✅ **Yes, track last API call** - Update `last_activity_at` in Redis every 5 minutes (throttled to reduce writes). Include in session list UI to show active sessions.

### 1.8 AuditLog Model
- **What is the default retention period?**
  - ✅ **90 days hot storage, 2 years cold storage** - Keep 90 days in primary database for fast queries. Archive to cold storage (S3/blob storage) for 2 years. After 2 years, permanent deletion (or keep indefinitely if compliance requires).

- **Should audit logs be archived to cold storage?**
  - ✅ **Yes, after 90 days** - Daily job moves logs >90 days old to cold storage (compressed JSON files in S3). Keeps primary DB lean. Provide UI to search cold storage when needed.

- **Should we support audit log compression?**
  - ✅ **Yes, compress in cold storage** - Use gzip compression for archived logs. Reduces storage costs significantly. Decompress on-demand when queried.

- **Should sensitive data be redacted?**
  - ✅ **Yes, critical for security** - Never log passwords, tokens, session IDs, API keys. Log password as `[REDACTED]`, tokens as `[TOKEN:last4chars]`. Sanitize PII based on GDPR requirements.

- **Should audit logs be immutable?**
  - ✅ **Yes, append-only** - No updates or deletes allowed in application code. Database triggers can enforce. Only scheduled archival jobs can move records. Critical for compliance and trust.

---

## 2. Permission System & RBAC

### 2.1 Permission Structure
- **Should permissions support wildcards?**
  - ✅ **Yes** - Support `projects.*` to grant all project-related permissions. Parse hierarchically during permission checks. Example: checking `projects.project.create` passes if user has `projects.*` or `projects.project.*`.

- **How should permission inheritance work?**
  - ✅ **Explicit hierarchical with wildcards** - Three-level hierarchy: `module.resource.action.scope`. Wildcards work at any level: `projects.*`, `projects.project.*`, `*.*.read`. Resolve from most specific to most general.

- **Should Super Admin bypass all checks or have explicit permissions?**
  - ✅ **Special flag that bypasses checks** - Add `is_super_admin` flag to role. Check this flag first in permission middleware. If true, grant all access. Simpler than maintaining explicit permissions. Still log all actions.

- **How should scope resolution work?**
  - ✅ **Most permissive wins** - If user has both `read.own` and `read.all`, apply `read.all`. Scope hierarchy: `own` < `team` < `organization` < `all`. Always grant broadest scope when multiple apply.

- **Should permissions support resource-level overrides?**
  - ✅ **Yes, implement resource_permissions table** - Allow granting specific user access to specific resource (e.g., User A can edit Project X even though their role doesn't allow it). Check resource-level permissions after role permissions. Union of both determines final access.

### 2.2 Role Assignment
- **Can a user have multiple roles in same organization?**
  - ✅ **No, single role per user per org** - Keeps model simple. If user needs additional permissions, either modify role or grant resource-level permissions. Multiple roles complicate permission resolution significantly.

- **How are permissions resolved with multiple roles?**
  - ✅ **N/A** - Single role model eliminates this. If implementing multiple roles later, use union (grant all permissions from all roles).

- **Should role changes require approval workflow?**
  - ✅ **No, immediate with audit trail** - Role changes take effect immediately. Heavily logged in audit trail. Approval workflows add complexity without clear security benefit for internal tools. Consider for enterprise tier later.

- **Can users self-assign roles?**
  - ✅ **No** - Only admins can assign roles. Prevents privilege escalation. If user needs access, they request it through admin (manual process initially, can add request workflow later).

- **Should role assignments have expiration dates?**
  - ✅ **No initially, design for it** - Add nullable `expires_at` field to membership table. Don't implement expiration logic yet. Can activate via cron job when needed for temporary access grants.

### 2.3 Permission Checking
- **Should permission checks be cached?**
  - ✅ **Yes, cache for 5 minutes** - Cache user permissions in Redis with 5-minute TTL. Invalidate cache on role change. Dramatically improves performance. Balance: freshness vs performance.

- **Should we support permission delegation?**
  - ✅ **No** - Delegation ("User A grants permission to User B") adds complexity and security risks. Use resource-level permissions instead for specific access grants.

- **How should permission checks work for nested resources?**
  - ✅ **Check parent permissions first** - For task (child of project), check: (1) user has task permission, (2) user has access to parent project. Both must pass. Implement recursive permission check utility.

- **Should we support conditional permissions?**
  - ✅ **Yes, via scope levels** - Scope provides basic conditions: `own` = owned by user, `team` = user's team, `all` = any in org. For complex conditions, use application logic not permission system.

- **Should permission checks be logged?**
  - ✅ **Only denied checks** - Log permission failures for debugging and security monitoring. Don't log successful checks (too noisy). Include: user, org, attempted action, reason for denial.

### 2.4 Super Admin vs Admin
- **Can Super Admin be demoted?**
  - ✅ **Yes, but require confirmation** - Super Admin can demote self or others. Show scary warning: "This will remove full access. Are you sure?" Prevent demoting last Super Admin (see below).

- **Can there be multiple Super Admins?**
  - ✅ **Yes, recommended** - Allow multiple Super Admins for redundancy. Best practice: 2-3 Super Admins in each organization. No artificial limit.

- **Should Super Admin actions be logged differently?**
  - ✅ **Yes, flag in audit logs** - Add `is_super_admin_action` boolean to audit log entries. Allows filtering/reporting on privileged actions. Include role at time of action.

- **Can Super Admin transfer ownership?**
  - ✅ **Yes** - Ownership is just metadata (`owner_user_id`). Super Admin can change it. New owner automatically gets Super Admin role if they don't have it. Log ownership changes prominently.

- **What happens if last Super Admin leaves?**
  - ✅ **Prevent leaving** - Check if user is last Super Admin before allowing leave/role change. Show error: "Cannot remove last Super Admin. Assign another Super Admin first." System-level protection.

---

## 3. User Management

### 3.1 User CRUD Operations
- **Can Admins create users directly?**
  - ✅ **No, only invite** - Users must sign up themselves (via invitation or self-registration). Prevents Admins from setting passwords for others. More secure. Exception: bulk import creates pending users (must verify email to activate).

- **Should user creation require email verification?**
  - ✅ **Yes, for email/password** - Send verification email immediately after signup. Account created but `is_email_verified=false` and `is_active=false`. Can't log in until verified. OAuth users skip this (email already verified by provider).

- **Can users be permanently deleted?**
  - ✅ **Yes, via API but discouraged** - Support hard delete for GDPR compliance. Warn about data loss. Recommended flow: deactivate → wait 90 days → permanent delete. Log deletion in audit logs before deleting user.

- **Should deletion cascade to all organizations?**
  - ✅ **Yes, remove from all orgs** - Deleting user removes all organization memberships. Cascade delete memberships, resource_permissions, invitations sent by user. Orphan detection: reassign owned resources to org owner or mark as deleted.

- **Can deactivated users be reactivated?**
  - ✅ **Yes** - Admins can reactivate deactivated users. Restore previous role in org. User keeps all historical data, resource ownerships, etc. Reset password required on first login after reactivation.

- **Should we support user import?**
  - ✅ **Yes, CSV import** - Admin can upload CSV with emails and roles. System creates pending invitations for all users. Bulk operation with progress tracking. Validate CSV first (check emails, roles exist). Limit 1000 users per import.

### 3.2 User Profile Management
- **Can users edit their own profiles?**
  - ✅ **Yes, limited fields** - Users can edit: first name, last name, avatar, phone. Cannot change: email (requires verification flow), role, status. Admins can edit all fields.

- **Should profile changes require approval?**
  - ✅ **No** - Profile changes immediate. Audit logged. Approval adds friction without clear benefit. Exception: email change requires verification.

- **Can users change their email?**
  - ✅ **Yes, with verification** - User initiates email change → verification email to new address → click link → email updated → old email notified. During verification window, old email still works. 24-hour timeout on pending change.

- **Should we support profile picture upload?**
  - ✅ **Yes, with size limits** - Support both upload (max 2MB, .jpg/.png only) and URL. Process uploads: resize to 400x400, compress, store in CDN/S3. Validate URLs to prevent SSRF attacks.

- **Should we track profile change history?**
  - ✅ **Yes, via audit logs** - All profile changes logged with before/after values. Users can view their own change history. Admins can view any user's history.

### 3.3 User Activation/Deactivation
- **What's the difference between suspended and deactivated?**
  - ✅ **Suspended = temporary, Deactivated = soft delete**
    - **Suspended:** Admin action, temporary lockout, can be unsuspended anytime. User data intact.
    - **Deactivated:** Like delete but reversible. Long-term removal. Can be reactivated but rare.
    - **Status values:** `active`, `suspended`, `deactivated`, `invited` (not yet accepted invitation)

- **Can suspended users access read-only content?**
  - ✅ **No** - Suspended = complete lockout. No access whatsoever. Check suspension status before any API call. Return 403 Forbidden if suspended.

- **Should deactivation be immediate or scheduled?**
  - ✅ **Immediate** - Takes effect instantly. All active sessions invalidated. User kicked out immediately. Log timestamp and who performed action.

- **Should we send notification emails?**
  - ✅ **Yes** - Email user when activated, deactivated, suspended, or unsuspended. Include reason if provided by admin. User should always know their account status changed.

- **Can users self-deactivate?**
  - ✅ **Yes, with confirmation** - Provide "Delete Account" option in user settings. Show warning about data loss, require password confirmation. Soft delete (deactivate) with 30-day recovery window. After 30 days, admin can permanently delete.

### 3.4 Bulk Operations
- **Maximum batch size?**
  - ✅ **1000 users** - Hard limit enforced in API. If more needed, split into multiple batches. Prevents timeouts and memory issues.

- **Should bulk operations be asynchronous?**
  - ✅ **Yes, via background jobs** - Queue bulk operations in job queue (Redis/Bull). Return job ID immediately. Provide status endpoint to check progress. Email user when complete.

- **Should we provide progress tracking?**
  - ✅ **Yes** - Store job progress in Redis: `{total: 1000, processed: 450, failed: 5, status: 'running'}`. API endpoint polls progress. Show progress bar in UI.

- **Should bulk operations be reversible?**
  - ✅ **No** - Undo adds complexity and isn't reliable (what if external side effects occurred?). Instead: show preview before execution, require confirmation, log everything for manual reversal if needed.

- **Should bulk operations require confirmation?**
  - ✅ **Yes** - Show preview: "This will change role for 237 users. Continue?" Require clicking "Yes, proceed" button. Log who authorized operation.

---

## 4. Organization Management

### 4.1 Organization Creation
- **Should creation require approval?**
  - ✅ **No, instant** - Users can create organizations immediately. Reduces friction. Can add quotas later (e.g., max 3 orgs per user) if abuse occurs.

- **Limit on organizations per user?**
  - ✅ **No hard limit initially** - Monitor usage. If abuse occurs, add soft limit of 10 orgs per user. Can be increased on request.

- **Should creation require payment?**
  - ✅ **No** - Free tier for all initially. Design schema to support billing later (subscription fields). Can add payment requirement for features like >100 members.

- **Can organizations be created via API?**
  - ✅ **Yes** - Provide REST API endpoint. Same validation as UI. Useful for automation, onboarding, integrations.

- **Should we support organization templates?**
  - ✅ **No initially, but design for it** - Templates (preconfigured settings, roles, sample data) add value but complexity. Add `template_id` nullable field to orgs table for future use.

### 4.2 Organization Settings
- **What settings should be configurable?**
  - ✅ **These settings:**
    - **General:** Name, logo, description, slug
    - **Branding:** Primary color, accent color (hex codes)
    - **Defaults:** Default role for new members, timezone, date format
    - **Features:** Enable/disable modules (if applicable)
    - **Notifications:** Email preferences for org-wide notifications
    - Store in `settings` JSON field

- **Should settings changes require approval?**
  - ✅ **No** - Immediate changes by Super Admin. Audit logged. Approval workflow overkill for settings.

- **Should we support setting inheritance?**
  - ✅ **No** - Flat organization structure, no parent/child orgs. No inheritance needed.

- **Should settings changes be versioned?**
  - ✅ **No, use audit logs** - Audit logs capture before/after state. Sufficient for history. Versioning adds complexity.

- **Can settings be exported/imported?**
  - ✅ **Yes, JSON export** - Super Admin can export settings as JSON file. Import validates and applies settings. Useful for templates, backups, cloning org config.

### 4.3 Organization Deactivation
- **Should deactivation be reversible?**
  - ✅ **Yes, 30-day grace period** - Soft delete org. All members lose access. Org marked `is_active=false` and `deleted_at` timestamp set. Can be reactivated within 30 days by Super Admin. After 30 days, permanent deletion.

- **What happens to user data when org deactivated?**
  - ✅ **Preserved until permanent deletion** - Organization data intact but inaccessible. Members' accounts still exist, just lose access to this org. After 30-day grace period, permanently delete org and all related data (projects, tasks, etc.). Users remain.

- **Should we send notifications before deactivation?**
  - ✅ **Yes** - Email all members when org is deactivated. Include: who deactivated it, when, 30-day recovery window info, contact info for questions.

- **Grace period before permanent deletion?**
  - ✅ **Yes, 30 days** - Scheduled job runs daily to permanently delete orgs where `deleted_at` > 30 days ago. Final warning email sent 7 days before permanent deletion.

- **Can organizations be archived?**
  - ✅ **Yes, same as soft delete** - "Archive" is just friendlier term for deactivation. Same mechanism: `is_active=false`, `deleted_at` timestamp.

### 4.4 Organization Ownership
- **Can ownership be transferred?**
  - ✅ **Yes** - Super Admin can change `owner_user_id`. New owner automatically gets Super Admin role. Old owner keeps their current role (doesn't lose Super Admin unless explicitly changed). Log transfers prominently.

- **What if owner account is deleted?**
  - ✅ **Transfer ownership first** - Before deleting user, check if they own any orgs. If yes, prompt to transfer ownership. Cannot delete user if they're sole owner. Alternative: auto-transfer to oldest Super Admin in org.

- **Should ownership transfer require approval?**
  - ✅ **No, but require confirmation** - Immediate transfer with scary warning and confirmation dialog. Email both parties (old and new owner) when transfer occurs.

- **Can there be co-owners?**
  - ✅ **No** - Single owner model simpler. Multiple Super Admins provide effective co-ownership. Owner field is mostly metadata; Super Admins have same permissions.

---

## 5. Invitation System

### 5.1 Invitation Flow
- **Should invitations work for both existing and new users?**
  - ✅ **Yes, unified flow**
    - **Existing user:** Click invite link → auto-detect email → add to org immediately → success
    - **New user:** Click invite link → signup flow → email verification → add to org → success
    - Store invited email in invitation, match on email after signup

- **Should we support invitation links without email?**
  - ✅ **No initially** - Email-based invitations more secure (can track who was invited). Anonymous invite links (join.example.com/abc123) useful for open communities but not for controlled access. Add later if needed.

- **Should invitations be automatically sent or require manual send?**
  - ✅ **Automatic** - Creating invitation immediately sends email. Reduces steps. Admin can mark "don't send email" if they want to send link manually (e.g., via Slack).

- **Should we support invitation expiration extension?**
  - ✅ **No, resend instead** - Extending expiration adds state management complexity. Better UX: "Invitation expired? Request new one." Clicking resend auto-invalidates old token and sends new 7-day invitation.

### 5.2 Invitation Email
- **What should invitation email contain?**
  - ✅ **Include:**
    - Inviter name and organization name
    - Role being assigned
    - Custom message (if provided)
    - Accept invitation button/link (with token)
    - Expiration date (7 days from sent)
    - "Not you? Ignore this email" footer

- **Should invitation emails be branded?**
  - ✅ **Yes** - Use organization logo and colors from settings. Makes emails feel more official and reduces confusion (clear which org is inviting).

- **Should we support invitation email templates?**
  - ✅ **Yes** - Create default template with variables (inviter_name, org_name, role, message, etc.). Super Admin can customize per-org templates later (advanced feature).

### 5.3 Bulk Invitations
- **Should we support bulk invitations?**
  - ✅ **Yes, CSV upload** - Upload CSV with columns: email, role, custom_message (optional). Validate all rows before processing. Show preview. Queue as background job. Email summary when complete (X invited, Y failed with reasons).

- **Should bulk invitations be rate-limited?**
  - ✅ **Yes** - Limit 1000 invitations per batch. Max 3 bulk invitation jobs per day per org (prevents spam). Use email rate limiting to avoid being flagged as spam (stagger emails over 10-15 minutes).

- **Should we validate emails before sending?**
  - ✅ **Yes** - Validate email format. Optionally: check DNS MX records (catches many typos). Don't send if validation fails. Include in bulk invite report.

### 5.4 Invitation Management
- **Who can invite users?**
  - ✅ **Admins and Super Admins only** - Require `users.user.invite` permission. Prevents regular members from adding users (security).

- **Should we show pending invitations list?**
  - ✅ **Yes** - Admin panel page listing all pending invitations with: email, role, invited by, invited date, expiration, actions (resend, cancel). Filter by status, search by email.

- **Should invited users receive reminders?**
  - ✅ **Yes, optional** - Send reminder email 24 hours before expiration. Configurable per-org (some orgs find it annoying). Include "Accept now" link and mention it expires soon.

- **Should we track who accepted invitations?**
  - ✅ **Yes, via audit logs** - Log invitation events: sent, accepted, expired, cancelled, resent. Track acceptance rate metrics (for admin reporting).

---

## 6. Session Management

### 6.1 Session Storage
- **What should session contain?**
  - ✅ **Session data:**
    ```json
    {
      "session_id": "uuid",
      "user_id": "uuid",
      "organization_id": "uuid", // current active org
      "role_id": "uuid",
      "created_at": "timestamp",
      "expires_at": "timestamp",
      "last_activity_at": "timestamp",
      "ip_address": "string",
      "user_agent": "string",
      "device_fingerprint": "string",
      "is_remember_me": "boolean"
    }
    ```

- **Should sessions be bound to IP address?**
  - ✅ **No** - Users often change IPs (mobile networks, VPNs). IP binding causes frustrating logouts. Store IP for audit but don't validate on each request.

- **Should sessions be bound to device?**
  - ✅ **Yes, loosely** - Generate device fingerprint (browser type, OS, screen resolution - not stored, just hashed). If fingerprint changes dramatically, prompt for re-authentication. Not strict binding (fingerprints change legitimately).

### 6.2 Session Security
- **Should we implement session rotation?**
  - ✅ **Yes, on privilege escalation** - Rotate session ID (issue new token) when: user changes role, switches organization, changes password. Prevents session fixation attacks.

- **Should sessions be revokable remotely?**
  - ✅ **Yes** - User can view all active sessions in settings. Can revoke any session (logs that device out). "Revoke all other sessions" button useful after password change.

- **Should we detect session hijacking?**
  - ✅ **Yes, basic detection** - Compare device fingerprint, flag if dramatically different. Compare IP geolocation, flag if user suddenly in different country. Show warning, require re-authentication if suspicious.

- **Should sessions be tied to organization?**
  - ✅ **Yes** - Session includes current active organization. Switching orgs updates session. Middleware validates user has active membership in session's org.

### 6.3 Token Management
- **Should we use JWT or session tokens?**
  - ✅ **JWT** - Stateless, scalable. Store minimal claims: user_id, org_id, role_id, expiration. Sign with HS256 (symmetric). Store in httpOnly secure cookie + Authorization header support for API.

- **Should JWT be refreshable?**
  - ✅ **Yes, refresh token pattern** - Short-lived access token (8 hours), long-lived refresh token (30 days if remember_me, else 8 hours). Access token in cookie, refresh token in secure httpOnly cookie. Endpoint: POST /auth/refresh.

- **Should we maintain a token blacklist?**
  - ✅ **Yes, in Redis** - When user logs out or session revoked, add token to blacklist (Redis set with TTL = token expiration time). Check blacklist on each request. Auto-expires when token would naturally expire.

---

## 7. Audit Logging

### 7.1 What to Log
- **Should we log all API requests?**
  - ✅ **No, too noisy** - Log only: authentication events, user/role/permission changes, organization changes, resource creation/modification/deletion, permission checks (failures only), bulk operations, settings changes. Don't log: GET requests, health checks, static assets.

- **Should we log read operations?**
  - ✅ **No, except sensitive data access** - Don't log normal reads (too much data). DO log: viewing audit logs, accessing user list, exporting data. Focus on writes and privileged reads.

- **What detail level for logs?**
  - ✅ **Include:**
    - Who (user_id, username, email)
    - What (action type, resource type, resource ID)
    - When (timestamp with timezone)
    - Where (IP address, user agent)
    - Context (organization_id, role at time of action)
    - Changes (before/after values in JSON)
    - Result (success/failure, error message if failed)

### 7.2 Audit Log Access
- **Who can view audit logs?**
  - ✅ **Admins and Super Admins only** - Require `audit.logs.read` permission. Regular members cannot view audit logs (privacy concern).

- **Should users see their own activity?**
  - ✅ **Yes, separate endpoint** - Users can view their own activity log (filtered to just their actions). Different from full audit log (which includes all users).

- **Should audit logs be exportable?**
  - ✅ **Yes** - Export as CSV or JSON. Filter by date range, user, action type before exporting. Limit exports to 90 days of data at a time (prevents huge files). Async job for large exports.

- **Should we provide audit log search?**
  - ✅ **Yes** - Full-text search on: user email, action, resource ID. Filter by: date range, user, action type, resource type, success/failure. Pagination required (large datasets).

### 7.3 Audit Log Compliance
- **Should audit logs be tamper-proof?**
  - ✅ **Yes** - Database triggers prevent updates/deletes. Only INSERT allowed. Append-only table. For compliance, can implement cryptographic signatures on each log entry (hash chain - each log references hash of previous log).

- **Should we support audit log export for compliance?**
  - ✅ **Yes** - Super Admin can export full audit history (including cold storage) for compliance audits. Provides signed report with timestamps and hashes. Format: JSON with digital signature.

- **Should audit logs be queryable after archival?**
  - ✅ **Yes, but slower** - Recent logs (90 days) in database = fast queries. Archived logs in S3 = slower queries (decompress, parse, search). Provide separate "Search archived logs" feature with warning about performance.

---

## 8. Error Handling

### 8.1 Error Responses
- **What error format?**
  - ✅ **RFC 7807 (Problem Details)**
    ```json
    {
      "type": "https://api.example.com/errors/permission-denied",
      "title": "Permission Denied",
      "status": 403,
      "detail": "You don't have permission to perform this action",
      "instance": "/api/organizations/123/members/456",
      "trace_id": "uuid",
      "timestamp": "2026-01-16T10:30:00Z"
    }
    ```

- **Should errors expose internal details?**
  - ✅ **No** - Generic messages in production. Detailed errors in development only. Example: Don't say "User with ID 123 not found" → say "User not found". Log details server-side.

- **Should we use error codes?**
  - ✅ **Yes** - Enum of error codes: `USER_NOT_FOUND`, `PERMISSION_DENIED`, `INVALID_INPUT`, `ORG_NOT_FOUND`, etc. Helps client-side error handling and internationalization.

### 8.2 Validation Errors
- **What format for validation errors?**
  - ✅ **Field-level errors**
    ```json
    {
      "type": "validation-error",
      "title": "Validation Failed",
      "status": 400,
      "errors": {
        "email": ["Email is required", "Email must be valid"],
        "password": ["Password must be at least 8 characters"]
      }
    }
    ```

- **Should we validate on client and server?**
  - ✅ **Both** - Client validation for UX (immediate feedback). Server validation for security (never trust client). Server is source of truth.

### 8.3 Rate Limiting Errors
- **How to handle rate limit exceeded?**
  - ✅ **Return 429 with retry info**
    ```json
    {
      "type": "rate-limit-exceeded",
      "title": "Too Many Requests",
      "status": 429,
      "detail": "You've exceeded the rate limit. Please try again later.",
      "retry_after": 60
    }
    ```
    Include `Retry-After` header with seconds until reset.

---

## 9. API Design

### 9.1 API Versioning
- **Should API be versioned?**
  - ✅ **Yes, URL versioning** - `/api/v1/organizations`. Clearest approach. Version in URL, not header. Major versions only (v1, v2). Maintain v1 for 1 year after v2 released.

- **Should we support multiple versions?**
  - ✅ **Yes, 2 versions maximum** - Current version + previous version. Forces clients to upgrade. After 1 year, deprecate old version with warning headers.

### 9.2 API Authentication
- **How should API authenticate?**
  - ✅ **JWT in Authorization header** - `Authorization: Bearer <jwt_token>`. Also support cookie-based auth for browser clients. Token from `/auth/login` endpoint.

- **Should we support API keys?**
  - ✅ **Not initially** - JWT sufficient for now. API keys useful for service-to-service auth. Add later if needed for integrations.

### 9.3 API Pagination
- **What pagination strategy?**
  - ✅ **Cursor-based pagination** - More reliable than offset pagination (handles inserts/deletes during pagination). Return: `{data: [], next_cursor: "abc", has_more: true}`. Default page size: 25, max: 100.

- **Should we support sorting?**
  - ✅ **Yes** - Query params: `?sort_by=created_at&sort_order=desc`. Support sorting on: created_at, updated_at, name, email (depending on resource).

### 9.4 API Filtering
- **Should we support filtering?**
  - ✅ **Yes** - Query params for filters: `?status=active&role=admin`. Support logical operators: `?created_after=2026-01-01&created_before=2026-12-31`.

- **Should we support complex queries?**
  - ✅ **No initially** - Simple filters sufficient. If complex queries needed later, consider GraphQL or query DSL.

---

## 10. Security

### 10.1 Input Validation
- **How to prevent SQL injection?**
  - ✅ **Parameterized queries only** - Never concatenate SQL strings. Use ORM or prepared statements. Input validation is defense in depth, not primary protection.

- **How to prevent XSS?**
  - ✅ **Output encoding** - Escape HTML, JavaScript, CSS context appropriately. Use templating engine with auto-escaping. CSP headers. Sanitize rich text input (if any).

- **How to prevent CSRF?**
  - ✅ **SameSite cookies + CSRF tokens** - Set `SameSite=Lax` on session cookies. For state-changing operations, require CSRF token in header (generated per session). Double submit cookie pattern.

### 10.2 Password Security
- **Password hashing algorithm?**
  - ✅ **Bcrypt with cost factor 12** - Industry standard. Resistant to rainbow tables and brute force. Increase cost factor over time as hardware improves.

- **Password requirements?**
  - ✅ **Minimum 8 characters** - Don't enforce complexity rules (actually reduces security - users create predictable passwords). Consider passwordless options (magic links) later.

- **Should we check against breached passwords?**
  - ✅ **Yes** - Use HaveIBeenPwned API (k-anonymity model - doesn't expose full password). Reject passwords in breach database. Check on signup and password change.

### 10.3 Rate Limiting
- **What endpoints need rate limiting?**
  - ✅ **All endpoints** - Different limits per endpoint type:
    - Login: 5 attempts per 15 min per IP
    - Password reset: 3 attempts per hour per email
    - API writes: 100 per minute per user
    - API reads: 1000 per minute per user
    - Invitation sends: 100 per hour per org

- **How to implement rate limiting?**
  - ✅ **Redis sliding window** - Use Redis sorted sets for sliding window counter. More accurate than fixed window. Key: `ratelimit:{endpoint}:{identifier}`, score: timestamp.

### 10.4 Authorization
- **How to prevent privilege escalation?**
  - ✅ **Validate every request** - Check user's current role + permissions on every API call. Don't trust client. Don't cache authorization decisions for writes. Cache reads for 5 min max.

- **How to prevent horizontal privilege escalation?**
  - ✅ **Organization scoping** - Every query includes organization_id. Middleware ensures user has membership in requested org. Row-level security in database if using PostgreSQL.

- **How to prevent IDOR?**
  - ✅ **UUIDs + permission checks** - Use UUIDs instead of sequential IDs (harder to guess). Always check user has permission to access requested resource. Return 404 instead of 403 for resources user shouldn't know exist.

---

## 11. Performance

### 11.1 Database Optimization
- **What indexes needed?**
  - ✅ **Critical indexes:**
    - users: (email), (is_active, deleted_at)
    - organizations: (slug), (owner_user_id), (is_active, deleted_at)
    - organization_memberships: (user_id, organization_id), (organization_id, role_id), (status)
    - roles: (organization_id, name), (is_system_role)
    - permissions: (code), (module, resource, action)
    - invitations: (token), (email, organization_id, status)
    - audit_logs: (organization_id, created_at), (user_id, created_at), (action, created_at)

- **Should we use connection pooling?**
  - ✅ **Yes** - Configure connection pool size based on expected load. Start with: min 10, max 100 connections. Monitor and adjust.

- **Should we use read replicas?**
  - ✅ **Not initially** - Single DB instance sufficient for hundreds of users. Add read replicas when read load increases. Route read queries to replicas, writes to primary.

### 11.2 Caching Strategy
- **What should be cached?**
  - ✅ **Cache:**
    - User permissions (5 min TTL)
    - User's organization memberships (5 min TTL)
    - Organization settings (10 min TTL)
    - Role definitions (10 min TTL)
    - Permission definitions (never expire, refresh on deploy)

- **What caching strategy?**
  - ✅ **Cache-aside with Redis** - Application checks cache first, DB on miss. Write-through on updates (update DB then invalidate cache). Use cache key namespacing: `permissions:{user_id}:{org_id}`.

- **Should we cache API responses?**
  - ✅ **Yes, for reads** - Cache GET requests with appropriate TTL. Use ETag/If-None-Match for conditional requests. Don't cache personalized or permission-based responses.

### 11.3 Query Optimization
- **Should we use eager loading?**
  - ✅ **Yes** - Use JOIN or separate queries to load related data in single round trip. Example: loading user also loads their memberships and roles. Prevents N+1 queries.

- **Should we use database views?**
  - ✅ **No initially** - Views add abstraction complexity. Use them later for complex, frequently-used queries. Start with simple queries + caching.

### 11.4 Background Jobs
- **What should run as background jobs?**
  - ✅ **Jobs:**
    - Send invitation emails
    - Bulk operations (import users, bulk role changes)
    - Audit log archival (daily)
    - Session cleanup (daily)
    - Permanent deletion of soft-deleted records (daily)
    - Generate reports/exports

- **What job queue system?**
  - ✅ **Bull (Redis-backed)** - Reliable, features (retries, priorities, scheduling), good observability. Alternative: BullMQ (TypeScript-native).

---

## 12. Email System

### 12.1 Email Service
- **What email service provider?**
  - ✅ **SendGrid or AWS SES** - Reliable, scalable, good deliverability. SendGrid easier to set up. SES more cost-effective at scale.

- **Should we queue emails?**
  - ✅ **Yes** - Don't send emails synchronously. Queue via background job. Prevents API delays if email service is slow. Allows retries on failures.

- **Should we track email delivery?**
  - ✅ **Yes** - Track: sent, delivered, bounced, opened (optional), clicked (optional). Store in email_logs table. Use webhooks from email provider.

### 12.2 Email Templates
- **What templating engine?**
  - ✅ **Handlebars** - Simple, powerful, widely used. Store templates in files, compile on server start. Support variables and partials.

- **Should emails be HTML or plain text?**
  - ✅ **Both** - Send multipart emails: HTML version (styled, images) + plain text fallback. Some email clients only support plain text.

- **Should we support email localization?**
  - ✅ **Not initially** - English only. Design for future i18n: store templates per locale, use user's preferred language. Add when international users require it.

### 12.3 Email Types
- **What emails does system send?**
  - ✅ **Emails:**
    - Welcome email (after signup)
    - Email verification
    - Password reset
    - Invitation to organization
    - Role changed notification
    - Account activated/deactivated notification
    - Organization deactivated notification
    - Bulk operation completed (admin notification)

---

## 13. Testing

### 13.1 Unit Testing
- **What to unit test?**
  - ✅ **Test:**
    - Permission checking logic
    - Role assignment logic
    - Invitation token generation/validation
    - Password hashing/verification
    - Email/slug validation
    - Business logic in services
    - **Target: 80% code coverage**

- **What framework?**
  - ✅ **Jest** - Fast, good TypeScript support, built-in mocking, parallel test execution. Configure with: coverage reporting, watch mode.

### 13.2 Integration Testing
- **What to integration test?**
  - ✅ **Test:**
    - Full authentication flows (signup, login, logout)
    - Invitation flows (send, accept)
    - User management (create, update, deactivate)
    - Permission enforcement (try unauthorized actions)
    - Organization management (create, update, delete)
    - API endpoints (request/response format)
    - **Use test database** (in-memory SQLite for speed, or Docker Postgres for accuracy)

### 13.3 E2E Testing
- **What to E2E test?**
  - ✅ **Test:**
    - Critical user journeys (signup → create org → invite user → user accepts)
    - Admin workflows (invite users, change roles, view audit logs)
    - Permission enforcement in UI (buttons hidden/disabled when no permission)
    - **Use Playwright** - Modern, fast, supports multiple browsers, good debugging

- **When to run E2E tests?**
  - ✅ **Before deployment** - Run in CI/CD pipeline. Block merge if tests fail. Run on staging environment before production deploy.

---

## 14. Deployment

### 14.1 Environment Configuration
- **What configuration approach?**
  - ✅ **Environment variables** - 12-factor app principles. Different .env files per environment. Never commit secrets. Use dotenv in development, native env vars in production.

- **Should we use feature flags?**
  - ✅ **Yes** - Use LaunchDarkly, Unleash, or simple DB-based flags. Enable gradual rollout of features, A/B testing, kill switches. Start simple (boolean flags), expand later.

### 14.2 Database Migrations
- **What migration tool?**
  - ✅ **Knex or TypeORM migrations** - Version-controlled SQL migrations. Up/down migrations for rollback. Run automatically in staging, manually in production (safer).

- **Should migrations run automatically?**
  - ✅ **No in production** - Manual trigger for production migrations. Automatic in dev/staging. Allows verification and timing control.

- **Should we backup before migrations?**
  - ✅ **Yes** - Automated backup before production migrations. Retention: 30 days. Test restore process regularly.

### 14.3 CI/CD Pipeline
- **What should CI/CD do?**
  - ✅ **Pipeline:**
    1. Run linter (ESLint)
    2. Run unit tests
    3. Run integration tests
    4. Build application
    5. Run E2E tests (staging)
    6. Deploy to staging (auto)
    7. Run smoke tests
    8. Deploy to production (manual approval)
    9. Run production smoke tests

- **What CI/CD platform?**
  - ✅ **GitHub Actions or GitLab CI** - If using GitHub, GitHub Actions natural choice. Good free tier, easy to configure, lots of actions available.

---

## 15. Monitoring

### 15.1 Application Monitoring
- **What to monitor?**
  - ✅ **Metrics:**
    - API response times (p50, p95, p99)
    - Error rates by endpoint
    - Database query times
    - Cache hit rates
    - Background job queue length/processing time
    - Active users (current sessions)
    - Failed login attempts
    - Permission check failures

- **What tool?**
  - ✅ **Datadog, New Relic, or self-hosted (Prometheus + Grafana)** - Depends on budget. Start simple (self-hosted), upgrade if needed.

### 15.2 Error Tracking
- **What tool for error tracking?**
  - ✅ **Sentry** - Excellent error tracking, source maps support, release tracking, user context, breadcrumbs. Free tier generous.

- **Should we track client errors?**
  - ✅ **Yes** - Install Sentry browser SDK. Captures unhandled exceptions, promise rejections, console errors. Include user context and breadcrumbs.

### 15.3 Alerting
- **What should trigger alerts?**
  - ✅ **Alerts:**
    - Error rate >5% (page admins immediately)
    - API response time >5s (p95)
    - Database connection pool >80% used
    - Failed login attempts >100/hour (potential attack)
    - Disk space >90% used
    - Background job queue >1000 pending jobs
    - Email delivery failures >10%

- **What alerting channels?**
  - ✅ **Email + Slack** - Email for critical alerts, Slack for warnings. Use PagerDuty for on-call if 24/7 support needed.

---

## 16. Documentation

### 16.1 API Documentation
- **What format?**
  - ✅ **OpenAPI 3.0 (Swagger)** - Industry standard. Generate interactive docs. Use Swagger UI or Redoc for rendering. Keep spec in sync with code (use decorators/annotations).

### 16.2 User Documentation
- **What docs needed?**
  - ✅ **Create:**
    - Getting started guide
    - Admin guide (user management, roles, invitations)
    - FAQ
    - Permission matrix reference
    - Troubleshooting guide
    - **Host on docs.example.com** - Use Docusaurus, GitBook, or similar

### 16.3 Developer Documentation
- **What docs needed?**
  - ✅ **Create:**
    - Architecture overview
    - Database schema diagram
    - Permission system explanation
    - Deployment guide
    - Development setup guide
    - API integration guide
    - **Store in repo as Markdown** - Version with code

---

## 17. Compliance & Security

### 17.1 GDPR Compliance
- **What GDPR features needed?**
  - ✅ **Implement:**
    - Data export: User can download all their data (JSON format)
    - Right to be forgotten: User can delete account + all data
    - Consent management: Track consent for emails, data processing
    - Privacy policy: Clear, accessible
    - Data retention policies: Auto-delete old data (audit logs after 2 years)

### 17.2 Security Headers
- **What HTTP headers?**
  - ✅ **Set:**
    - `Content-Security-Policy`: Restrict resource loading
    - `X-Frame-Options: DENY`: Prevent clickjacking
    - `X-Content-Type-Options: nosniff`: Prevent MIME sniffing
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy`: Control browser features
    - `Strict-Transport-Security`: Force HTTPS

### 17.3 Regular Security Practices
- **What security practices?**
  - ✅ **Practices:**
    - Dependency scanning (npm audit, Snyk, Dependabot)
    - Regular penetration testing (annually)
    - Security code reviews (critical changes)
    - Principle of least privilege (permissions)
    - Regular backup testing
    - Incident response plan
    - Security training for team

---

## 18. Edge Cases - Final Answers

### 18.1 User Edge Cases
- **User tries to join organization they're already in**
  - ✅ Return 400 error: "You are already a member of this organization"

- **User's email changes while they have pending invitations**
  - ✅ Pending invitations use old email. After email change, send new invitations to new email. Old invitations expire normally.

- **User deactivated while they have active sessions**
  - ✅ Immediately invalidate all sessions (add to blacklist). User kicked out on next API call.

- **User tries to delete themselves**
  - ✅ Allow if not last Super Admin. Require password confirmation. Soft delete with 30-day recovery.

- **Last Super Admin tries to leave organization**
  - ✅ Prevent with error: "Cannot leave. You are the last Super Admin. Assign another Super Admin first."

### 18.2 Organization Edge Cases
- **Organization deleted while users have active sessions**
  - ✅ Sessions remain valid but API calls fail with 404 "Organization not found". Users kicked to org selection screen.

- **Organization slug conflicts during update**
  - ✅ Return 409 Conflict error: "This slug is already taken. Please choose another."

- **Organization owner account deleted**
  - ✅ Prevent deletion: "Cannot delete account. Transfer ownership of X organizations first." List affected orgs.

- **Organization reaches member limit**
  - ✅ Prevent new invitations: "Member limit reached (500). Contact support to increase limit." Show upgrade prompt.

- **Organization settings JSON malformed**
  - ✅ Validate JSON schema on save. Return 400 with validation errors. Never save invalid JSON.

### 18.3 Role & Permission Edge Cases
- **Role deleted while users assigned to it**
  - ✅ Prevent deletion: "Cannot delete role. X users are assigned this role. Reassign them first." Show affected users.

- **Permission removed from role while users using it**
  - ✅ Allow immediately. Cache invalidated. Users lose permission on next request (or within 5 min cache TTL).

- **User has conflicting permissions from multiple roles**
  - ✅ N/A - single role per user. If resource-level permissions conflict with role, most permissive wins.

- **Custom role has same name as system role**
  - ✅ Prevent with validation error: "Role name already exists. System role names cannot be reused."

- **Role inheritance creates circular dependency**
  - ✅ N/A - no role inheritance in initial design. If added later, validate acyclic graph.

### 18.4 Invitation Edge Cases
- **Invitation token used multiple times**
  - ✅ First use: succeed, mark token as used. Second use: 400 error "Invitation already accepted".

- **Invitation expires while user in signup flow**
  - ✅ Check token validity on final signup step. If expired, show error: "Invitation expired. Request new invitation from admin."

- **User accepts invitation with different email**
  - ✅ Allow. User's actual email becomes their account email. Invitation email was just for delivery.

- **Invitation cancelled after user starts signup**
  - ✅ Check invitation status on final step. If cancelled, show error: "Invitation was cancelled by admin."

- **Bulk invitation has duplicate emails**
  - ✅ Deduplicate before sending. Show warning: "5 duplicate emails removed. Sending invitations to 95 unique addresses."

---

## Summary of Key Decisions

### Security Priorities
1. ✅ All passwords bcrypt hashed (cost 12)
2. ✅ JWT auth with httpOnly cookies
3. ✅ Permission checks on every request
4. ✅ Rate limiting on all endpoints
5. ✅ Audit logging for all privileged actions
6. ✅ Input validation + output encoding (XSS prevention)
7. ✅ Parameterized queries (SQL injection prevention)
8. ✅ CSRF tokens + SameSite cookies
9. ✅ Session blacklisting for instant revocation
10. ✅ Failed login tracking + account lockout

### Flexibility Priorities
1. ✅ Wildcard permissions (e.g., `projects.*`)
2. ✅ Custom role creation for Super Admins
3. ✅ Resource-level permission overrides
4. ✅ Multiple authentication providers per user
5. ✅ Configurable organization settings (JSON)
6. ✅ Soft deletes with grace periods (recovery)
7. ✅ Feature flags for gradual rollouts
8. ✅ Extensible schema (nullable future fields)
9. ✅ Background jobs for async operations
10. ✅ API versioning for backward compatibility

### Data Model
- Single role per user per organization (simplicity)
- Global permissions, org-scoped roles
- Redis for sessions/cache, PostgreSQL for data
- 90-day soft delete grace periods
- Audit logs: 90 days hot, 2 years cold
- Organization-complete data isolation

### Implementation Approach
- Start with core features (auth, roles, permissions)
- Add advanced features iteratively (custom roles, resource permissions)
- Security from day one (not bolted on later)
- Monitor everything (errors, performance, security)
- Documentation as code (OpenAPI, Markdown)

---

## Questions Where I Need Clarification

I have high confidence in all answers above based on security and flexibility priorities. However, I'd like to confirm:

1. **Database choice** - I assumed PostgreSQL. Confirm or specify MySQL/other?
2. **Tech stack** - You mentioned Electron. Is this Electron + React? Node.js backend? Confirm stack.
3. **Hosting** - Self-hosted, cloud (AWS/Azure/GCP), or managed services? Impacts architecture choices.
4. **Budget constraints** - Affects choice of paid services (email, monitoring, error tracking).

Otherwise, all answers provided are based on industry best practices for security and flexibility. Ready to implement! 🚀
