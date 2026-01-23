# Admin Role and User Management System - Implementation Questions

This document contains comprehensive questions that need to be answered before starting implementation. Please answer all questions to ensure accurate implementation.

## 1. Database Schema & Data Model

### 1.1 User Model
- [ ] Should `passwordHash` be required for email/password users, or can users exist with only OAuth?
- [ ] Should we support multiple authentication methods per user (e.g., both Google OAuth and email/password)?
- [ ] What is the maximum length for `firstName` and `lastName`?
- [ ] Should `phoneNumber` have format validation (e.g., E.164 format)?
- [ ] Should `avatarUrl` support external URLs or only uploaded files?
- [ ] What happens to `deletedAt` records - permanent deletion after X days or keep forever?
- [ ] Should we track failed login attempts for security (lockout after N attempts)?

### 1.2 Organization Model
- [ ] How should `slug` be generated - auto-generated from name or user-provided?
- [ ] What are the slug validation rules (allowed characters, length, uniqueness)?
- [ ] Should `slug` be editable after creation?
- [ ] What is the maximum size for `settings` JSON field?
- [ ] Should organizations have a maximum number of members?
- [ ] Should organizations have subscription/billing tiers?
- [ ] Can organizations be reactivated after deletion, or is it permanent?

### 1.3 OrganizationMembership Model
- [ ] Can a user have multiple active memberships in the same organization (different roles)?
- [ ] What happens when a user is "suspended" - can they still view read-only content?
- [ ] Should `lastAccessAt` be updated on every API call or only on login?
- [ ] Should we track membership history (when role changed, who changed it)?
- [ ] Can a user be invited to the same organization multiple times (if previous invitation expired)?
- [ ] Should there be a grace period before permanent deletion of membership?

### 1.4 Role Model
- [ ] Should system roles (Super Admin, Admin, Member, Viewer) be created per organization or globally shared?
- [ ] Can custom roles have the same name as system roles in different organizations?
- [ ] Should roles have a maximum number of permissions?
- [ ] Can roles be archived instead of deleted (to preserve history)?
- [ ] Should roles have versioning (track changes over time)?
- [ ] What happens to users when their role is deleted - assign default role or error?

### 1.5 Permission Model
- [ ] Should permissions be global (shared across all organizations) or organization-specific?
- [ ] Can new permissions be added to the system at runtime, or are they fixed at deployment?
- [ ] Should permissions support hierarchical structure (e.g., `projects.*` grants all project permissions)?
- [ ] How should permission conflicts be resolved (e.g., user has both `read.own` and `read.all`)?
- [ ] Should permissions support conditions (e.g., "can delete only if created more than 7 days ago")?
- [ ] Should we support permission templates for common role patterns?

### 1.6 Invitation Model
- [ ] Should invitation tokens be single-use or multi-use (until expiration)?
- [ ] What is the default expiration time for invitations (7 days as specified)?
- [ ] Should invitations be resendable, and if so, does it generate a new token?
- [ ] Can the same email be invited multiple times to the same organization?
- [ ] Should we track invitation acceptance history?
- [ ] Should invitations support custom messages from the inviter?

### 1.7 Session Model
- [ ] Should sessions be stored in database or Redis for performance?
- [ ] How many concurrent sessions should a user be allowed?
- [ ] Should we support "remember device" functionality?
- [ ] Should sessions be automatically cleaned up (cron job) or on-demand?
- [ ] Should we track session activity (last API call timestamp)?

### 1.8 AuditLog Model
- [ ] What is the default retention period for audit logs?
- [ ] Should audit logs be archived to cold storage after X days?
- [ ] Should we support audit log compression for storage efficiency?
- [ ] Should sensitive data (passwords, tokens) be redacted from audit logs?
- [ ] Should audit logs be immutable (no updates/deletes allowed)?

## 2. Permission System & RBAC

### 2.1 Permission Structure
- [ ] Should permissions support wildcards (e.g., `projects.*` grants all project permissions)?
- [ ] How should permission inheritance work - explicit only or hierarchical?
- [ ] Should Super Admin have a special flag that bypasses all checks, or explicit all permissions?
- [ ] How should scope resolution work (own → team → organization → all)?
- [ ] Should permissions support resource-level overrides (e.g., user has read access to specific project)?

### 2.2 Role Assignment
- [ ] Can a user have multiple roles in the same organization simultaneously?
- [ ] How are permissions resolved when a user has multiple roles (union or intersection)?
- [ ] Should role changes require approval workflow?
- [ ] Can users self-assign roles (if they have permission)?
- [ ] Should role assignments have expiration dates?

### 2.3 Permission Checking
- [ ] Should permission checks be cached, and if so, for how long?
- [ ] Should we support permission delegation (user A grants permission to user B)?
- [ ] How should permission checks work for nested resources (e.g., task within project)?
- [ ] Should we support conditional permissions (e.g., "can edit if owner" or "can delete if created by self")?
- [ ] Should permission checks be logged for debugging/audit purposes?

### 2.4 Super Admin vs Admin
- [ ] Can Super Admin be demoted to Admin or other roles?
- [ ] Can there be multiple Super Admins in an organization?
- [ ] Should Super Admin actions be logged differently (more detailed)?
- [ ] Can Super Admin transfer ownership to another user?
- [ ] What happens if the last Super Admin leaves the organization?

## 3. User Management

### 3.1 User CRUD Operations
- [ ] Can Admins create users directly, or only invite them?
- [ ] Should user creation require email verification before activation?
- [ ] Can users be permanently deleted, or only deactivated?
- [ ] Should user deletion cascade to all organizations, or require removal from each org first?
- [ ] Can deactivated users be reactivated, and if so, do they retain their previous roles?
- [ ] Should we support user import (bulk creation from CSV/JSON)?

### 3.2 User Profile Management
- [ ] Can users edit their own profiles, or only Admins?
- [ ] Should profile changes require approval for certain fields?
- [ ] Can users change their own email address, or only Admins?
- [ ] Should we support profile pictures (upload vs URL)?
- [ ] Should we track profile change history?

### 3.3 User Activation/Deactivation
- [ ] What is the difference between "suspended" and "deactivated" status?
- [ ] Can suspended users still access read-only content?
- [ ] Should deactivation be immediate or scheduled?
- [ ] Should we send notification emails on activation/deactivation?
- [ ] Can users self-deactivate their accounts?

### 3.4 Bulk Operations
- [ ] What is the maximum batch size for bulk operations?
- [ ] Should bulk operations be asynchronous (background jobs)?
- [ ] Should we provide progress tracking for bulk operations?
- [ ] Should bulk operations be reversible (undo functionality)?
- [ ] Should bulk operations require confirmation before execution?

## 4. Organization Management

### 4.1 Organization Creation
- [ ] Should organization creation require approval, or be instant?
- [ ] Is there a limit on number of organizations a user can create?
- [ ] Should organization creation require payment/subscription?
- [ ] Can organizations be created via API, or only through UI?
- [ ] Should we support organization templates (pre-configured settings)?

### 4.2 Organization Settings
- [ ] What settings should be configurable (branding, defaults, integrations)?
- [ ] Should settings changes require Super Admin approval?
- [ ] Should we support setting inheritance (parent org → child orgs)?
- [ ] Should settings changes be versioned (rollback capability)?
- [ ] Can settings be exported/imported?

### 4.3 Organization Deactivation
- [ ] Should organization deactivation be reversible?
- [ ] What happens to user data when organization is deactivated?
- [ ] Should we send notifications to all members before deactivation?
- [ ] Is there a grace period before permanent deletion?
- [ ] Can organizations be archived instead of deleted?

### 4.4 Organization Ownership
- [ ] Can organization ownership be transferred?
- [ ] What happens if the owner account is deleted?
- [ ] Should ownership transfer require approval?
- [ ] Can there be co-owners of an organization?

## 5. Invitation System

### 5.1 Invitation Flow
- [ ] Should invitations work for existing users (add to org) and new users (signup flow)?
- [ ] Should we support invitation links that don't require email?
- [ ] Can invitations include custom role assignments, or only predefined roles?
- [ ] Should we support invitation groups (invite multiple users at once)?
- [ ] Should invitations support expiration extensions?

### 5.2 Invitation Management
- [ ] Can invitations be cancelled after being sent?
- [ ] Should we track invitation open/click rates?
- [ ] Should we support invitation reminders (auto-resend after X days)?
- [ ] Can users decline invitations, and if so, should we track that?
- [ ] Should we support invitation templates (custom messages)?

### 5.3 Bulk Invitations
- [ ] What is the maximum number of invitations per bulk operation?
- [ ] Should bulk invitations be rate-limited?
- [ ] Should we validate email addresses before sending invitations?
- [ ] Should bulk invitations support custom roles per user?
- [ ] Should we provide CSV template for bulk invitations?

## 6. Role & Permission Management

### 6.1 Custom Role Creation
- [ ] Can custom roles be created based on existing roles (clone functionality)?
- [ ] Should custom roles support role inheritance (inherit from another role)?
- [ ] Can custom roles have the same permissions as system roles?
- [ ] Should we validate permission combinations (e.g., can't have delete without read)?
- [ ] Should custom roles support permission templates (common permission sets)?

### 6.2 Role Editing
- [ ] Can system roles be edited (even if marked as system)?
- [ ] Should role edits require approval?
- [ ] Should we track role change history?
- [ ] Can roles be renamed, or only descriptions updated?
- [ ] What happens to users when their role's permissions are reduced?

### 6.3 Permission Assignment
- [ ] Should permission assignment support bulk operations?
- [ ] Can permissions be temporarily granted (with expiration)?
- [ ] Should we support permission groups (assign multiple related permissions at once)?
- [ ] Should permission changes require user notification?
- [ ] Can permissions be revoked immediately, or should there be a grace period?

### 6.4 Role Inheritance
- [ ] How should configurable role inheritance work - UI toggle or API flag?
- [ ] Should inherited permissions be explicit (shown in role) or implicit?
- [ ] Can custom roles inherit from multiple parent roles?
- [ ] Should we prevent circular inheritance?
- [ ] Should inherited permissions be editable, or locked?

## 7. Multi-Organization Support

### 7.1 Organization Switching
- [ ] Should organization switch be instant, or require confirmation?
- [ ] Should we remember the last active organization per user?
- [ ] Should organization switch be logged in audit trail?
- [ ] Can users switch organizations via API?
- [ ] Should we support organization favorites/pinning?

### 7.2 Cross-Organization Operations
- [ ] Can users perform actions across organizations (if they have access)?
- [ ] Should user profile be global or organization-specific?
- [ ] Should notifications be aggregated across organizations?
- [ ] Can resources be shared between organizations?
- [ ] Should we support organization hierarchies (parent/child orgs)?

### 7.3 Organization Context
- [ ] How should organization context be maintained (session, JWT, header)?
- [ ] Should API endpoints require organization context explicitly?
- [ ] Should we support organization-agnostic endpoints (global operations)?
- [ ] How should errors be handled if user doesn't have access to requested organization?

## 8. Audit Logging

### 8.1 What to Log
- [ ] Should we log all API calls, or only specific actions?
- [ ] Should we log read operations, or only write operations?
- [ ] Should we log failed permission checks?
- [ ] Should we log user login/logout events?
- [ ] Should we log data exports (for compliance)?

### 8.2 Log Details
- [ ] What level of detail should be logged (before/after values, full context)?
- [ ] Should we log IP addresses and user agents for all actions?
- [ ] Should sensitive data be redacted from logs?
- [ ] Should we log system-generated actions (automated processes)?
- [ ] Should we support custom log annotations (developer-added context)?

### 8.3 Log Access & Management
- [ ] Who can view audit logs (Super Admin, Admin, or custom role)?
- [ ] Should audit logs be searchable/filterable?
- [ ] Should we support audit log export (CSV, JSON, PDF)?
- [ ] Should audit logs support real-time streaming?
- [ ] Should we support audit log archiving to external storage?

### 8.4 Compliance & Retention
- [ ] What retention policies should be enforced (90 days, 1 year, configurable)?
- [ ] Should we support different retention policies for different action types?
- [ ] Should audit logs be immutable (prevent tampering)?
- [ ] Should we support audit log encryption?
- [ ] Should we support compliance exports (GDPR, SOC2, etc.)?

## 9. Authentication & Security

### 9.1 Password Management
- [ ] What are the password requirements (length, complexity, special chars)?
- [ ] Should we enforce password history (can't reuse last N passwords)?
- [ ] Should we enforce password expiration (change every X days)?
- [ ] Should we support password strength meter in UI?
- [ ] Should we support passwordless authentication (magic links)?

### 9.2 Session Management
- [ ] Should sessions support "remember me" functionality?
- [ ] What is the default session timeout (8 hours as specified)?
- [ ] Should we support session extension (auto-refresh)?
- [ ] Should we support concurrent session limits?
- [ ] Should we support session revocation (logout from all devices)?

### 9.3 OAuth Integration
- [ ] Should we support multiple OAuth providers simultaneously?
- [ ] Should OAuth accounts be linkable to existing email/password accounts?
- [ ] What happens if OAuth provider account is deleted?
- [ ] Should we support OAuth account unlinking?
- [ ] Should we support OAuth token refresh?

### 9.4 Security Features
- [ ] Should we implement two-factor authentication (2FA)?
- [ ] Should we support IP whitelisting for organizations?
- [ ] Should we implement account lockout after failed login attempts?
- [ ] Should we support security questions for password recovery?
- [ ] Should we implement CAPTCHA for sensitive operations?

### 9.5 Rate Limiting
- [ ] What rate limits should be applied (login, API calls, invitations)?
- [ ] Should rate limits be per-user, per-IP, or per-organization?
- [ ] Should rate limits be configurable per organization?
- [ ] Should we support rate limit exemptions for certain roles?
- [ ] Should rate limit violations be logged?

## 10. Email & Notifications

### 10.1 Email Templates
- [ ] Should email templates support HTML and plain text?
- [ ] Should email templates be customizable per organization?
- [ ] Should we support email template variables (user name, org name, etc.)?
- [ ] Should we support multiple languages for emails?
- [ ] Should email templates be editable via UI or code-only?

### 10.2 Email Delivery
- [ ] What email service should be used (SendGrid, AWS SES, SMTP)?
- [ ] Should we support email queuing (background jobs)?
- [ ] Should we track email delivery status (sent, delivered, bounced)?
- [ ] Should we support email retry logic for failed deliveries?
- [ ] Should we support email preview in development?

### 10.3 Notification Preferences
- [ ] Should users be able to opt-out of certain email types?
- [ ] Should we support in-app notifications in addition to emails?
- [ ] Should notification preferences be per-organization or global?
- [ ] Should we support notification digests (daily/weekly summaries)?
- [ ] Should Admins be able to configure organization-wide notification settings?

## 11. UI/UX Decisions

### 11.1 Organization Switcher
- [ ] Where should the organization switcher be located (header, sidebar, menu)?
- [ ] Should the switcher show user's role in each organization?
- [ ] Should the switcher support search/filtering?
- [ ] Should we show organization logos in the switcher?
- [ ] Should we support keyboard shortcuts for organization switching?

### 11.2 User Management UI
- [ ] Should user list support infinite scroll or pagination?
- [ ] What columns should be shown by default in user list?
- [ ] Should user list support column customization?
- [ ] Should we support user list export (CSV, Excel)?
- [ ] Should user detail view be a modal or separate page?

### 11.3 Role Management UI
- [ ] Should permission picker use checkboxes, toggles, or multi-select?
- [ ] Should we show permission descriptions in the picker?
- [ ] Should we support permission search/filtering in picker?
- [ ] Should we show permission dependencies (e.g., "delete requires read")?
- [ ] Should we support permission grouping by module in UI?

### 11.4 Invitation UI
- [ ] Should invitation form support email validation in real-time?
- [ ] Should we show invitation status (pending, accepted, expired)?
- [ ] Should we support invitation preview before sending?
- [ ] Should we show invitation analytics (open rate, acceptance rate)?
- [ ] Should invitation list support bulk actions?

### 11.5 Audit Log UI
- [ ] Should audit log viewer support real-time updates?
- [ ] What filters should be available (user, action, date range, resource)?
- [ ] Should we support audit log export in multiple formats?
- [ ] Should audit log entries be expandable for details?
- [ ] Should we support audit log search (full-text search)?

## 12. API Design

### 12.1 Endpoint Structure
- [ ] Should all endpoints be organization-scoped (require orgId in path)?
- [ ] Should we support organization-agnostic endpoints (e.g., `/api/users/me`)?
- [ ] Should we use RESTful conventions or custom structure?
- [ ] Should we support GraphQL in addition to REST?
- [ ] Should we version APIs (e.g., `/api/v1/organizations`)?

### 12.2 Request/Response Format
- [ ] What should be the standard response format (success, error, pagination)?
- [ ] Should we support field selection (only return requested fields)?
- [ ] Should we support response filtering (server-side filtering)?
- [ ] Should we support bulk operations in single request?
- [ ] Should we support request/response compression?

### 12.3 Error Handling
- [ ] What error codes should we use (HTTP status codes, custom codes)?
- [ ] Should error messages be user-friendly or technical?
- [ ] Should we support error translation (multiple languages)?
- [ ] Should we log all API errors?
- [ ] Should we support error webhooks (notify on errors)?

### 12.4 Authentication in API
- [ ] Should we use JWT tokens or session-based authentication?
- [ ] Should tokens include organization context?
- [ ] Should we support API keys for programmatic access?
- [ ] Should we support OAuth2 for third-party integrations?
- [ ] Should we support token refresh mechanism?

## 13. Performance & Scalability

### 13.1 Database Optimization
- [ ] Should we use database indexes for all foreign keys?
- [ ] Should we implement database connection pooling?
- [ ] Should we use database read replicas for read-heavy operations?
- [ ] Should we implement database query caching?
- [ ] Should we support database sharding by organization?

### 13.2 Caching Strategy
- [ ] Should we cache user permissions (and for how long)?
- [ ] Should we cache organization settings?
- [ ] Should we cache role definitions?
- [ ] What caching solution should we use (Redis, in-memory)?
- [ ] Should we implement cache invalidation strategies?

### 13.3 Background Jobs
- [ ] Should email sending be asynchronous (background jobs)?
- [ ] Should bulk operations be asynchronous?
- [ ] Should audit log writing be asynchronous?
- [ ] What job queue should we use (Bull, BullMQ, custom)?
- [ ] Should we support job retry logic?

## 14. Migration & Data Migration

### 14.1 Existing Data
- [ ] How should we migrate existing users to the new system?
- [ ] Should existing users be assigned to a default organization?
- [ ] How should existing roles be migrated (global to org-scoped)?
- [ ] Should we preserve existing permission assignments?
- [ ] Should migration be reversible (rollback capability)?

### 14.2 Migration Strategy
- [ ] Should migration be done in phases or all at once?
- [ ] Should we support zero-downtime migration?
- [ ] Should we create migration scripts or use Prisma migrations?
- [ ] Should we support data validation after migration?
- [ ] Should we create migration rollback scripts?

### 14.3 Backward Compatibility
- [ ] Should old API endpoints continue to work during migration?
- [ ] Should we support both old and new data models temporarily?
- [ ] How long should we maintain backward compatibility?
- [ ] Should we provide migration guides for API consumers?

## 15. Testing Strategy

### 15.1 Unit Testing
- [ ] What testing framework should we use (Jest, Vitest, Mocha)?
- [ ] What code coverage threshold should we aim for (80%, 90%, 100%)?
- [ ] Should we test all permission combinations?
- [ ] Should we test edge cases (empty data, null values, etc.)?
- [ ] Should we use mocking for external dependencies?

### 15.2 Integration Testing
- [ ] Should we test full user flows (signup → invite → accept → use)?
- [ ] Should we test cross-organization scenarios?
- [ ] Should we test permission enforcement at API level?
- [ ] Should we use test databases or in-memory databases?
- [ ] Should we test email delivery (mock or real service)?

### 15.3 E2E Testing
- [ ] What E2E testing framework should we use (Playwright, Cypress)?
- [ ] Should we test all UI components?
- [ ] Should we test accessibility (a11y)?
- [ ] Should we test on multiple browsers?
- [ ] Should E2E tests run in CI/CD pipeline?

## 16. Documentation

### 16.1 API Documentation
- [ ] Should we use OpenAPI/Swagger for API documentation?
- [ ] Should API docs be interactive (try it out feature)?
- [ ] Should we include code examples in API docs?
- [ ] Should we document all error responses?
- [ ] Should API docs be versioned?

### 16.2 User Documentation
- [ ] Should we create user guides for Admin features?
- [ ] Should we create video tutorials?
- [ ] Should we create FAQ section?
- [ ] Should we document permission matrix?
- [ ] Should we create migration guides?

### 16.3 Developer Documentation
- [ ] Should we document database schema?
- [ ] Should we document permission system architecture?
- [ ] Should we create contribution guidelines?
- [ ] Should we document deployment process?
- [ ] Should we create architecture diagrams?

## 17. Monitoring & Observability

### 17.1 Logging
- [ ] What logging levels should we use (debug, info, warn, error)?
- [ ] Should we use structured logging (JSON format)?
- [ ] Should we log all API requests/responses?
- [ ] Should we use centralized logging (ELK, Datadog, etc.)?
- [ ] Should we support log aggregation?

### 17.2 Metrics
- [ ] What metrics should we track (API response times, error rates, user activity)?
- [ ] Should we use metrics dashboard (Grafana, etc.)?
- [ ] Should we track organization-level metrics?
- [ ] Should we set up alerts for critical metrics?
- [ ] Should we track business metrics (user signups, org creations)?

### 17.3 Error Tracking
- [ ] Should we use error tracking service (Sentry, Rollbar)?
- [ ] Should we track client-side errors?
- [ ] Should we track server-side errors?
- [ ] Should we notify developers on critical errors?
- [ ] Should we track error trends over time?

## 18. Deployment & DevOps

### 18.1 Environment Configuration
- [ ] Should we support multiple environments (dev, staging, production)?
- [ ] Should we use environment variables for configuration?
- [ ] Should we support feature flags?
- [ ] Should we use configuration management tools?
- [ ] Should we support environment-specific settings?

### 18.2 CI/CD Pipeline
- [ ] Should we run tests automatically on pull requests?
- [ ] Should we run database migrations automatically?
- [ ] Should we support blue-green deployments?
- [ ] Should we support canary deployments?
- [ ] Should we automate database backups?

### 18.3 Database Migrations
- [ ] Should migrations be run automatically or manually?
- [ ] Should we support migration rollbacks?
- [ ] Should we test migrations on staging before production?
- [ ] Should we backup database before migrations?
- [ ] Should we support zero-downtime migrations?

## 19. Edge Cases & Error Scenarios

### 19.1 User Edge Cases
- [ ] What happens if user tries to join organization they're already in?
- [ ] What happens if user's email changes while they have pending invitations?
- [ ] What happens if user is deactivated while they have active sessions?
- [ ] What happens if user tries to delete themselves?
- [ ] What happens if last Super Admin tries to leave organization?

### 19.2 Organization Edge Cases
- [ ] What happens if organization is deleted while users have active sessions?
- [ ] What happens if organization slug conflicts during update?
- [ ] What happens if organization owner account is deleted?
- [ ] What happens if organization reaches member limit?
- [ ] What happens if organization settings JSON is malformed?

### 19.3 Role & Permission Edge Cases
- [ ] What happens if role is deleted while users are assigned to it?
- [ ] What happens if permission is removed from role while users are using it?
- [ ] What happens if user has conflicting permissions from multiple roles?
- [ ] What happens if custom role has same name as system role?
- [ ] What happens if role inheritance creates circular dependency?

### 19.4 Invitation Edge Cases
- [ ] What happens if invitation token is used multiple times?
- [ ] What happens if invitation expires while user is in signup flow?
- [ ] What happens if user accepts invitation with different email?
- [ ] What happens if invitation is cancelled after user starts signup?
- [ ] What happens if bulk invitation has duplicate emails?

## 20. Future Enhancements & Extensibility

### 20.1 Planned Features
- [ ] Should we design schema to support future features (SSO, 2FA, etc.)?
- [ ] Should we support organization hierarchies (parent/child orgs)?
- [ ] Should we support team-based permissions (nested groups)?
- [ ] Should we support time-based role assignments (temporary roles)?
- [ ] Should we support approval workflows for role changes?

### 20.2 Integration Points
- [ ] Should we support webhooks for user/organization events?
- [ ] Should we support API for third-party integrations?
- [ ] Should we support SAML SSO for enterprise customers?
- [ ] Should we support SCIM for user provisioning?
- [ ] Should we support OAuth2 for third-party apps?

### 20.3 Compliance & Regulations
- [ ] Should we support GDPR compliance (data export, deletion)?
- [ ] Should we support SOC2 compliance requirements?
- [ ] Should we support HIPAA compliance (if applicable)?
- [ ] Should we support data residency requirements?
- [ ] Should we support audit log retention policies?

---

## Instructions

Please review all questions and provide answers. You can:
1. Answer questions directly in this file (add answers after each question)
2. Create a separate answers file
3. Answer questions section by section as we discuss them

For questions where you're unsure, please indicate "TBD" or "To be decided during implementation" so we can revisit them later.

Questions marked with [ ] should be answered before starting the corresponding implementation phase.
