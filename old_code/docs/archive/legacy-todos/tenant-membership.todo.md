# TODO: Tenant Membership Enforcement

## 1. Overview
Ensure every user belongs to at least one tenant by coupling registration with tenant provisioning or automatic join requests, while giving tenant admins full control over approvals.

## 2. Functional Requirements
- Auto-create a tenant (name + domain) during registration when no tenant exists for the user’s email domain; mark the registrant as owner/global admin.
- If a tenant already exists for the domain, automatically generate a join request instead of creating another tenant; registration completes in a pending state until approval.
- Maintain a dedicated API and data store for join-request lifecycle (create, list, approve, decline).
- Tenant admins receive email notifications for every new request and can invite existing users proactively.
- Invitations are always scoped to an existing tenant; only tenant owners/admins can issue them and they cannot create or modify other tenants.
- Invitation acceptance never bypasses email verification; invitees must complete the standard verification step (or already have a verified email) before they become active members.
- Every invitation records `expiresAt`, sends an automatic reminder email ~48 hours before expiration, and is auto-marked as `expired` once stale (with notifications to both admin and invitee).
- Expose invitation preview metadata (tenant name, issuer, message, expiration) via a lightweight, anonymous-safe endpoint so the frontend can render trust banners before acceptance.
- Invite creation is rate limited per tenant and per admin; limits are configurable by super admins and violations return clear errors.
- Maintain a full invitation audit log (issuer, timestamps, metadata, decisions, IP/device info) with filterable history for compliance exports.
- Tenant admins can choose role presets (e.g., `member`, `billing_admin`, custom bundles) for each invite to avoid manual post-acceptance updates.
- Admin dashboards surface pending join requests vs. pending invites widgets so action items remain visible.
- Existing verified users can self-service accept invitations by selecting which tenant to switch into (no re-verification needed), while new accounts still complete verification.
- Approval immediately attaches the user to the tenant, assigns base roles, and activates their account; decline leaves the user unattached and informs them.
- Multi-tenant isolation: users can only access data for tenants they belong to; admin endpoints require appropriate roles (`owner`, `admin`, `global_admin`).
- Invitation communications must support tenant-branded, localization-ready templates to match other notification channels.

## 3. Data Models
### 3.1 Entity: Tenant
- `id` (UUID)
- `name` (string, required)
- `domainName` (string, unique, required)
- `status` (active, suspended)
- `adminUserIds` (array of user IDs)
- `createdAt`, `updatedAt`

Validation: domain must be unique and match email domains; name min length 3.

### 3.2 Entity: User
- `id`, `email`, `passwordHash`
- `tenantIds` (array; at least one entry for active users)
- `activeTenantId` (current tenant context)
- `pendingTenantId` (optional when awaiting approval)
- `roles` (array)
- `status` (active, pending_approval, disabled)
### 3.3 Entity: Invitation
- `id`
- `tenantId`
- `email`
- `issuerUserId`
- `roles` (preset identifier or custom array)
- `message` (optional)
- `status` (pending, accepted, declined, expired, revoked)
- `token`
- `expiresAt`
- `reminderSentAt`
- `decisionBy`, `decisionAt`
- `audit` (IP, userAgent, locale)
- `createdAt`, `updatedAt`

Validation: `expiresAt` defaults (e.g., 7 days) but can be overridden within super-admin limits; reminder runs once per invite; tokens must be single-use.

### 3.4 Entity: JoinRequest
- `id`
- `tenantId`
- `requesterUserId`
- `requesterEmail`
- `status` (pending, approved, declined, expired)
- `decisionBy` (admin ID)
- `decisionAt`
- `createdAt`

Validation: one open request per user+tenant combination.

## 4. API Endpoints
### 4.1 POST /auth/register
- Body: user creds + `tenantName`, `tenantDomain`.
- Behavior: if `tenantDomain` not found, create tenant + user (role owner). If found, create user with `pendingTenantId`, spawn join request.
- Errors: 409 duplicate email, 400 invalid domain, 403 tenant suspended.

### 4.2 POST /tenants/:tenantId/join-requests
- Requires auth (optional for registration internal call) and uses existing tenant ID.
- Body: optional message.
- Response: join request ID + status `pending`.
- Errors: 404 tenant not found, 409 request already pending.

### 4.3 GET /tenants/:tenantId/join-requests
- Role: tenant admin/owner.
- Returns paginated list of pending/closed requests.

### 4.4 POST /tenants/:tenantId/join-requests/:requestId/approve
- Role: admin/owner.
- Action: attach user to tenant, assign default roles, send notifications.

### 4.5 POST /tenants/:tenantId/join-requests/:requestId/decline
- Role: admin/owner.
- Action: mark request declined, notify requester.

### 4.6 POST /tenants/:tenantId/invitations
- Role: tenant admin/owner.
- Scope: invitations always reference the issuing tenant and never provision new tenants.
- Body: `email`, optional `rolesPreset` or explicit `roles`, optional `message`, optional `expiresAt` (within configured bounds).
- Behavior: Admin invites user by email; creates token + email with accept/decline links, schedules reminder job, and captures audit entry.
- Rate limits: per-tenant and per-admin quotas enforced; super admins can adjust thresholds via config/API.

### 4.7 POST /tenants/:tenantId/invitations/:token/accept|decline
- Requires invitee email verification (either existing verified account or verification via token flow) before membership activates.
- If invitee already has an active account in another tenant, surface tenant-switch confirmations instead of re-sending verification and attach the tenant to their `tenantIds`.
- Allows invitee to respond; accept attaches user (creating one if needed) with the preset roles, logs decision, and clears reminder jobs.
- Decline endpoint records audit info and optionally lets admins include feedback.

### 4.8 GET /tenants/:tenantId/invitations/:token
- Anonymous-safe preview endpoint returning tenant name, issuer display name, message snippet, expiration, and whether token is already used/expired.
- Used by public landing page to render trust banners before the invitee signs in or up.

## 5. UI Pages
- **Registration Page**: collects tenant info, shows “tenant exists” banner when domain matches, surfaces pending message after submit.
- **Pending Dashboard**: limited access view telling user request is awaiting approval; option to resend notification.
- **Tenant Admin Console**: join-request list with filters, approve/decline buttons, invite form with rate-limit feedback, role preset selector, audit/history tab, and CSV export hooks.
- **Pending Widgets**: dashboard cards highlighting counts for pending join requests vs. pending/expiring invites (with CTA links).
- **Invitation Response Page**: minimal UI to accept/decline via emailed links, handles anonymous or logged-in states, displays preview metadata and tenant branding, and warns when invites near expiration.
- **Invite Preview Landing**: public route hit before auth that calls the preview endpoint to show tenant info, issuer avatar, and next steps.
- **Tenant Switch Prompt**: modal/banner shown to verified users who already belong to another tenant, allowing them to select an active tenant before accepting a new membership.

## 6. Workflow / Sequence
1. User submits registration.
2. System checks domain:
   - If new: create tenant, assign user as owner, send welcome email.
   - If existing: create user (pending), create join request, email tenant admins.
3. Admin reviews request:
   - Approve ➜ user tenantId set, roles provisioned, requester notified.
   - Decline ➜ request closed, requester notified, user remains pending or prompt to create new tenant with different domain.
4. Admin may send proactive invitations; each invite records audit info, schedules reminder ~48h before expiration, and respects rate limits.
5. Invitees visit preview landing, confirm trust cues, and proceed to accept/decline; existing verified users can switch tenants without re-verification, while new users complete verification before activation.
6. Expired invites automatically notify admins/invitees and fall off the pending widgets; admins can reissue if needed.

## 7. Integrations
- **Email**: Resend (existing service) to dispatch admin notifications and invitation links.
- **Reminder Worker**: scheduled job or queue worker to dispatch 48h-before-expiry emails and mark invites as expired if no response.
- **Feature Flags / Config**: super-admin-accessible settings defining invite expiry defaults, reminder offsets, and rate-limit thresholds.
- **Auth**: same JWT issuance; pending users receive limited tokens or none until approval.
- **Secrets**: Resend API keys and JWT secrets already in Key Vault / env files.

## 8. Error Handling
- Detect mismatched domains early and return informative errors.
- Enforce idempotency (multiple submissions should not create duplicate requests).
- Log all join-request state transitions for auditing.
- Return HTTP 429 with descriptive messaging when invite rate limits are exceeded (include reset hints).
- Reject accept/decline attempts for expired or already-used tokens with actionable guidance (e.g., “request a new invite”).
- Retry email sends (2 attempts) and fallback to queue if provider fails.

## 9. Acceptance Criteria
- Registration without matching tenant creates both user and tenant atomically.
- Registration with matching tenant stores join request and blocks access until approval.
- Tenant admins receive actionable emails for every new request and can approve/decline via API/UI.
- Approved users become active members with appropriate roles; declined users remain unattached.
- Invitation flow enforces expiry/auto-expire, reminder emails, preview endpoint, role presets, audit logging, and self-service acceptance for existing verified users.

## 10. Non-Functional Requirements
- Ensure tenant domain uniqueness enforced at database level.
- Join-request APIs must respect tenant isolation and rate limiting.
- Emails should be localized-ready and send within 5 seconds of request creation.
- Audit logs for every membership change (GDPR-ready).
- Scalability: handle thousands of tenants with minimal cross-tenant leakage.
- Tenant-branded, localization-ready email templates should be configurable per tenant (logos, accent colors, locales) without redeploying code.

## 11. Backlog / Future Enhancements
- Optional invite code import/export flows (bulk CSV upload/download) to be implemented later once admin console UX is finalized.
