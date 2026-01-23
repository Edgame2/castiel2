

Coder
/
i want you to give an extensive specification for Authentication and User Management.

The specifications must include all UI pages, UI components, API Endpoints, Database Schema.

Specification must specify integrations with other modules.
User Management modules will leverage notification modules for example

User Management:
User can be part of multiple Organizations
Organization have one or more Organization Admins
Organizations can have multiple teams
Users can be part of multiple Teams
Org Admin must be able to create custom RBAC

Authentication must support:
* Email/Passport
* Social Oauth: Google, Github,
* SSO: Azure AD, Okta 
Ask questions before starting if needed.

Afficher plus
4:31 PM
I'll create a comprehensive specification for Authentication and User Management. Let me ask a few clarifying questions first to ensure the specification meets your needs:

Clarifying Questions
SSO & OAuth Providers:
Should users be able to link multiple OAuth providers to a single account (e.g., both Google and GitHub)?
For SSO (Azure AD, Okta), should we support SAML 2.0, OIDC, or both?
Should SSO be organization-specific (e.g., only org members can use org's Azure AD)?
RBAC Customization:
Should custom roles be scoped at organization level, team level, or both?
What's the inheritance model? (e.g., org-level permissions inherited by teams?)
Should there be system-wide roles that org admins cannot modify (e.g., Super Admin)?
User Invitations:
Should invitations expire after a certain period?
Can users be invited to specific teams directly, or must they join org first then be assigned to teams?
Should we support invitation links vs email-only invitations?
Team Structure:
Can teams have hierarchical structure (parent/child teams)?
Can a user have different roles in different teams within the same org?
Should teams have team admins separate from org admins?
Notifications Integration:
Which events should trigger notifications? (e.g., user invited, role changed, new team member, etc.)
Should notification preferences be configurable per user?
What channels should be supported? (email, in-app, webhook?)
Session Management:
Should we support session limits per user (max concurrent sessions)?
Should sessions be device-specific with the ability to revoke specific devices?
What should the session timeout/refresh strategy be?
User Profile:
Beyond basic profile fields (name, email, avatar), what other fields are needed?
Should users have org-specific profiles (e.g., different roles/titles per org)?
Do we need user competencies/skills tracking as mentioned in the docs?
Audit & Compliance:
What level of audit logging is needed? (all user actions, or specific security events?)
Should we track login history, IP addresses, device fingerprints?
Any specific compliance requirements (GDPR, SOC2, etc.)?
Please answer these questions, and I'll create a detailed specification that covers all aspects of Authentication and User Management.

Clarifying Questions
1. SSO & OAuth Providers:
   * Should users be able to link multiple OAuth providers to a single account (e.g., both Google and GitHub)? Yes
   * For SSO (Azure AD, Okta), should we support SAML 2.0, OIDC, or both? SAML V2
   * Should SSO be organization-specific (e.g., only org members can use org's Azure AD)? yes
2. RBAC Customization:
   * Should custom roles be scoped at organization level, team level, or both? Organization Level
   * What's the inheritance model? (e.g., org-level permissions inherited by teams?) Teams do not have permissions user have permissions
   * Should there be system-wide roles that org admins cannot modify (e.g., Super Admin)? Yes, Super Admins can also create System Wide Custom roles
3. User Invitations:
   * Should invitations expire after a certain period? Yes, 2 days.
   * Can users be invited to specific teams directly, or must they join org first then be assigned to teams? Org first
   * Should we support invitation links vs email-only invitations? Both supported
4. Team Structure:
   * Can teams have hierarchical structure (parent/child teams)? Yes
   * Can a user have different roles in different teams within the same org? No
   * Should teams have team admins separate from org admins? No
5. Notifications Integration:
   * Which events should trigger notifications? (e.g., user invited, role changed, new team member, etc.) Be extensive
   * Should notification preferences be configurable per user? Yes that will be part of the Notification Module
   * What channels should be supported? (email, in-app, webhook?) Part of the Notification Module but Email, SMS, In app, Webhook in and out, Phone Call, WhatsApp
6. Session Management:
   * Should we support session limits per user (max concurrent sessions)? Yes, Org Admin can configure
   * Should sessions be device-specific with the ability to revoke specific devices? Yes
   * What should the session timeout/refresh strategy be? Yes 8 Hours, Org Admin can configure
7. User Profile:
   * Beyond basic profile fields (name, email, avatar), what other fields are needed? Function, Firstname, Lastname, Speciality, Time Zome, Language
   * Should users have org-specific profiles (e.g., different roles/titles per org)? No
   * Do we need user competencies/skills tracking as mentioned in the docs? Yes
8. Audit & Compliance:
   * What level of audit logging is needed? (all user actions, or specific security events?) All, must be centralized in the Audit Logs Module
   * Should we track login history, IP addresses, device fingerprints? Yes
   * Any specific compliance requirements (GDPR, SOC2, etc.)? GDPR, SOC2

Afficher plus
4:38 PM
Authentication and User Management - Comprehensive Specification
Table of Contents
Overview
System Architecture
Database Schema
API Endpoints
UI Components
UI Pages
Integration Points
Security & Compliance
Implementation Notes
Overview
Purpose
Comprehensive authentication and user management system supporting multiple authentication methods, multi-tenancy with organizations and teams, custom RBAC, and extensive audit logging.

Key Features
Multi-Provider Authentication: Email/Password, OAuth (Google, GitHub), SSO (Azure AD, Okta via SAML 2.0)
Multi-Tenancy: Users can belong to multiple organizations with hierarchical teams
Custom RBAC: Organization-level custom roles with granular permissions
Session Management: Device-specific sessions with configurable limits and timeouts
Audit Logging: Comprehensive audit trail for compliance (GDPR, SOC2)
User Invitations: Email and link-based invitations with 48-hour expiration
Notification Integration: Extensive event-driven notifications
System Architecture
mermaid
graph TB
    subgraph Client["Client Layer"]
        UI[React UI]
        AuthContext[Auth Context]
        OrgContext[Org Context]
    end
    
    subgraph Gateway["API Gateway (Port 3000)"]
        AuthMiddleware[Auth Middleware]
        RBACMiddleware[RBAC Middleware]
        Routes[Route Handlers]
    end
    
    subgraph Services["Microservices"]
        AuthSvc[Auth Service<br/>Port 3021]
        UserSvc[User Service<br/>Port 3022]
        OrgSvc[Organization Service<br/>Port 3023]
        NotifSvc[Notification Service<br/>Port 3001]
        AuditSvc[Audit Service<br/>Port 3024]
    end
    
    subgraph External["External Services"]
        Google[Google OAuth]
        GitHub[GitHub OAuth]
        AzureAD[Azure AD SAML]
        Okta[Okta SAML]
    end
    
    subgraph Infrastructure["Infrastructure"]
        DB[(PostgreSQL)]
        Redis[Redis Cache]
        RabbitMQ[RabbitMQ]
    end
    
    UI -->|IPC/HTTP| Gateway
    Gateway -->|Proxy| AuthSvc
    Gateway -->|Proxy| UserSvc
    Gateway -->|Proxy| OrgSvc
    
    AuthSvc -->|OAuth| Google
    AuthSvc -->|OAuth| GitHub
    AuthSvc -->|SAML| AzureAD
    AuthSvc -->|SAML| Okta
    
    AuthSvc -->|Events| RabbitMQ
    UserSvc -->|Events| RabbitMQ
    OrgSvc -->|Events| RabbitMQ
    
    RabbitMQ -->|Consumes| NotifSvc
    RabbitMQ -->|Consumes| AuditSvc
    
    AuthSvc -->|Data| DB
    UserSvc -->|Data| DB
    OrgSvc -->|Data| DB
    
    AuthSvc -->|Cache| Redis
    Gateway -->|Sessions| Redis
Database Schema
Core Tables
users
sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255), -- NULL for OAuth-only users
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  function VARCHAR(100),
  speciality VARCHAR(100),
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete for GDPR
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin) WHERE is_super_admin = true;
user_auth_providers
sql
CREATE TABLE user_auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'password', 'google', 'github', 'azure_ad', 'okta'
  provider_user_id VARCHAR(255), -- External provider user ID
  provider_data JSONB, -- Additional provider-specific data
  is_primary BOOLEAN DEFAULT false,
  linked_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_user_auth_providers_user_id ON user_auth_providers(user_id);
CREATE INDEX idx_user_auth_providers_provider ON user_auth_providers(provider, provider_user_id);
user_password_history
sql
CREATE TABLE user_password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_password_history_user_id ON user_password_history(user_id);
user_sessions
sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet', 'unknown'
  device_fingerprint VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoke_reason VARCHAR(255)
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at) WHERE is_active = true;
user_login_history
sql
CREATE TABLE user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  country VARCHAR(100),
  city VARCHAR(100),
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX idx_user_login_history_created_at ON user_login_history(created_at DESC);
CREATE INDEX idx_user_login_history_ip ON user_login_history(ip_address) WHERE success = false;
user_competencies
sql
CREATE TABLE user_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency VARCHAR(100) NOT NULL,
  proficiency_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'expert'
  years_of_experience INTEGER,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, competency)
);

CREATE INDEX idx_user_competencies_user_id ON user_competencies(user_id);
CREATE INDEX idx_user_competencies_competency ON user_competencies(competency);
Organization Tables
organizations
sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website VARCHAR(255),
  industry VARCHAR(100),
  size VARCHAR(50), -- 'small', 'medium', 'large', 'enterprise'
  
  -- SSO Configuration
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider VARCHAR(50), -- 'azure_ad', 'okta', null
  sso_config JSONB, -- Provider-specific configuration
  sso_enforce BOOLEAN DEFAULT false, -- Require SSO for all org members
  
  -- Session Configuration
  max_sessions_per_user INTEGER DEFAULT 5,
  session_timeout_hours INTEGER DEFAULT 8,
  session_idle_timeout_hours INTEGER DEFAULT 2,
  require_mfa BOOLEAN DEFAULT false,
  
  -- Security Settings
  password_min_length INTEGER DEFAULT 12,
  password_require_uppercase BOOLEAN DEFAULT true,
  password_require_lowercase BOOLEAN DEFAULT true,
  password_require_numbers BOOLEAN DEFAULT true,
  password_require_special BOOLEAN DEFAULT true,
  password_expiry_days INTEGER, -- NULL = no expiry
  password_history_count INTEGER DEFAULT 5,
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_name ON organizations(name) WHERE deleted_at IS NULL;
organization_members
sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES organization_roles(id) ON DELETE SET NULL,
  is_org_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  removed_at TIMESTAMP,
  
  UNIQUE(organization_id, user_id, removed_at), -- Allow re-adding removed users
  CHECK (removed_at IS NULL OR removed_at > joined_at)
);

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id) WHERE removed_at IS NULL;
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id) WHERE removed_at IS NULL;
CREATE INDEX idx_organization_members_org_admin ON organization_members(organization_id, is_org_admin) WHERE is_org_admin = true AND removed_at IS NULL;
teams
sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, name, deleted_at),
  CHECK (parent_team_id != id) -- Prevent self-reference
);

CREATE INDEX idx_teams_organization_id ON teams(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_parent_team_id ON teams(parent_team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_name ON teams(organization_id, name);
team_members
sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  removed_at TIMESTAMP,
  
  UNIQUE(team_id, user_id, removed_at),
  CHECK (removed_at IS NULL OR removed_at > joined_at)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id) WHERE removed_at IS NULL;
CREATE INDEX idx_team_members_user_id ON team_members(user_id) WHERE removed_at IS NULL;
RBAC Tables
system_permissions
sql
CREATE TABLE system_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'projects.create', 'users.manage'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'projects', 'users', 'teams', 'settings', etc.
  is_system BOOLEAN DEFAULT true, -- System permissions cannot be deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_permissions_category ON system_permissions(category);
CREATE INDEX idx_system_permissions_code ON system_permissions(code);

-- Seed system permissions
INSERT INTO system_permissions (code, name, description, category, is_system) VALUES
  -- User Management
  ('users.view', 'View Users', 'View user profiles and lists', 'users', true),
  ('users.create', 'Create Users', 'Create new users and send invitations', 'users', true),
  ('users.update', 'Update Users', 'Update user profiles and information', 'users', true),
  ('users.delete', 'Delete Users', 'Delete or deactivate users', 'users', true),
  ('users.manage_roles', 'Manage User Roles', 'Assign and modify user roles', 'users', true),
  
  -- Organization Management
  ('organization.view', 'View Organization', 'View organization details and settings', 'organization', true),
  ('organization.update', 'Update Organization', 'Update organization settings', 'organization', true),
  ('organization.delete', 'Delete Organization', 'Delete the organization', 'organization', true),
  ('organization.manage_members', 'Manage Members', 'Add, remove, and manage organization members', 'organization', true),
  ('organization.manage_sso', 'Manage SSO', 'Configure SSO settings', 'organization', true),
  
  -- Team Management
  ('teams.view', 'View Teams', 'View teams and team members', 'teams', true),
  ('teams.create', 'Create Teams', 'Create new teams', 'teams', true),
  ('teams.update', 'Update Teams', 'Update team information', 'teams', true),
  ('teams.delete', 'Delete Teams', 'Delete teams', 'teams', true),
  ('teams.manage_members', 'Manage Team Members', 'Add and remove team members', 'teams', true),
  
  -- Role Management
  ('roles.view', 'View Roles', 'View roles and permissions', 'roles', true),
  ('roles.create', 'Create Roles', 'Create custom roles', 'roles', true),
  ('roles.update', 'Update Roles', 'Update role permissions', 'roles', true),
  ('roles.delete', 'Delete Roles', 'Delete custom roles', 'roles', true),
  
  -- Project Management
  ('projects.view', 'View Projects', 'View projects', 'projects', true),
  ('projects.create', 'Create Projects', 'Create new projects', 'projects', true),
  ('projects.update', 'Update Projects', 'Update project details', 'projects', true),
  ('projects.delete', 'Delete Projects', 'Delete projects', 'projects', true),
  
  -- Settings
  ('settings.view', 'View Settings', 'View system settings', 'settings', true),
  ('settings.update', 'Update Settings', 'Update system settings', 'settings', true),
  
  -- Audit Logs
  ('audit_logs.view', 'View Audit Logs', 'View audit logs and compliance reports', 'audit', true);
organization_roles
sql
CREATE TABLE organization_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for system-wide roles
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System roles cannot be modified/deleted
  is_default BOOLEAN DEFAULT false, -- Assigned to new members by default
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(organization_id, name, deleted_at),
  CHECK (NOT (is_system = true AND organization_id IS NOT NULL)) -- System roles must be org-independent
);

CREATE INDEX idx_organization_roles_org_id ON organization_roles(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organization_roles_is_system ON organization_roles(is_system) WHERE is_system = true;

-- Seed system roles
INSERT INTO organization_roles (name, description, is_system, organization_id) VALUES
  ('Super Admin', 'Full system access across all organizations', true, NULL),
  ('Organization Admin', 'Full access within organization', true, NULL),
  ('Member', 'Standard organization member', true, NULL),
  ('Viewer', 'Read-only access', true, NULL);
role_permissions
sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES organization_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Seed Super Admin permissions (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM organization_roles WHERE name = 'Super Admin' AND is_system = true),
  id
FROM system_permissions;

-- Seed Organization Admin permissions (all except system-wide)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM organization_roles WHERE name = 'Organization Admin' AND is_system = true),
  id
FROM system_permissions
WHERE code NOT LIKE 'system.%';

-- Seed Member permissions (view and basic operations)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM organization_roles WHERE name = 'Member' AND is_system = true),
  id
FROM system_permissions
WHERE code IN (
  'projects.view', 'projects.create', 'projects.update',
  'teams.view', 'users.view', 'organization.view'
);

-- Seed Viewer permissions (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM organization_roles WHERE name = 'Viewer' AND is_system = true),
  id
FROM system_permissions
WHERE code LIKE '%.view';
Invitation Tables
invitations
sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES organization_roles(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  invitation_type VARCHAR(50) NOT NULL, -- 'email', 'link'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES users(id),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,
  metadata JSONB, -- Additional invitation data (e.g., welcome message, teams to join)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CHECK (expires_at > created_at),
  CHECK (accepted_at IS NULL OR accepted_at <= expires_at),
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_invitations_status ON invitations(status);
invitation_usage
sql
CREATE TABLE invitation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  used_by_ip INET,
  used_by_user_agent TEXT,
  used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitation_usage_invitation_id ON invitation_usage(invitation_id);
Audit Tables
audit_logs
sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  
  event_type VARCHAR(100) NOT NULL, -- e.g., 'user.created', 'role.updated', 'login.failed'
  event_category VARCHAR(50) NOT NULL, -- 'auth', 'users', 'organizations', 'teams', 'roles', 'settings'
  event_action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'viewed', 'accessed'
  
  resource_type VARCHAR(100), -- Type of resource affected (e.g., 'user', 'team', 'role')
  resource_id UUID, -- ID of affected resource
  resource_name VARCHAR(255), -- Human-readable resource name
  
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  
  changes JSONB, -- Before/after values for updates
  metadata JSONB, -- Additional context
  
  severity VARCHAR(20) DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('error', 'critical');
API Endpoints
Authentication Service (Port 3021)
OAuth & SSO
POST /auth/oauth/google/initiate

typescript
// Request
{
  organizationId?: string; // Optional org context
  redirectUrl?: string;
}

// Response
{
  authorizationUrl: string;
  state: string; // CSRF token
}
POST /auth/oauth/google/callback

typescript
// Request
{
  code: string;
  state: string;
  organizationId?: string;
}

// Response
{
  token: string;
  refreshToken: string;
  user: UserProfile;
  isNewUser: boolean;
}
POST /auth/oauth/github/initiate

typescript
// Similar to Google OAuth
POST /auth/oauth/github/callback

typescript
// Similar to Google OAuth callback
POST /auth/sso/saml/initiate

typescript
// Request
{
  organizationId: string; // Required for SSO
  provider: 'azure_ad' | 'okta';
}

// Response
{
  ssoUrl: string;
  requestId: string;
}
POST /auth/sso/saml/callback

typescript
// Request
{
  samlResponse: string;
  relayState?: string;
}

// Response
{
  token: string;
  refreshToken: string;
  user: UserProfile;
  organization: Organization;
}
Email/Password Authentication
POST /auth/register

typescript
// Request
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  invitationToken?: string; // If registering via invitation
}

// Response
{
  token: string;
  refreshToken: string;
  user: UserProfile;
  emailVerificationRequired: boolean;
}

// Triggers: 
// - Event: user.registered
// - Notification: welcome email
// - Audit: user.created
POST /auth/login

typescript
// Request
{
  email: string;
  password: string;
  deviceName?: string;
  deviceFingerprint?: string;
  rememberMe?: boolean;
}

// Response
{
  token: string;
  refreshToken: string;
  user: UserProfile;
  session: SessionInfo;
  requiresMfa?: boolean;
  mfaToken?: string; // If MFA enabled
}

// Triggers:
// - Event: user.logged_in
// - Audit: auth.login.success | auth.login.failed
// - Login history entry
POST /auth/logout

typescript
// Request
{
  sessionId?: string; // Logout specific session, or current if not provided
  allSessions?: boolean; // Logout all sessions
}

// Response
{
  success: boolean;
  sessionsRevoked: number;
}

// Triggers:
// - Event: user.logged_out
// - Audit: auth.logout
POST /auth/verify-email

typescript
// Request
{
  token: string;
}

// Response
{
  success: boolean;
  user: UserProfile;
}

// Triggers:
// - Event: user.email_verified
// - Notification: email verification confirmed
// - Audit: user.email_verified
POST /auth/resend-verification

typescript
// Request
{
  email: string;
}

// Response
{
  success: boolean;
  message: string;
}

// Triggers:
// - Notification: verification email
Password Management
POST /auth/password/change

typescript
// Request (authenticated)
{
  currentPassword: string;
  newPassword: string;
  logoutOtherSessions?: boolean;
}

// Response
{
  success: boolean;
  sessionsRevoked?: number;
}

// Validates:
// - Current password correctness
// - New password strength (org policy)
// - Password not in history (org policy)

// Triggers:
// - Event: user.password_changed
// - Notification: password changed confirmation
// - Audit: user.password_changed
POST /auth/password/reset/request

typescript
// Request
{
  email: string;
}

// Response
{
  success: boolean;
  message: string; // Always success to prevent email enumeration
}

// Triggers:
// - Notification: password reset email (if user exists)
// - Audit: auth.password_reset_requested
POST /auth/password/reset/verify

typescript
// Request
{
  token: string;
  newPassword: string;
}

// Response
{
  success: boolean;
  token?: string; // Optional auto-login token
}

// Validates:
// - Token validity
// - Password strength
// - Password not in history

// Triggers:
// - Event: user.password_reset
// - Notification: password reset confirmation
// - Audit: user.password_reset
// - Revokes all existing sessions
Token Management
POST /auth/token/refresh

typescript
// Request
{
  refreshToken: string;
}

// Response
{
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Triggers:
// - Updates session last_activity_at
POST /auth/token/validate

typescript
// Request
{
  token: string;
}

// Response
{
  valid: boolean;
  user?: UserProfile;
  expiresAt?: string;
}
Session Management
GET /auth/sessions

typescript
// Request (authenticated)
// Query params: page, limit

// Response
{
  sessions: Array<{
    id: string;
    deviceName: string;
    deviceType: string;
    ipAddress: string;
    country: string;
    city: string;
    isCurrent: boolean;
    lastActivityAt: string;
    createdAt: string;
    expiresAt: string;
  }>;
  total: number;
  currentSessionId: string;
}
DELETE /auth/sessions/:sessionId

typescript
// Request (authenticated)

// Response
{
  success: boolean;
  message: string;
}

// Triggers:
// - Event: session.revoked
// - Audit: auth.session_revoked
DELETE /auth/sessions

typescript
// Request (authenticated)
{
  excludeCurrent?: boolean; // Keep current session active
}

// Response
{
  success: boolean;
  sessionsRevoked: number;
}

// Triggers:
// - Event: sessions.bulk_revoked
// - Audit: auth.sessions_bulk_revoked
Provider Management
GET /auth/providers

typescript
// Request (authenticated)

// Response
{
  providers: Array<{
    provider: string;
    providerUserId: string;
    isPrimary: boolean;
    linkedAt: string;
    lastUsedAt: string;
  }>;
}
POST /auth/providers/link

typescript
// Request (authenticated)
{
  provider: 'google' | 'github';
  code: string; // OAuth authorization code
}

// Response
{
  success: boolean;
  provider: ProviderInfo;
}

// Triggers:
// - Event: user.provider_linked
// - Notification: provider linked confirmation
// - Audit: user.provider_linked
DELETE /auth/providers/:provider

typescript
// Request (authenticated)

// Response
{
  success: boolean;
}

// Validates:
// - User has at least one remaining auth method

// Triggers:
// - Event: user.provider_unlinked
// - Notification: provider unlinked notification
// - Audit: user.provider_unlinked
User Service (Port 3022)
User Profile
GET /users/me

typescript
// Request (authenticated)

// Response
{
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  function: string;
  speciality: string;
  avatarUrl: string;
  timezone: string;
  language: string;
  emailVerified: boolean;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: string;
  createdAt: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    isOrgAdmin: boolean;
    joinedAt: string;
  }>;
  competencies: Array<Competency>;
}
PUT /users/me

typescript
// Request (authenticated)
{
  firstName?: string;
  lastName?: string;
  username?: string;
  function?: string;
  speciality?: string;
  timezone?: string;
  language?: string;
  avatarUrl?: string;
}

// Response
{
  user: UserProfile;
}

// Triggers:
// - Event: user.profile_updated
// - Audit: user.updated
DELETE /users/me

typescript
// Request (authenticated)
{
  password: string; // Confirmation
  reason?: string;
}

// Response
{
  success: boolean;
}

// GDPR Compliance:
// - Soft delete user account
// - Anonymize audit logs (keep for compliance)
// - Delete personal data
// - Retain anonymized analytics

// Triggers:
// - Event: user.account_deleted
// - Notification: account deletion confirmation
// - Audit: user.deleted
GET /users/:userId

typescript
// Request (authenticated, requires 'users.view' permission)

// Response
{
  user: PublicUserProfile; // Limited fields based on permissions
}
GET /users

typescript
// Request (authenticated, requires 'users.view' permission)
// Query params: page, limit, search, organizationId, teamId, roleId, sortBy, sortOrder

// Response
{
  users: PublicUserProfile[];
  total: number;
  page: number;
  limit: number;
}
User Competencies
GET /users/me/competencies

typescript
// Request (authenticated)

// Response
{
  competencies: Array<{
    id: string;
    competency: string;
    proficiencyLevel: string;
    yearsOfExperience: number;
    verified: boolean;
    verifiedBy?: UserReference;
    verifiedAt?: string;
    createdAt: string;
  }>;
}
POST /users/me/competencies

typescript
// Request (authenticated)
{
  competency: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

// Response
{
  competency: CompetencyInfo;
}

// Triggers:
// - Event: user.competency_added
// - Audit: user.competency_added
PUT /users/me/competencies/:competencyId

typescript
// Request (authenticated)
{
  proficiencyLevel?: string;
  yearsOfExperience?: number;
}

// Response
{
  competency: CompetencyInfo;
}

// Triggers:
// - Event: user.competency_updated
// - Audit: user.competency_updated
DELETE /users/me/competencies/:competencyId

typescript
// Request (authenticated)

// Response
{
  success: boolean;
}

// Triggers:
// - Event: user.competency_removed
// - Audit: user.competency_removed
POST /users/:userId/competencies/:competencyId/verify

typescript
// Request (authenticated, requires org admin or specific permission)
{
  verified: boolean;
}

// Response
{
  competency: CompetencyInfo;
}

// Triggers:
// - Event: user.competency_verified
// - Notification: competency verification notification
// - Audit: user.competency_verified
User Login History
GET /users/me/login-history

typescript
// Request (authenticated)
// Query params: page, limit, startDate, endDate

// Response
{
  loginHistory: Array<{
    id: string;
    provider: string;
    ipAddress: string;
    country: string;
    city: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
    createdAt: string;
  }>;
  total: number;
}
Organization Service (Port 3023)
Organization Management
POST /organizations

typescript
// Request (authenticated)
{
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
}

// Response
{
  organization: Organization;
  membership: OrganizationMembership;
}

// Creates:
// - Organization
// - Creates user as org admin
// - Assigns default role

// Triggers:
// - Event: organization.created
// - Notification: organization created notification
// - Audit: organization.created
GET /organizations/:organizationId

typescript
// Request (authenticated, member of org)

// Response
{
  organization: Organization;
  myRole: string;
  isOrgAdmin: boolean;
  permissions: string[];
}
PUT /organizations/:organizationId

typescript
// Request (authenticated, requires 'organization.update' permission)
{
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
}

// Response
{
  organization: Organization;
}

// Triggers:
// - Event: organization.updated
// - Notification: org admins notified
// - Audit: organization.updated
DELETE /organizations/:organizationId

typescript
// Request (authenticated, org admin only)
{
  confirmationText: string; // Must match org name
}

// Response
{
  success: boolean;
}

// Cascading deletes:
// - Teams
// - Organization memberships
// - Organization roles (custom)
// - Invitations

// Triggers:
// - Event: organization.deleted
// - Notification: all members notified
// - Audit: organization.deleted
GET /organizations

typescript
// Request (authenticated)
// Query params: page, limit, search

// Response
{
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
    myRole: string;
    isOrgAdmin: boolean;
    memberCount: number;
    teamCount: number;
    joinedAt: string;
  }>;
  total: number;
}
Organization Members
GET /organizations/:organizationId/members

typescript
// Request (authenticated, member of org)
// Query params: page, limit, search, roleId, teamId, sortBy, sortOrder

// Response
{
  members: Array<{
    id: string;
    user: PublicUserProfile;
    role: RoleInfo;
    isOrgAdmin: boolean;
    joinedAt: string;
    invitedBy: UserReference;
    teams: TeamReference[];
  }>;
  total: number;
}
GET /organizations/:organizationId/members/:userId

typescript
// Request (authenticated, member of org)

// Response
{
  member: DetailedMemberInfo;
  permissions: string[];
}
PUT /organizations/:organizationId/members/:userId

typescript
// Request (authenticated, requires 'organization.manage_members' permission)
{
  roleId?: string;
  isOrgAdmin?: boolean;
}

// Response
{
  member: MemberInfo;
}

// Validates:
// - Role belongs to organization
// - User has permission to assign role

// Triggers:
// - Event: organization.member_role_changed
// - Notification: user notified of role change
// - Audit: organization.member_updated
DELETE /organizations/:organizationId/members/:userId

typescript
// Request (authenticated, requires 'organization.manage_members' permission)
{
  reason?: string;
}

// Response
{
  success: boolean;
}

// Removes:
// - Organization membership
// - All team memberships in org

// Triggers:
// - Event: organization.member_removed
// - Notification: user notified of removal
// - Audit: organization.member_removed
Organization Settings
GET /organizations/:organizationId/settings

typescript
// Request (authenticated, org admin)

// Response
{
  ssoEnabled: boolean;
  ssoProvider?: string;
  ssoEnforce: boolean;
  maxSessionsPerUser: number;
  sessionTimeoutHours: number;
  sessionIdleTimeoutHours: number;
  requireMfa: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  passwordExpiryDays?: number;
  passwordHistoryCount: number;
}
PUT /organizations/:organizationId/settings

typescript
// Request (authenticated, org admin)
{
  maxSessionsPerUser?: number;
  sessionTimeoutHours?: number;
  sessionIdleTimeoutHours?: number;
  requireMfa?: boolean;
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireLowercase?: boolean;
  passwordRequireNumbers?: boolean;
  passwordRequireSpecial?: boolean;
  passwordExpiryDays?: number;
  passwordHistoryCount?: number;
}

// Response
{
  settings: OrganizationSettings;
}

// Triggers:
// - Event: organization.settings_updated
// - Notification: org admins notified
// - Audit: organization.settings_updated
SSO Configuration
GET /organizations/:organizationId/sso/config

typescript
// Request (authenticated, requires 'organization.manage_sso' permission)

// Response
{
  enabled: boolean;
  provider?: 'azure_ad' | 'okta';
  enforce: boolean;
  config?: {
    // Provider-specific configuration
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    // ... other SAML fields
  };
}
PUT /organizations/:organizationId/sso/config

typescript
// Request (authenticated, requires 'organization.manage_sso' permission)
{
  enabled: boolean;
  provider: 'azure_ad' | 'okta';
  enforce?: boolean;
  config: {
    entityId: string;
    ssoUrl: string;
    certificate: string;
    // Provider-specific fields
  };
}

// Response
{
  ssoConfig: SSOConfiguration;
}

// Validates:
// - SAML configuration
// - Certificate validity
// - SSO connectivity test

// Triggers:
// - Event: organization.sso_configured
// - Notification: org admins and members notified
// - Audit: organization.sso_configured
POST /organizations/:organizationId/sso/test

typescript
// Request (authenticated, org admin)

// Response
{
  success: boolean;
  message: string;
  details?: any;
}
Teams
POST /organizations/:organizationId/teams

typescript
// Request (authenticated, requires 'teams.create' permission)
{
  name: string;
  description?: string;
  parentTeamId?: string;
  avatarUrl?: string;
}

// Response
{
  team: Team;
}

// Validates:
// - Parent team exists in same org
// - No circular hierarchy

// Triggers:
// - Event: team.created
// - Notification: org admins notified
// - Audit: team.created
GET /organizations/:organizationId/teams

typescript
// Request (authenticated, member of org)
// Query params: page, limit, search, parentTeamId, includeSubteams

// Response
{
  teams: Array<{
    id: string;
    name: string;
    description: string;
    avatarUrl: string;
    parentTeam?: TeamReference;
    memberCount: number;
    subteamCount: number;
    createdAt: string;
  }>;
  total: number;
}
GET /organizations/:organizationId/teams/:teamId

typescript
// Request (authenticated, member of org)

// Response
{
  team: Team;
  members: Array<{
    user: PublicUserProfile;
    joinedAt: string;
  }>;
  subteams: TeamReference[];
  hierarchy: TeamReference[]; // Breadcrumb from root to current
}
PUT /organizations/:organizationId/teams/:teamId

typescript
// Request (authenticated, requires 'teams.update' permission)
{
  name?: string;
  description?: string;
  parentTeamId?: string; // null to remove parent
  avatarUrl?: string;
}

// Response
{
  team: Team;
}

// Validates:
// - No circular hierarchy when changing parent

// Triggers:
// - Event: team.updated
// - Notification: team members notified
// - Audit: team.updated
DELETE /organizations/:organizationId/teams/:teamId

typescript
// Request (authenticated, requires 'teams.delete' permission)
{
  moveSubteamsTo?: string; // Parent team ID, or null to move to root
  removeMemberships?: boolean; // Remove all team memberships
}

// Response
{
  success: boolean;
}

// Triggers:
// - Event: team.deleted
// - Notification: team members notified
// - Audit: team.deleted
Team Members
POST /organizations/:organizationId/teams/:teamId/members

typescript
// Request (authenticated, requires 'teams.manage_members' permission)
{
  userIds: string[];
}

// Response
{
  added: number;
  members: TeamMember[];
}

// Validates:
// - Users are org members
// - Users not already in team

// Triggers:
// - Event: team.members_added
// - Notification: users notified
// - Audit: team.members_added
GET /organizations/:organizationId/teams/:teamId/members

typescript
// Request (authenticated, member of org)
// Query params: page, limit, search

// Response
{
  members: Array<{
    user: PublicUserProfile;
    role: RoleInfo;
    joinedAt: string;
    addedBy: UserReference;
  }>;
  total: number;
}
DELETE /organizations/:organizationId/teams/:teamId/members/:userId

typescript
// Request (authenticated, requires 'teams.manage_members' permission)

// Response
{
  success: boolean;
}

// Triggers:
// - Event: team.member_removed
// - Notification: user notified
// - Audit: team.member_removed
Roles & Permissions
GET /organizations/:organizationId/roles

typescript
// Request (authenticated, member of org)

// Response
{
  roles: Array<{
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    isDefault: boolean;
    memberCount: number;
    permissions: PermissionInfo[];
    createdBy?: UserReference;
    createdAt: string;
  }>;
}
POST /organizations/:organizationId/roles

typescript
// Request (authenticated, requires 'roles.create' permission)
{
  name: string;
  description?: string;
  permissionIds: string[];
  isDefault?: boolean;
}

// Response
{
  role: Role;
}

// Validates:
// - Name unique within org
// - Permission IDs exist
// - User has permissions being granted

// Triggers:
// - Event: role.created
// - Notification: org admins notified
// - Audit: role.created
GET /organizations/:organizationId/roles/:roleId

typescript
// Request (authenticated, member of org)

// Response
{
  role: Role;
  permissions: PermissionInfo[];
  memberCount: number;
}
PUT /organizations/:organizationId/roles/:roleId

typescript
// Request (authenticated, requires 'roles.update' permission)
{
  name?: string;
  description?: string;
  permissionIds?: string[];
  isDefault?: boolean;
}

// Response
{
  role: Role;
}

// Validates:
// - Cannot modify system roles
// - User has permissions being granted

// Triggers:
// - Event: role.updated
// - Notification: users with this role notified
// - Audit: role.updated
DELETE /organizations/:organizationId/roles/:roleId

typescript
// Request (authenticated, requires 'roles.delete' permission)
{
  reassignToRoleId?: string; // Reassign members to this role
}

// Response
{
  success: boolean;
}

// Validates:
// - Cannot delete system roles
// - Cannot delete if members exist (unless reassignToRoleId provided)

// Triggers:
// - Event: role.deleted
// - Notification: affected users notified
// - Audit: role.deleted
GET /organizations/:organizationId/permissions

typescript
// Request (authenticated, member of org)

// Response
{
  permissions: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    isSystem: boolean;
  }>;
  categories: string[];
}
Invitations
POST /organizations/:organizationId/invitations

typescript
// Request (authenticated, requires 'users.create' permission)
{
  email: string;
  roleId?: string; // Defaults to default role
  invitationType: 'email' | 'link';
  message?: string;
  teamIds?: string[]; // Auto-add to teams after acceptance
}

// Response
{
  invitation: Invitation;
  invitationLink?: string; // If type is 'link'
}

// Validates:
// - Email not already org member
// - Role belongs to org
// - Teams belong to org

// Triggers:
// - Event: invitation.created
// - Notification: invitation email sent (if type is 'email')
// - Audit: invitation.created
GET /organizations/:organizationId/invitations

typescript
// Request (authenticated, requires 'organization.manage_members' permission)
// Query params: page, limit, status, email

// Response
{
  invitations: Array<{
    id: string;
    email: string;
    role: RoleInfo;
    invitationType: string;
    status: string;
    invitedBy: UserReference;
    expiresAt: string;
    acceptedAt?: string;
    acceptedBy?: UserReference;
    createdAt: string;
  }>;
  total: number;
}
DELETE /organizations/:organizationId/invitations/:invitationId

typescript
// Request (authenticated, requires 'organization.manage_members' permission or is inviter)
{
  reason?: string;
}

// Response
{
  success: boolean;
}

// Triggers:
// - Event: invitation.revoked
// - Notification: invitee notified (if email type)
// - Audit: invitation.revoked
POST /invitations/accept

typescript
// Request (may be unauthenticated for new users)
{
  invitationToken: string;
  // If new user:
  password?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

// Response
{
  success: boolean;
  token?: string; // JWT if new user created/authenticated
  user?: UserProfile;
  organization: Organization;
  requiresEmailVerification?: boolean;
}

// Creates:
// - New user if email doesn't exist
// - Organization membership
// - Team memberships (if specified in invitation)

// Triggers:
// - Event: invitation.accepted
// - Event: organization.member_joined
// - Notification: inviter notified
// - Notification: welcome notification
// - Audit: invitation.accepted
GET /invitations/:token/preview

typescript
// Request (unauthenticated)

// Response
{
  organization: {
    name: string;
    logoUrl: string;
  };
  invitedBy: {
    name: string;
    avatarUrl: string;
  };
  role: string;
  expiresAt: string;
  status: string;
}
Audit Service (Port 3024)
GET /audit-logs

typescript
// Request (authenticated, requires 'audit_logs.view' permission)
// Query params: 
//   - organizationId (required unless super admin)
//   - page, limit
//   - startDate, endDate
//   - eventType, eventCategory, eventAction
//   - userId, resourceType, resourceId
//   - severity
//   - search

// Response
{
  logs: Array<{
    id: string;
    eventType: string;
    eventCategory: string;
    eventAction: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    user: UserReference;
    ipAddress: string;
    country: string;
    city: string;
    changes?: any;
    metadata?: any;
    severity: string;
    success: boolean;
    errorMessage?: string;
    createdAt: string;
  }>;
  total: number;
  summary: {
    totalEvents: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Array<{ userId: string; count: number }>;
  };
}
GET /audit-logs/:logId

typescript
// Request (authenticated, requires 'audit_logs.view' permission)

// Response
{
  log: DetailedAuditLog;
  relatedLogs: AuditLog[]; // Related events (same resource, session, etc.)
}
POST /audit-logs/export

typescript
// Request (authenticated, requires 'audit_logs.view' permission)
{
  organizationId: string;
  startDate: string;
  endDate: string;
  format: 'csv' | 'json' | 'pdf';
  filters?: AuditLogFilters;
}

// Response
{
  downloadUrl: string;
  expiresAt: string;
}

// Triggers:
// - Event: audit_logs.exported
// - Audit: audit_logs.exported
GET /audit-logs/compliance-report

typescript
// Request (authenticated, requires 'audit_logs.view' permission)
// Query params: organizationId, startDate, endDate, standard (gdpr|soc2)

// Response
{
  report: {
    standard: string;
    period: { start: string; end: string };
    summary: {
      totalEvents: number;
      securityEvents: number;
      accessChanges: number;
      dataAccess: number;
      failedLogins: number;
    };
    findings: Array<{
      category: string;
      severity: string;
      description: string;
      count: number;
      recommendation?: string;
    }>;
    userActivity: Array<{
      user: UserReference;
      loginCount: number;
      dataAccessCount: number;
      changes: number;
    }>;
  };
}
UI Components
Authentication Components
LoginForm
typescript
interface LoginFormProps {
  onSuccess: (user: UserProfile, token: string) => void;
  onError: (error: Error) => void;
  redirectTo?: string;
  organizationSlug?: string; // For SSO context
}

// Features:
// - Email/password fields
// - Remember me checkbox
// - "Forgot password" link
// - OAuth buttons (Google, GitHub)
// - SSO button (if org context)
// - Loading states
// - Error display
// - Password visibility toggle
RegisterForm
typescript
interface RegisterFormProps {
  onSuccess: (user: UserProfile, token: string) => void;
  onError: (error: Error) => void;
  invitationToken?: string;
}

// Features:
// - Email, password, first name, last name, username
// - Password strength indicator
// - Terms & conditions checkbox
// - OAuth registration options
// - Real-time validation
// - Invitation context display (if token provided)
SSOButton
typescript
interface SSOButtonProps {
  organizationSlug: string;
  provider: 'azure_ad' | 'okta';
  onInitiate: () => void;
  disabled?: boolean;
}

// Features:
// - Provider-specific branding
// - Organization context
// - Loading state
OAuthButtons
typescript
interface OAuthButtonsProps {
  providers: Array<'google' | 'github'>;
  onProviderClick: (provider: string) => void;
  disabled?: boolean;
  mode?: 'login' | 'register' | 'link';
}

// Features:
// - Provider-specific buttons
// - Loading states per provider
// - Disabled state management
PasswordResetForm
typescript
interface PasswordResetFormProps {
  mode: 'request' | 'reset';
  token?: string; // For reset mode
  onSuccess: () => void;
  onError: (error: Error) => void;
}

// Features:
// - Email input (request mode)
// - Password + confirm password (reset mode)
// - Password strength indicator
// - Success confirmation
EmailVerificationPrompt
typescript
interface EmailVerificationPromptProps {
  email: string;
  onResend: () => void;
  onChangeEmail: () => void;
}

// Features:
// - Verification instructions
// - Resend button with cooldown
// - Email change option
MFASetup (Future)
typescript
interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}
User Profile Components
UserAvatar
typescript
interface UserAvatarProps {
  user: UserReference;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  onClick?: () => void;
}

// Features:
// - Image or initials fallback
// - Online status indicator (green dot)
// - Clickable for profile view
// - Responsive sizes
UserCard
typescript
interface UserCardProps {
  user: PublicUserProfile;
  showCompetencies?: boolean;
  showRole?: boolean;
  showActions?: boolean;
  onMessage?: () => void;
  onViewProfile?: () => void;
}

// Features:
// - Avatar, name, role
// - Competencies badges
// - Quick actions (message, view profile)
// - Hover card with more details
UserProfileEditor
typescript
interface UserProfileEditorProps {
  user: UserProfile;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
}

// Features:
// - Form fields for all profile fields
// - Avatar upload
// - Timezone selector
// - Language selector
// - Validation
// - Save/cancel actions
UserSelector
typescript
interface UserSelectorProps {
  organizationId?: string;
  teamId?: string;
  excludeUserIds?: string[];
  multiple?: boolean;
  value?: string | string[];
  onChange: (userIds: string | string[]) => void;
  placeholder?: string;
}

// Features:
// - Searchable dropdown
// - Avatar + name display
// - Multi-select support
// - Filtering options
// - Recently selected
CompetencyBadge
typescript
interface CompetencyBadgeProps {
  competency: string;
  proficiencyLevel?: string;
  verified?: boolean;
  onClick?: () => void;
}

// Features:
// - Color-coded by proficiency
// - Verified checkmark icon
// - Tooltip with details
CompetencyManager
typescript
interface CompetencyManagerProps {
  userId: string;
  competencies: Competency[];
  canEdit: boolean;
  canVerify: boolean;
  onAdd: (competency: Competency) => void;
  onUpdate: (id: string, updates: Partial<Competency>) => void;
  onRemove: (id: string) => void;
  onVerify: (id: string, verified: boolean) => void;
}

// Features:
// - List of competencies with badges
// - Add new competency form
// - Edit proficiency level
// - Verify button (if permission)
// - Remove competency
Organization Components
OrganizationCard
typescript
interface OrganizationCardProps {
  organization: Organization;
  membership: OrganizationMembership;
  onClick?: () => void;
  showMembers?: boolean;
  showTeams?: boolean;
}

// Features:
// - Logo, name, member count, team count
// - Role badge
// - Admin indicator
// - Click to view/switch
OrganizationSwitcher
typescript
interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganizationId?: string;
  onSwitch: (orgId: string) => void;
  onCreateNew: () => void;
}

// Features:
// - Dropdown with org list
// - Current org highlighted
// - Quick create button
// - Organization logos
// - Role indicators
CreateOrganizationModal
typescript
interface CreateOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (org: Organization) => void;
}

// Features:
// - Form fields: name, slug, description, industry, size
// - Logo upload
// - Slug auto-generation from name
// - Validation
// - Loading state
OrganizationSettingsForm
typescript
interface OrganizationSettingsFormProps {
  organization: Organization;
  settings: OrganizationSettings;
  onSave: (updates: Partial<OrganizationSettings>) => Promise<void>;
  canEdit: boolean;
}

// Features:
// - Sections: General, Security, Sessions
// - Session timeout controls
// - Password policy controls
// - MFA toggle
// - Save button
SSOConfigurationForm
typescript
interface SSOConfigurationFormProps {
  organizationId: string;
  ssoConfig?: SSOConfiguration;
  onSave: (config: SSOConfiguration) => Promise<void>;
  onTest: () => Promise<void>;
  canEdit: boolean;
}

// Features:
// - Provider selection (Azure AD, Okta)
// - SAML configuration fields
// - Certificate upload
// - Test SSO button
// - Enable/disable toggle
// - Enforce SSO toggle
// - Instructions and help text
AddMemberModal
typescript
interface AddMemberModalProps {
  organizationId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (member: OrganizationMember) => void;
}

// Features:
// - User search/select
// - Role selection
// - Team selection (optional)
// - Invite button
InviteMemberModal
typescript
interface InviteMemberModalProps {
  organizationId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (invitation: Invitation) => void;
}

// Features:
// - Email input
// - Role selection
// - Team selection (multi-select)
// - Invitation type (email/link)
// - Custom message field
// - Generate link button
// - Copy link button
OrganizationMembersList
typescript
interface OrganizationMembersListProps {
  organizationId: string;
  members: OrganizationMember[];
  currentUserId: string;
  onUpdateRole: (userId: string, roleId: string) => void;
  onRemove: (userId: string) => void;
  onViewProfile: (userId: string) => void;
  canManage: boolean;
}

// Features:
// - Sortable table/list
// - Search and filters (role, team)
// - Avatar, name, role, teams, join date
// - Actions menu (change role, remove)
// - Bulk actions
Team Components
TeamCard
typescript
interface TeamCardProps {
  team: Team;
  memberCount: number;
  onClick?: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Features:
// - Team name, description
// - Avatar/icon
// - Member count
// - Parent team breadcrumb
// - Actions menu
TeamHierarchyTree
typescript
interface TeamHierarchyTreeProps {
  teams: Team[];
  selectedTeamId?: string;
  onSelectTeam: (teamId: string) => void;
  expandable?: boolean;
  showMemberCount?: boolean;
}

// Features:
// - Collapsible tree view
// - Parent-child relationships
// - Selection state
// - Member counts
// - Drag-and-drop reordering (if editable)
TeamFormModal
typescript
interface TeamFormModalProps {
  organizationId: string;
  team?: Team; // For edit mode
  parentTeamId?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (team: Team) => void;
}

// Features:
// - Name, description fields
// - Parent team selector (tree view)
// - Avatar upload
// - Validation
// - Create/update button
TeamMembersList
typescript
interface TeamMembersListProps {
  teamId: string;
  members: TeamMember[];
  onAdd: () => void;
  onRemove: (userId: string) => void;
  canManage: boolean;
}

// Features:
// - Member list with avatars
// - Role display
// - Join date
// - Remove button
// - Add members button
AddTeamMembersModal
typescript
interface AddTeamMembersModalProps {
  organizationId: string;
  teamId: string;
  existingMemberIds: string[];
  open: boolean;
  onClose: () => void;
  onSuccess: (userIds: string[]) => void;
}

// Features:
// - User multi-select
// - Excludes existing members
// - Search functionality
// - Selected count
// - Add button
RBAC Components
RoleCard
typescript
interface RoleCardProps {
  role: Role;
  memberCount: number;
  isDefault?: boolean;
  isSystem?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
}

// Features:
// - Role name, description
// - Member count
// - System/default badges
// - Permission count
// - Actions menu
RolesList
typescript
interface RolesListProps {
  roles: Role[];
  onSelect: (roleId: string) => void;
  onEdit: (roleId: string) => void;
  onDelete: (roleId: string) => void;
  onCreate: () => void;
  canManage: boolean;
}

// Features:
// - Sortable list/table
// - System roles highlighted
// - Default role indicator
// - Member counts
// - Actions per role
// - Create role button
RoleEditorModal
typescript
interface RoleEditorModalProps {
  organizationId: string;
  role?: Role; // For edit mode
  permissions: Permission[];
  open: boolean;
  onClose: () => void;
  onSuccess: (role: Role) => void;
}

// Features:
// - Name, description fields
// - Permission selection (grouped by category)
// - Select all by category
// - Search permissions
// - Default role toggle
// - Validation
// - Create/update button
PermissionMatrix
typescript
interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  readOnly?: boolean;
  onChange?: (roleId: string, permissionId: string, granted: boolean) => void;
}

// Features:
// - Grid view: roles × permissions
// - Checkboxes for granted permissions
// - Category grouping
// - Sticky headers
// - Highlight system roles
PermissionCategoryAccordion
typescript
interface PermissionCategoryAccordionProps {
  categories: Array<{
    name: string;
    permissions: Permission[];
  }>;
  selectedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
  readOnly?: boolean;
}

// Features:
// - Expandable categories
// - Select all per category
// - Checkbox per permission
// - Permission descriptions on hover
Session Management Components
ActiveSessionsList
typescript
interface ActiveSessionsListProps {
  sessions: UserSession[];
  currentSessionId: string;
  onRevoke: (sessionId: string) => void;
  onRevokeAll: (excludeCurrent: boolean) => void;
}

// Features:
// - List of sessions with details
// - Current session highlighted
// - Device icons
// - Location and last activity
// - Revoke button per session
// - Revoke all button
SessionCard
typescript
interface SessionCardProps {
  session: UserSession;
  isCurrent: boolean;
  onRevoke: () => void;
}

// Features:
// - Device name and type icon
// - Location (country, city)
// - IP address
// - Last activity timestamp
// - Created timestamp
// - Expires timestamp
// - Current badge
// - Revoke button
LoginHistoryList
typescript
interface LoginHistoryListProps {
  loginHistory: LoginHistoryEntry[];
  onLoadMore: () => void;
  hasMore: boolean;
}

// Features:
// - Timeline view
// - Success/failure indicators
// - Provider icons
// - Location and device info
// - Timestamps
// - Infinite scroll or pagination
Invitation Components
InvitationsList
typescript
interface InvitationsListProps {
  invitations: Invitation[];
  onRevoke: (invitationId: string) => void;
  onResend: (invitationId: string) => void;
  canManage: boolean;
}

// Features:
// - List/table of invitations
// - Status badges (pending, accepted, expired)
// - Email, role, inviter
// - Expiration countdown
// - Actions (revoke, resend)
// - Copy link button (for link invitations)
InvitationAcceptPage
typescript
interface InvitationAcceptPageProps {
  invitation: InvitationPreview;
  onAccept: (userData?: NewUserData) => Promise<void>;
}

// Features:
// - Organization info display
// - Inviter info
// - Role information
// - Accept button (logged in)
// - Register form (new user)
// - Login form (existing user)
Audit Components
AuditLogViewer
typescript
interface AuditLogViewerProps {
  organizationId: string;
  filters?: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
  onExport: (format: 'csv' | 'json' | 'pdf') => void;
  canExport: boolean;
}

// Features:
// - Filterable table
// - Search
// - Date range picker
// - Event type filters
// - User filter
// - Severity filter
// - Category filter
// - Timeline view option
// - Export button
AuditLogEntry
typescript
interface AuditLogEntryProps {
  log: AuditLog;
  onClick: () => void;
  expandable?: boolean;
}

// Features:
// - Event summary
// - User and timestamp
// - Severity indicator
// - Resource information
// - Changes preview (if applicable)
// - Click to expand details
AuditLogDetailModal
typescript
interface AuditLogDetailModalProps {
  log: DetailedAuditLog;
  relatedLogs: AuditLog[];
  open: boolean;
  onClose: () => void;
}

// Features:
// - Full log details
// - Before/after changes (diff view)
// - Metadata display
// - Related events
// - Session information
// - Device and location
ComplianceReportViewer
typescript
interface ComplianceReportViewerProps {
  organizationId: string;
  standard: 'gdpr' | 'soc2';
  dateRange: { start: Date; end: Date };
  onGenerateReport: () => void;
}

// Features:
// - Report summary cards
// - Findings list
// - User activity breakdown
// - Charts and visualizations
// - Export options
// - Period selector
Utility Components
PasswordStrengthIndicator
typescript
interface PasswordStrengthIndicatorProps {
  password: string;
  requirements?: PasswordRequirements;
}

// Features:
// - Visual strength meter
// - Requirements checklist
// - Color-coded (red, yellow, green)
// - Real-time validation
ConfirmationDialog
typescript
interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  requiresTextConfirmation?: boolean;
  confirmationText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Features:
// - Modal dialog
// - Custom text
// - Destructive variant (red)
// - Optional text input confirmation
// - Confirm/cancel buttons
EmptyState
typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Features:
// - Icon or illustration
// - Title and description
// - Optional call-to-action button
```

---

## UI Pages

### Authentication Pages

#### `LoginPage`
**Route**: `/login`

**Components**:
- `LoginForm`
- `OAuthButtons`
- `SSOButton` (if org context)
- Links to register and password reset

**Features**:
- Organization context detection (from URL param or subdomain)
- Remember me functionality
- Redirect after successful login
- Display SSO button if org has SSO enabled

**Layout**:
```
┌─────────────────────────────────────┐
│         [App Logo]                  │
│                                     │
│    Welcome back                     │
│                                     │
│    ┌──────────────────────────┐    │
│    │ Email                    │    │
│    └──────────────────────────┘    │
│    ┌──────────────────────────┐    │
│    │ Password          [👁]   │    │
│    └──────────────────────────┘    │
│    ☐ Remember me                   │
│                                     │
│    [Sign In]                        │
│                                     │
│    Forgot password?                 │
│                                     │
│    ──── OR ────                     │
│                                     │
│    [Continue with Google]           │
│    [Continue with GitHub]           │
│    [Sign in with SSO] (if enabled)  │
│                                     │
│    Don't have an account? Register  │
└─────────────────────────────────────┘
RegisterPage
Route: /register

Components:

RegisterForm
OAuthButtons
PasswordStrengthIndicator
Link to login
Features:

Invitation token handling
Email verification flow
Password strength validation
Terms & conditions acceptance
PasswordResetPage
Route: /reset-password

Components:

PasswordResetForm (request mode)
Features:

Email input for reset request
Success message
Link back to login
PasswordResetConfirmPage
Route: /reset-password/:token

Components:

PasswordResetForm (reset mode)
PasswordStrengthIndicator
Features:

Token validation
New password input
Auto-login after reset
EmailVerificationPage
Route: /verify-email/:token

Components:

EmailVerificationPrompt
Success/error messages
Features:

Auto-verify on page load
Resend verification option
Redirect to dashboard after verification
SSOCallbackPage
Route: /auth/sso/callback

Features:

Handle SAML response
Show loading state
Error handling
Redirect to dashboard or original destination
InvitationAcceptPage
Route: /invitations/:token

Components:

InvitationAcceptPage
RegisterForm (if new user)
LoginForm (if existing user)
Features:

Display invitation details
Different flows for new vs existing users
Auto-redirect after acceptance
User Management Pages
UserProfilePage
Route: /profile or /users/:userId

Tabs:

Overview
UserProfileEditor (if own profile)
Profile display
Competencies section
Activity summary
Security
ActiveSessionsList
LoginHistoryList
Password change form
Linked providers management
MFA settings (future)
Organizations
List of organizations
Roles per organization
Quick switch
Activity
Recent activity feed
Project contributions
Team collaborations
Features:

Edit mode toggle (own profile)
Change password
Manage sessions
View/edit competencies
Avatar upload
UserManagementPage
Route: /users

Components:

OrganizationMembersList
UserCard (in list)
InviteMemberModal
AddMemberModal
Search and filters
Features:

View all org members
Invite new members
Manage roles
Remove members
Export member list
Requires: users.view permission

UserDetailPage
Route: /users/:userId/details

Components:

UserCard
CompetencyManager
Activity timeline
Team memberships
Project assignments
Features:

View user details
Verify competencies (if admin)
Change role (if admin)
Remove from org (if admin)
Message user
View contributions
Organization Management Pages
OrganizationDashboardPage
Route: /organizations/:organizationId/dashboard

Components:

Organization overview cards
Member count, team count
Recent activity
Quick actions
Features:

Overview metrics
Recent members joined
Recent activity
Quick links to settings
OrganizationSettingsPage
Route: /organizations/:organizationId/settings

Tabs:

General
Organization info form
Logo upload
Danger zone (delete org)
Security
OrganizationSettingsForm
Password policies
Session settings
MFA settings
SSO Configuration
SSOConfigurationForm
Provider selection
SAML configuration
Test SSO
Invitations
InvitationsList
Active invitations
Expired invitations
Invitation settings
Requires: Organization admin or specific permissions

OrganizationMembersPage
Route: /organizations/:organizationId/members

Components:

OrganizationMembersList
InviteMemberModal
AddMemberModal
Search, sort, filter controls
Features:

View all members
Invite members
Manage member roles
Remove members
Bulk actions
Export members
Requires: organization.manage_members permission

OrganizationTeamsPage
Route: /organizations/:organizationId/teams

Components:

TeamHierarchyTree
TeamCard (grid view)
TeamFormModal
Create team button
Features:

View all teams
Tree and grid views
Create teams
Edit teams
Delete teams
Manage team hierarchies
Requires: teams.view permission

Team Management Pages
TeamDetailPage
Route: /organizations/:organizationId/teams/:teamId

Tabs:

Overview
Team info
Description
Parent/child teams
Statistics
Members
TeamMembersList
Add members
Remove members
Projects
Projects assigned to team
Create project
Activity
Team activity feed
Recent contributions
Features:

View team details
Edit team (if permission)
Manage members (if permission)
View team projects
Team activity
TeamsListPage
Route: /organizations/:organizationId/teams/list

Components:

TeamHierarchyTree (sidebar)
TeamCard (main area)
Search and filters
Create team button
Features:

Browse all teams
Hierarchical navigation
Search teams
Quick team creation
RBAC Pages
RolesManagementPage
Route: /organizations/:organizationId/roles

Components:

RolesList
RoleCard
RoleEditorModal
Create role button
Features:

View all roles
Create custom roles
Edit roles
Delete roles (non-system)
View role permissions
View member count per role
Requires: roles.view permission

RoleDetailPage
Route: /organizations/:organizationId/roles/:roleId

Tabs:

Overview
Role info
Permission list
Member count
Permissions
PermissionCategoryAccordion
Edit permissions (if allowed)
Members
List of members with this role
Assign role to members
Features:

View role details
Edit permissions (if permission)
View assigned members
Assign role to users
PermissionsMatrixPage
Route: /organizations/:organizationId/permissions-matrix

Components:

PermissionMatrix
Filters (roles, categories)
Export button
Features:

Overview of all role permissions
Side-by-side comparison
Export matrix
Requires: roles.view permission

Audit & Compliance Pages
AuditLogsPage
Route: /organizations/:organizationId/audit-logs

Components:

AuditLogViewer
AuditLogEntry
AuditLogDetailModal
Advanced filters
Export button
Features:

View all audit logs
Search logs
Filter by multiple criteria
Timeline view
Export logs (CSV, JSON, PDF)
View log details
Requires: audit_logs.view permission

ComplianceReportsPage
Route: /organizations/:organizationId/compliance

Components:

ComplianceReportViewer
Report filters
Export button
Features:

Generate compliance reports
GDPR compliance view
SOC2 compliance view
Period selection
Export reports
Requires: audit_logs.view permission

Session Management Pages
SessionsPage
Route: /sessions

Components:

ActiveSessionsList
SessionCard
Revoke all button
Features:

View all active sessions
Revoke individual sessions
Revoke all sessions (except current)
Session details
LoginHistoryPage
Route: /login-history

Components:

LoginHistoryList
Filters (date range, status)
Export button
Features:

View login history
Filter by success/failure
Filter by date range
Export history
Integration Points
Notification Service Integration
The authentication and user management system integrates extensively with the Notification Service (Port 3001) to deliver notifications across multiple channels.

Events Published to RabbitMQ
All events are published to user_management.events exchange:

typescript
// Event structure
interface UserManagementEvent {
  eventType: string;
  eventCategory: string;
  timestamp: string;
  organizationId?: string;
  userId?: string;
  actorId: string; // User who triggered the event
  data: any;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}
Authentication Events:

typescript
// user.registered
{
  eventType: 'user.registered',
  eventCategory: 'auth',
  userId: string,
  data: {
    email: string,
    name: string,
    provider: string
  }
}

// user.logged_in
{
  eventType: 'user.logged_in',
  eventCategory: 'auth',
  userId: string,
  data: {
    provider: string,
    deviceName: string,
    location: { country, city }
  }
}

// user.logged_out
{
  eventType: 'user.logged_out',
  eventCategory: 'auth',
  userId: string,
  data: {
    sessionId: string
  }
}

// user.email_verified
{
  eventType: 'user.email_verified',
  eventCategory: 'auth',
  userId: string
}

// user.password_changed
{
  eventType: 'user.password_changed',
  eventCategory: 'auth',
  userId: string,
  data: {
    sessionsRevoked: number
  }
}

// user.password_reset
{
  eventType: 'user.password_reset',
  eventCategory: 'auth',
  userId: string
}

// user.provider_linked
{
  eventType: 'user.provider_linked',
  eventCategory: 'auth',
  userId: string,
  data: {
    provider: string
  }
}

// user.provider_unlinked
{
  eventType: 'user.provider_unlinked',
  eventCategory: 'auth',
  userId: string,
  data: {
    provider: string
  }
}

// session.revoked
{
  eventType: 'session.revoked',
  eventCategory: 'auth',
  userId: string,
  data: {
    sessionId: string,
    deviceName: string
  }
}

// sessions.bulk_revoked
{
  eventType: 'sessions.bulk_revoked',
  eventCategory: 'auth',
  userId: string,
  data: {
    sessionsRevoked: number
  }
}
User Management Events:

typescript
// user.profile_updated
{
  eventType: 'user.profile_updated',
  eventCategory: 'users',
  userId: string,
  data: {
    changes: Record<string, { old: any, new: any }>
  }
}

// user.competency_added
{
  eventType: 'user.competency_added',
  eventCategory: 'users',
  userId: string,
  data: {
    competency: string,
    proficiencyLevel: string
  }
}

// user.competency_verified
{
  eventType: 'user.competency_verified',
  eventCategory: 'users',
  userId: string,
  actorId: string, // Verifier
  data: {
    competency: string,
    verified: boolean
  }
}

// user.account_deleted
{
  eventType: 'user.account_deleted',
  eventCategory: 'users',
  userId: string,
  data: {
    reason?: string
  }
}
Organization Events:

typescript
// organization.created
{
  eventType: 'organization.created',
  eventCategory: 'organizations',
  organizationId: string,
  actorId: string,
  data: {
    name: string,
    slug: string
  }
}

// organization.updated
{
  eventType: 'organization.updated',
  eventCategory: 'organizations',
  organizationId: string,
  actorId: string,
  data: {
    changes: Record<string, { old: any, new: any }>
  }
}

// organization.deleted
{
  eventType: 'organization.deleted',
  eventCategory: 'organizations',
  organizationId: string,
  actorId: string,
  data: {
    name: string
  }
}

// organization.member_joined
{
  eventType: 'organization.member_joined',
  eventCategory: 'organizations',
  organizationId: string,
  userId: string, // New member
  actorId: string, // Inviter or self if self-registered
  data: {
    role: string,
    viaInvitation: boolean
  }
}

// organization.member_role_changed
{
  eventType: 'organization.member_role_changed',
  eventCategory: 'organizations',
  organizationId: string,
  userId: string, // Member
  actorId: string, // Admin who changed
  data: {
    oldRole: string,
    newRole: string
  }
}

// organization.member_removed
{
  eventType: 'organization.member_removed',
  eventCategory: 'organizations',
  organizationId: string,
  userId: string, // Removed member
  actorId: string, // Admin who removed
  data: {
    reason?: string
  }
}

// organization.settings_updated
{
  eventType: 'organization.settings_updated',
  eventCategory: 'organizations',
  organizationId: string,
  actorId: string,
  data: {
    changes: Record<string, { old: any, new: any }>
  }
}

// organization.sso_configured
{
  eventType: 'organization.sso_configured',
  eventCategory: 'organizations',
  organizationId: string,
  actorId: string,
  data: {
    provider: string,
    enabled: boolean,
    enforce: boolean
  }
}
Team Events:

typescript
// team.created
{
  eventType: 'team.created',
  eventCategory: 'teams',
  organizationId: string,
  actorId: string,
  data: {
    teamId: string,
    name: string,
    parentTeamId?: string
  }
}

// team.updated
{
  eventType: 'team.updated',
  eventCategory: 'teams',
  organizationId: string,
  actorId: string,
  data: {
    teamId: string,
    changes: Record<string, { old: any, new: any }>
  }
}

// team.deleted
{
  eventType: 'team.deleted',
  eventCategory: 'teams',
  organizationId: string,
  actorId: string,
  data: {
    teamId: string,
    name: string
  }
}

// team.members_added
{
  eventType: 'team.members_added',
  eventCategory: 'teams',
  organizationId: string,
  actorId: string,
  data: {
    teamId: string,
    teamName: string,
    userIds: string[],
    addedCount: number
  }
}

// team.member_removed
{
  eventType: 'team.member_removed',
  eventCategory: 'teams',
  organizationId: string,
  actorId: string,
  data: {
    teamId: string,
    teamName: string,
    userId: string
  }
}
Role & Permission Events:

typescript
// role.created
{
  eventType: 'role.created',
  eventCategory: 'roles',
  organizationId: string,
  actorId: string,
  data: {
    roleId: string,
    name: string,
    permissionCount: number
  }
}

// role.updated
{
  eventType: 'role.updated',
  eventCategory: 'roles',
  organizationId: string,
  actorId: string,
  data: {
    roleId: string,
    name: string,
    changes: {
      permissionsAdded: string[],
      permissionsRemoved: string[]
    }
  }
}

// role.deleted
{
  eventType: 'role.deleted',
  eventCategory: 'roles',
  organizationId: string,
  actorId: string,
  data: {
    roleId: string,
    name: string,
    reassignedTo?: string
  }
}
Invitation Events:

typescript
// invitation.created
{
  eventType: 'invitation.created',
  eventCategory: 'invitations',
  organizationId: string,
  actorId: string,
  data: {
    invitationId: string,
    email: string,
    role: string,
    type: string,
    expiresAt: string
Continuer

4:44 PM
}
}

// invitation.accepted
{
eventType: 'invitation.accepted',
eventCategory: 'invitations',
organizationId: string,
userId: string, // New member
data: {
invitationId: string,
invitedBy: string,
isNewUser: boolean
}
}

// invitation.revoked
{
eventType: 'invitation.revoked',
eventCategory: 'invitations',
organizationId: string,
actorId: string,
data: {
invitationId: string,
email: string,
reason?: string
}
}


#### Notification Mappings

The Notification Service consumes these events and creates notifications based on configured templates:

**Email Notifications**:
- Welcome email (user.registered)
- Email verification (user.registered, with verification link)
- Password reset email (auth.password_reset_requested)
- Password changed confirmation (user.password_changed)
- New login alert (user.logged_in, if from new device/location)
- Provider linked/unlinked confirmation (user.provider_linked, user.provider_unlinked)
- Session revoked alert (session.revoked, if not self-revoked)
- Organization invitation (invitation.created, if type is email)
- Invitation accepted notification to inviter (invitation.accepted)
- Role changed notification (organization.member_role_changed)
- Removed from organization (organization.member_removed)
- Added to team (team.members_added)
- Removed from team (team.member_removed)
- Competency verified (user.competency_verified)
- SSO configured/updated (organization.sso_configured)
- Organization settings changed (organization.settings_updated)

**In-App Notifications**:
- All email notifications also appear in-app
- Real-time notifications for:
  - New team member joined
  - Role assignments
  - Competency verifications
  - Team/org updates

**SMS Notifications** (Critical only):
- Password changed (if not initiated by user)
- New login from unrecognized device
- Account locked due to failed login attempts

**Webhook Notifications** (For integrations):
- All organization events
- Member join/leave events
- Role changes
- SSO configuration changes

#### Notification Preferences

Users can configure notification preferences via Notification Service:
- Channel preferences (email, SMS, in-app, webhook)
- Event type preferences (which events to receive)
- Frequency (immediate, daily digest, weekly digest)
- Quiet hours

### Audit Service Integration

All authentication and user management operations are logged to the Audit Service (Port 3024) for compliance and security monitoring.

#### Audit Events

**Authentication Audit Events**:
```typescript
// auth.login.success
{
  eventType: 'auth.login.success',
  eventCategory: 'auth',
  eventAction: 'accessed',
  userId: string,
  sessionId: string,
  ipAddress: string,
  userAgent: string,
  metadata: {
    provider: string,
    deviceName: string,
    location: { country, city }
  }
}

// auth.login.failed
{
  eventType: 'auth.login.failed',
  eventCategory: 'auth',
  eventAction: 'accessed',
  userId?: string,
  ipAddress: string,
  userAgent: string,
  success: false,
  errorMessage: string,
  severity: 'warning',
  metadata: {
    email: string,
    provider: string,
    failureReason: string
  }
}

// auth.logout
{
  eventType: 'auth.logout',
  eventCategory: 'auth',
  eventAction: 'accessed',
  userId: string,
  sessionId: string
}

// auth.session_revoked
{
  eventType: 'auth.session_revoked',
  eventCategory: 'auth',
  eventAction: 'deleted',
  userId: string,
  actorId: string,
  resourceType: 'session',
  resourceId: string,
  metadata: {
    deviceName: string,
    selfRevoked: boolean
  }
}

// auth.password_reset_requested
{
  eventType: 'auth.password_reset_requested',
  eventCategory: 'auth',
  eventAction: 'accessed',
  userId?: string,
  ipAddress: string,
  metadata: {
    email: string
  }
}
```

**User Management Audit Events**:
```typescript
// user.created
{
  eventType: 'user.created',
  eventCategory: 'users',
  eventAction: 'created',
  userId: string,
  actorId: string,
  resourceType: 'user',
  resourceId: string,
  resourceName: string,
  metadata: {
    email: string,
    provider: string,
    viaInvitation: boolean
  }
}

// user.updated
{
  eventType: 'user.updated',
  eventCategory: 'users',
  eventAction: 'updated',
  userId: string,
  actorId: string,
  resourceType: 'user',
  resourceId: string,
  changes: {
    field: { old: any, new: any }
  }
}

// user.deleted
{
  eventType: 'user.deleted',
  eventCategory: 'users',
  eventAction: 'deleted',
  userId: string,
  actorId: string,
  resourceType: 'user',
  resourceId: string,
  resourceName: string,
  severity: 'warning',
  metadata: {
    reason: string
  }
}

// user.password_changed
{
  eventType: 'user.password_changed',
  eventCategory: 'users',
  eventAction: 'updated',
  userId: string,
  actorId: string,
  resourceType: 'user',
  resourceId: string,
  severity: 'info',
  metadata: {
    sessionsRevoked: number,
    selfChange: boolean
  }
}

// user.email_verified
{
  eventType: 'user.email_verified',
  eventCategory: 'users',
  eventAction: 'updated',
  userId: string,
  resourceType: 'user',
  resourceId: string
}

// user.provider_linked
{
  eventType: 'user.provider_linked',
  eventCategory: 'users',
  eventAction: 'updated',
  userId: string,
  actorId: string,
  resourceType: 'user',
  resourceId: string,
  metadata: {
    provider: string
  }
}

// user.competency_added
{
  eventType: 'user.competency_added',
  eventCategory: 'users',
  eventAction: 'created',
  userId: string,
  actorId: string,
  resourceType: 'competency',
  resourceId: string,
  resourceName: string,
  metadata: {
    proficiencyLevel: string
  }
}

// user.competency_verified
{
  eventType: 'user.competency_verified',
  eventCategory: 'users',
  eventAction: 'updated',
  userId: string,
  actorId: string,
  resourceType: 'competency',
  resourceId: string,
  resourceName: string,
  metadata: {
    verified: boolean,
    verifier: string
  }
}
```

**Organization Audit Events**:
```typescript
// organization.created
{
  eventType: 'organization.created',
  eventCategory: 'organizations',
  eventAction: 'created',
  organizationId: string,
  actorId: string,
  resourceType: 'organization',
  resourceId: string,
  resourceName: string
}

// organization.updated
{
  eventType: 'organization.updated',
  eventCategory: 'organizations',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'organization',
  resourceId: string,
  changes: Record<string, { old: any, new: any }>
}

// organization.deleted
{
  eventType: 'organization.deleted',
  eventCategory: 'organizations',
  eventAction: 'deleted',
  organizationId: string,
  actorId: string,
  resourceType: 'organization',
  resourceId: string,
  resourceName: string,
  severity: 'critical'
}

// organization.member_added
{
  eventType: 'organization.member_added',
  eventCategory: 'organizations',
  eventAction: 'created',
  organizationId: string,
  userId: string,
  actorId: string,
  resourceType: 'organization_member',
  resourceId: string,
  metadata: {
    role: string,
    viaInvitation: boolean
  }
}

// organization.member_updated
{
  eventType: 'organization.member_updated',
  eventCategory: 'organizations',
  eventAction: 'updated',
  organizationId: string,
  userId: string,
  actorId: string,
  resourceType: 'organization_member',
  resourceId: string,
  changes: {
    role: { old: string, new: string }
  }
}

// organization.member_removed
{
  eventType: 'organization.member_removed',
  eventCategory: 'organizations',
  eventAction: 'deleted',
  organizationId: string,
  userId: string,
  actorId: string,
  resourceType: 'organization_member',
  resourceId: string,
  severity: 'warning',
  metadata: {
    reason: string
  }
}

// organization.settings_updated
{
  eventType: 'organization.settings_updated',
  eventCategory: 'organizations',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'organization_settings',
  resourceId: string,
  changes: Record<string, { old: any, new: any }>
}

// organization.sso_configured
{
  eventType: 'organization.sso_configured',
  eventCategory: 'organizations',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'sso_config',
  resourceId: string,
  severity: 'info',
  changes: {
    enabled: { old: boolean, new: boolean },
    provider: { old: string, new: string },
    enforce: { old: boolean, new: boolean }
  }
}
```

**Team Audit Events**:
```typescript
// team.created
{
  eventType: 'team.created',
  eventCategory: 'teams',
  eventAction: 'created',
  organizationId: string,
  actorId: string,
  resourceType: 'team',
  resourceId: string,
  resourceName: string,
  metadata: {
    parentTeamId: string
  }
}

// team.updated
{
  eventType: 'team.updated',
  eventCategory: 'teams',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'team',
  resourceId: string,
  changes: Record<string, { old: any, new: any }>
}

// team.deleted
{
  eventType: 'team.deleted',
  eventCategory: 'teams',
  eventAction: 'deleted',
  organizationId: string,
  actorId: string,
  resourceType: 'team',
  resourceId: string,
  resourceName: string,
  severity: 'warning'
}

// team.member_added
{
  eventType: 'team.member_added',
  eventCategory: 'teams',
  eventAction: 'created',
  organizationId: string,
  userId: string,
  actorId: string,
  resourceType: 'team_member',
  resourceId: string,
  metadata: {
    teamId: string,
    teamName: string
  }
}

// team.member_removed
{
  eventType: 'team.member_removed',
  eventCategory: 'teams',
  eventAction: 'deleted',
  organizationId: string,
  userId: string,
  actorId: string,
  resourceType: 'team_member',
  resourceId: string,
  metadata: {
    teamId: string,
    teamName: string
  }
}
```

**Role & Permission Audit Events**:
```typescript
// role.created
{
  eventType: 'role.created',
  eventCategory: 'roles',
  eventAction: 'created',
  organizationId: string,
  actorId: string,
  resourceType: 'role',
  resourceId: string,
  resourceName: string,
  metadata: {
    permissionCount: number,
    permissions: string[]
  }
}

// role.updated
{
  eventType: 'role.updated',
  eventCategory: 'roles',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'role',
  resourceId: string,
  changes: {
    permissions: {
      added: string[],
      removed: string[]
    }
  }
}

// role.deleted
{
  eventType: 'role.deleted',
  eventCategory: 'roles',
  eventAction: 'deleted',
  organizationId: string,
  actorId: string,
  resourceType: 'role',
  resourceId: string,
  resourceName: string,
  severity: 'warning',
  metadata: {
    memberCount: number,
    reassignedTo: string
  }
}
```

**Invitation Audit Events**:
```typescript
// invitation.created
{
  eventType: 'invitation.created',
  eventCategory: 'invitations',
  eventAction: 'created',
  organizationId: string,
  actorId: string,
  resourceType: 'invitation',
  resourceId: string,
  metadata: {
    email: string,
    role: string,
    type: string,
    expiresAt: string
  }
}

// invitation.accepted
{
  eventType: 'invitation.accepted',
  eventCategory: 'invitations',
  eventAction: 'updated',
  organizationId: string,
  userId: string,
  resourceType: 'invitation',
  resourceId: string,
  metadata: {
    invitedBy: string,
    isNewUser: boolean
  }
}

// invitation.revoked
{
  eventType: 'invitation.revoked',
  eventCategory: 'invitations',
  eventAction: 'deleted',
  organizationId: string,
  actorId: string,
  resourceType: 'invitation',
  resourceId: string,
  severity: 'info',
  metadata: {
    email: string,
    reason: string
  }
}
```

### Planning Service Integration

The authentication and user management system integrates with the Planning Service (Port 3007) for user-related planning features.

**Integration Points**:

1. **User Context for Plans**
   - Planning service queries user service for user details
   - User permissions checked before plan creation/execution
   - User competencies used for task assignment recommendations

2. **Organization Context**
   - Plans scoped to organizations
   - Team assignments for plans
   - Role-based access to plans

3. **Team-Based Planning**
   - Plans assigned to teams
   - Team member availability
   - Team competency aggregation

**API Calls** (Planning → User Service):
- `GET /users/:userId` - Get user details for plan assignment
- `GET /users?organizationId=X&competency=Y` - Find users with specific competencies
- `GET /organizations/:orgId/teams/:teamId/members` - Get team members for plan assignment

### Knowledge Base Integration

The authentication and user management system integrates with the Knowledge Base service (Port 3010).

**Integration Points**:

1. **Author Information**
   - Article authors linked to user profiles
   - User competencies for article tagging
   - Contributor tracking

2. **Access Control**
   - Organization-scoped articles
   - Role-based article access
   - Team-specific documentation

**API Calls** (Knowledge Base → User Service):
- `GET /users/:userId` - Get author details
- `GET /users/:userId/competencies` - Get user expertise for article relevance

### Other Service Integrations

**AI Service (Port 3006)**:
- User preferences for AI model selection
- Organization API key management (via Secret Management)
- Usage tracking per user/organization

**Dashboard Service (Port 3011)**:
- User-specific dashboard configurations
- Organization-wide dashboard templates
- Role-based dashboard widgets

**Calendar Service (Port 3012)**:
- User event management
- Team calendars
- Organization-wide events

**Messaging Service (Port 3013)**:
- User messaging
- Team conversations
- Organization announcements

**Observability Service (Port 3020)**:
- User activity tracking
- Organization metrics
- System health monitoring per org

---

## Security & Compliance

### Authentication Security

**Password Security**:
- Bcrypt hashing with configurable salt rounds (default: 12)
- Password history tracking (configurable, default: 5)
- Password strength validation based on org policy
- Minimum password length (configurable, default: 12)
- Password expiry (configurable, optional)
- Breach checking via HIBP API (optional)

**Session Security**:
- JWT tokens with configurable expiration (default: 8 hours)
- Refresh tokens for session renewal
- Device-specific sessions
- Session limit per user (org-configurable)
- IP address and device fingerprint tracking
- Geographic anomaly detection
- Automatic session revocation on password change

**OAuth/SSO Security**:
- State parameter for CSRF protection
- PKCE for OAuth 2.0 (where supported)
- Secure token exchange
- Provider verification
- SAML signature verification
- Certificate validation
- Replay attack prevention

**Account Protection**:
- Login attempt rate limiting (IP-based)
- Account locking after failed attempts (configurable)
- Progressive delays on failed logins
- CAPTCHA integration (optional)
- Email verification requirement
- MFA support (planned)
- Suspicious activity alerts

### Authorization Security

**RBAC Implementation**:
- Fine-grained permissions
- Hierarchical permission inheritance (planned)
- Permission caching with TTL
- Real-time permission validation
- Audit trail for permission changes

**Access Control**:
- Organization-scoped resources
- Team-based access control
- Resource ownership tracking
- Permission checks on every request
- Rate limiting per user/org

### Data Security

**Encryption**:
- Data at rest: Database encryption
- Data in transit: TLS 1.3
- Secrets: Encrypted in database
- Password hashes: Bcrypt
- Token encryption: JWT with secure secrets

**Data Privacy**:
- PII data minimization
- Secure data deletion (GDPR)
- Data export capabilities
- Data retention policies
- Anonymization for analytics

**GDPR Compliance**:
- Right to access (data export)
- Right to erasure (account deletion with anonymization)
- Right to rectification (profile editing)
- Right to data portability (export in standard format)
- Consent management
- Data processing logs
- Privacy policy acceptance tracking
- Cookie consent management

**SOC2 Compliance**:
- Comprehensive audit logging
- Access control and authorization
- Encryption at rest and in transit
- Incident response procedures
- Security monitoring and alerting
- Regular security assessments
- Vendor security review
- Change management tracking

### Audit & Monitoring

**Comprehensive Logging**:
- All authentication events
- All authorization checks
- All data modifications
- Failed access attempts
- Configuration changes
- User actions

**Audit Trail**:
- Immutable audit logs
- Timestamped events
- User attribution
- IP and device tracking
- Before/after values for changes
- Retention per compliance requirements

**Security Monitoring**:
- Failed login monitoring
- Unusual activity detection
- Geographic anomalies
- Session hijacking detection
- Brute force attack detection
- Account takeover prevention

**Alerting**:
- Real-time security alerts
- Failed login threshold alerts
- Account lockout notifications
- Privilege escalation alerts
- Configuration change alerts
- Compliance violation alerts

### Rate Limiting

**API Rate Limits**:
- Per-user limits
- Per-organization limits
- Per-IP limits
- Endpoint-specific limits
- Authenticated vs unauthenticated limits

**Specific Limits**:
- Login attempts: 5/hour per IP
- Password reset: 3/hour per email
- API requests: 1000/hour per user
- Registration: 10/day per IP
- OAuth flows: 20/hour per IP

---

## Implementation Notes

### Technology Stack

**Backend**:
- Fastify (Web framework)
- Prisma (ORM)
- PostgreSQL (Database)
- Redis (Caching, session storage)
- RabbitMQ (Event bus)
- JWT (Tokens)
- Bcrypt (Password hashing)
- Passport.js or similar (OAuth)
- node-saml (SAML support)

**Frontend**:
- React 19
- Electron (Desktop app)
- Shadcn UI (Components)
- Tailwind CSS (Styling)
- React Query (Data fetching)
- Zod (Validation)

### Database Migrations

Use Prisma migrations for schema changes:
```bash
# Create migration
npx prisma migrate dev --name add_sso_support

# Apply migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Testing Strategy

**Unit Tests**:
- Password validation logic
- Token generation/validation
- Permission checking logic
- RBAC resolution
- Input sanitization

**Integration Tests**:
- OAuth flows
- SAML flows
- API endpoints
- Database operations
- Event publishing

**E2E Tests**:
- User registration flow
- Login flow (all methods)
- Password reset flow
- Organization creation
- Team management
- Role management
- Invitation flow

**Security Tests**:
- SQL injection attempts
- XSS attempts
- CSRF protection
- Session hijacking prevention
- Brute force protection
- Rate limiting

### Performance Considerations

**Caching Strategy**:
- User sessions in Redis (TTL based on org settings)
- Permission lookups (5-minute TTL)
- Organization settings (10-minute TTL)
- Role definitions (until changed)
- Public user profiles (5-minute TTL)

**Database Optimization**:
- Proper indexing (as defined in schema)
- Connection pooling
- Query optimization
- Avoid N+1 queries
- Pagination for large result sets

**API Optimization**:
- Response compression
- Pagination
- Field selection (GraphQL-like)
- Batch operations where possible
- Async processing for heavy operations

### Deployment Considerations

**Environment Variables**:
```env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...

# JWT
JWT_SECRET=...
JWT_EXPIRATION=8h
REFRESH_TOKEN_EXPIRATION=7d

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=...

# SAML (per organization, stored in DB)
# Azure AD / Okta credentials

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
PASSWORD_MIN_LENGTH=12

# Feature Flags
ENABLE_SSO=true
ENABLE_MFA=false
ENABLE_BREACH_CHECK=true

# Compliance
GDPR_ENABLED=true
SOC2_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555 # 7 years

# Frontend
FRONTEND_URL=http://localhost:3000

# Microservices
AUTH_SERVICE_URL=http://localhost:3021
USER_SERVICE_URL=http://localhost:3022
ORG_SERVICE_URL=http://localhost:3023
AUDIT_SERVICE_URL=http://localhost:3024
```

**Service Ports**:
- Auth Service: 3021
- User Service: 3022
- Organization Service: 3023
- Audit Service: 3024

**Docker Compose**:
```yaml
services:
  auth-service:
    build: ./containers/auth-service
    ports:
      - "3021:3021"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      # ... other env vars
    depends_on:
      - postgres
      - redis
      - rabbitmq
      
  user-service:
    build: ./containers/user-service
    ports:
      - "3022:3022"
    depends_on:
      - postgres
      - redis
      - rabbitmq
      
  # ... other services
```

### Error Handling

**Error Response Format**:
```typescript
interface ErrorResponse {
  error: string; // User-friendly message
  code: string; // Error code for client handling
  details?: any; // Additional error details (dev only)
  field?: string; // For validation errors
  timestamp: string;
  requestId: string;
}
```

**Error Codes**:
- `AUTH_INVALID_CREDENTIALS` - Invalid login credentials
- `AUTH_ACCOUNT_LOCKED` - Account locked
- `AUTH_TOKEN_EXPIRED` - JWT token expired
- `AUTH_TOKEN_INVALID` - Invalid JWT token
- `AUTH_EMAIL_NOT_VERIFIED` - Email verification required
- `AUTH_SSO_NOT_CONFIGURED` - SSO not configured for org
- `AUTH_PROVIDER_ERROR` - OAuth/SAML provider error
- `USER_NOT_FOUND` - User not found
- `USER_ALREADY_EXISTS` - Email already registered
- `USER_INACTIVE` - User account inactive
- `ORG_NOT_FOUND` - Organization not found
- `ORG_MEMBER_EXISTS` - Already a member
- `TEAM_NOT_FOUND` - Team not found
- `ROLE_NOT_FOUND` - Role not found
- `PERMISSION_DENIED` - Insufficient permissions
- `INVITATION_EXPIRED` - Invitation expired
- `INVITATION_INVALID` - Invalid invitation token
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded

### Monitoring & Observability

**Metrics to Track**:
- Login success/failure rates
- OAuth/SSO flow completion rates
- Session creation rate
- Active session count
- Password reset requests
- Account lockout rate
- API response times
- Database query performance
- Cache hit rates
- Event publishing rate

**Health Checks**:
```typescript
// Auth Service health check
GET /health
{
  status: 'healthy',
  checks: {
    database: 'healthy',
    redis: 'healthy',
    rabbitmq: 'healthy',
    oauth_providers: {
      google: 'healthy',
      github: 'healthy'
    }
  },
  timestamp: '...'
}
```

**Logging Levels**:
- DEBUG: Detailed debugging info
- INFO: Normal operations
- WARN: Warnings (failed logins, rate limits)
- ERROR: Errors (exceptions, failed operations)
- CRITICAL: Critical issues (service down, security breaches)

---

This comprehensive specification covers all aspects of Authentication and User Management for the Coder IDE system. The specification is designed to be:

1. **Scalable**: Microservices architecture, caching, database optimization
2. **Secure**: Multi-layered security, encryption, audit logging
3. **Compliant**: GDPR and SOC2 ready
4. **Extensible**: Easy to add new auth providers, roles, permissions
5. **User-Friendly**: Comprehensive UI with intuitive workflows
6. **Well-Integrated**: Deep integration with notification, audit, and other services

The specification can be implemented incrementally, starting with core authentication (email/password, OAuth), then adding organizations, teams, RBAC, and finally SSO and advanced features.






Claude est une IA et peut faire des erreurs. Veuillez vérifier les réponses.








## Implementation Summary - 2026-01-21

### ✅ Completed Implementations

1. **Audit Logging Service** ()
   - Immutable audit log entries with hash-based integrity verification
   - Comprehensive logging of all API actions
   - IP address and user agent tracking
   - Before/after state tracking for updates

2. **Audit Logging Integration**
   - ✅ Authentication routes (login, logout, registration, password changes, OAuth)
   - ✅ User management routes (profile updates, session management, account operations)
   - ✅ Organization management routes (CRUD operations, settings)

3. **Audit Log Search API**
   - ✅ Endpoint: 
   - ✅ Filtering by user, action, resource type, date range, project, agent
   - ✅ Pagination support

4. **Audit Log Retention Policy**
   - ✅ Automated cleanup job ()
   - ✅ Configurable retention period (default: 365 days)
   - ✅ Scheduled daily at 3 AM UTC

All audit logging features are now fully implemented and operational.

## Implementation Summary - 2026-01-21

### Completed Implementations

1. **Audit Logging Service** - Fully implemented with immutable audit log entries
2. **Audit Logging Integration** - Integrated into all authentication, user management, and organization routes
3. **Audit Log Search API** - Endpoint created with filtering and pagination
4. **Audit Log Retention Policy** - Automated cleanup job implemented with configurable retention period

All audit logging features are now fully operational.
