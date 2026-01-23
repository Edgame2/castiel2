/**
 * User status
 */
export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

/**
 * External user ID status
 */
export enum ExternalUserIdStatus {
  ACTIVE = 'active',
  INVALID = 'invalid',
  PENDING = 'pending',
}

/**
 * External user ID from integrated applications
 */
export interface ExternalUserId {
  integrationId: string; // Integration instance ID
  externalUserId: string; // User ID in the external system
  integrationName?: string; // Display name of the integration
  connectionId?: string; // Reference to IntegrationConnection
  connectedAt: Date; // When the external user ID was first connected
  lastSyncedAt?: Date; // When the external user ID was last synced from the integration
  status: ExternalUserIdStatus; // Status of the external user ID
  metadata?: Record<string, any>; // Integration-specific metadata
}

/**
 * User document in Cosmos DB
 */
export interface User {
  id: string; // userId
  tenantId: string;
  tenantIds?: string[];
  activeTenantId?: string;
  email: string;
  emailVerified: boolean;
  passwordHash?: string; // Optional for OAuth-only users
  firstName?: string;
  lastName?: string;
  status: UserStatus;
  pendingTenantId?: string;
  
  // Organization and roles
  organizationId?: string; // Organization user belongs to
  roles: string[]; // User roles for RBAC (e.g., ['user', 'admin', 'owner'])
  isDefaultTenant?: boolean;
  
  // Verification
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  
  // Password history (for preventing reuse)
  passwordHistory?: {
    hash: string;
    createdAt: Date;
  }[];
  lastPasswordChangeAt?: Date;
  
  // OAuth providers
  providers?: {
    provider: string; // 'google', 'github', 'azure', etc.
    providerId: string; // User ID from provider
    email?: string; // Email from provider
    connectedAt: Date;
  }[];
  
  // Legacy field (for backward compatibility)
  oauthProviders?: {
    provider: string;
    providerId: string;
    connectedAt: Date;
  }[];
  
  // SSO/SAML
  ssoProvider?: string; // 'saml', 'azure_ad', 'okta', etc.
  ssoSubject?: string; // Subject identifier from IdP (e.g., SAML nameID)
  ssoSessionIndex?: string; // SAML session index for SLO
  
  // Metadata
  metadata?: Record<string, any>; // Custom metadata storage
  linkedUserId?: string; // Reference to primary identity when duplicated across tenants
  linkedTenantIds?: string[]; // Historical tenant memberships for auditing
  
  // External user IDs from integrated applications
  externalUserIds?: ExternalUserId[]; // Array of external user IDs from different integrations
  
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  
  // Partition key (tenant isolation)
  partitionKey: string; // Same as tenantId for partition
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  tenantIds?: string[];
  activeTenantId?: string;
  roles?: string[];
  status?: UserStatus;
  emailVerified?: boolean;
  pendingTenantId?: string;
  metadata?: Record<string, any>;
  linkedUserId?: string;
  isDefaultTenant?: boolean;
}

/**
 * User login credentials
 */
export interface UserLoginCredentials {
  email: string;
  password: string;
  tenantId: string;
}
