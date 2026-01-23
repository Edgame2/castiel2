/**
 * User Group Types
 * Types for user groups and SSO group integration
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Group source - how the group was created
 */
export enum GroupSource {
  MANUAL = 'manual',   // Created by Tenant Admin
  SSO = 'sso',         // Synced from SSO provider
}

/**
 * SSO provider types
 */
export enum SSOProviderType {
  AZURE_AD = 'azure_ad',
  OKTA = 'okta',
  GOOGLE = 'google',
  SAML = 'saml',
  OIDC = 'oidc',
}

// ============================================================================
// SSO Configuration
// ============================================================================

/**
 * Group claim configuration
 */
export interface GroupClaimConfig {
  claimName: string;         // e.g., 'groups', 'roles', 'memberOf'
  claimType: 'array' | 'string';
  separator?: string;        // For string type (e.g., ',')
}

/**
 * SSO group mapping rule
 */
export interface SSOGroupMapping {
  externalGroupId: string;    // ID from SSO provider
  externalGroupName?: string; // Display name for reference
  
  // Target - either map to existing or create new
  platformGroupId?: string;   // Map to existing group
  createGroup?: {             // Or create new group
    name: string;
    description?: string;
  };
  
  addOnly: boolean;           // Only add users, never remove
}

/**
 * SSO group mapping configuration
 */
export interface SSOGroupMappingConfig {
  tenantId: string;
  providerId: string;
  providerType: SSOProviderType;
  
  // Claim configuration
  groupClaim: GroupClaimConfig;
  
  // Mapping rules
  mappings: SSOGroupMapping[];
  
  // Auto-create settings
  autoCreateGroups: boolean;
  autoCreatePrefix?: string;  // e.g., 'SSO: '
  
  // Sync settings
  syncOnLogin: boolean;
  syncSchedule?: string;      // Cron expression for scheduled sync
  
  // Audit
  configuredAt: Date;
  configuredBy: string;
}

/**
 * SSO configuration for a group (stored in group)
 */
export interface GroupSSOConfig {
  providerId: string;
  externalGroupId: string;
  claimPath: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
}

// ============================================================================
// User Group Entity
// ============================================================================

/**
 * User group structured data (stored in Shard)
 */
export interface UserGroupStructuredData {
  // Display
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  
  // Source
  source: GroupSource;
  
  // SSO configuration (for source = 'sso')
  ssoConfig?: GroupSSOConfig;
  
  // Members (for source = 'manual')
  memberUserIds?: string[];
  
  // Stats (computed)
  memberCount: number;
}

/**
 * User group (full entity with Shard fields)
 */
export interface UserGroup {
  id: string;
  tenantId: string;
  userId: string;  // Creator
  shardTypeId: 'c_userGroup';
  
  structuredData: UserGroupStructuredData;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Group CRUD
// ============================================================================

/**
 * Create group input
 */
export interface CreateGroupInput {
  tenantId: string;
  userId: string;  // Creator
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  memberUserIds?: string[];
}

/**
 * Create SSO group input (internal use)
 */
export interface CreateSSOGroupInput {
  tenantId: string;
  name: string;
  description?: string;
  ssoConfig: GroupSSOConfig;
}

/**
 * Update group input
 */
export interface UpdateGroupInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

/**
 * Group query filter
 */
export interface GroupQueryFilter {
  tenantId: string;
  source?: GroupSource;
  search?: string;
}

/**
 * Group list options
 */
export interface GroupListOptions {
  filter: GroupQueryFilter;
  limit?: number;
  offset?: number;
}

/**
 * Group list result
 */
export interface GroupListResult {
  groups: UserGroup[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Group Membership
// ============================================================================

/**
 * Group membership record
 */
export interface GroupMembership {
  groupId: string;
  userId: string;
  tenantId: string;
  source: GroupSource;  // How this membership was added
  addedAt: Date;
  addedBy?: string;     // User who added (for manual)
}

/**
 * User's groups result
 */
export interface UserGroupsResult {
  groups: UserGroup[];
  memberships: GroupMembership[];
}

/**
 * Add members input
 */
export interface AddMembersInput {
  groupId: string;
  userIds: string[];
  addedBy: string;
}

/**
 * Remove members input
 */
export interface RemoveMembersInput {
  groupId: string;
  userIds: string[];
}

// ============================================================================
// SSO Sync
// ============================================================================

/**
 * SSO sync result
 */
export interface SSOSyncResult {
  tenantId: string;
  providerId: string;
  syncedAt: Date;
  
  // Changes made
  groupsCreated: number;
  groupsUpdated: number;
  membersAdded: number;
  membersRemoved: number;
  
  // Errors
  errors: SSOSyncError[];
}

/**
 * SSO sync error
 */
export interface SSOSyncError {
  type: 'group_create' | 'group_update' | 'member_add' | 'member_remove';
  externalGroupId?: string;
  userId?: string;
  message: string;
}

/**
 * Token groups extraction result
 */
export interface ExtractedGroups {
  raw: string[];           // Raw group values from token
  mapped: {
    externalGroupId: string;
    platformGroupId?: string;
    groupName?: string;
    isNew: boolean;        // Would be auto-created
  }[];
  unmapped: string[];      // Groups without mapping (if autoCreate is off)
}

// ============================================================================
// Permission Integration
// ============================================================================

/**
 * Permission check with groups
 */
export interface GroupPermissionCheck {
  userId: string;
  tenantId: string;
  groupIds: string[];      // User's group IDs
  roleIds: string[];       // User's role IDs
}

/**
 * Resolved permission
 */
export interface ResolvedPermission {
  hasAccess: boolean;
  level: string;           // Highest permission level found
  source: 'user' | 'group' | 'role';
  sourceId: string;        // User ID, Group ID, or Role ID
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default SSO group mapping config
 */
export const DEFAULT_SSO_GROUP_CONFIG: Omit<SSOGroupMappingConfig, 'tenantId' | 'providerId' | 'providerType' | 'configuredAt' | 'configuredBy'> = {
  groupClaim: {
    claimName: 'groups',
    claimType: 'array',
  },
  mappings: [],
  autoCreateGroups: false,
  syncOnLogin: true,
};











