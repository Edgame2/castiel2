/**
 * User Group Types
 * Types for user groups and SSO group integration
 */
/**
 * Group source - how the group was created
 */
export declare enum GroupSource {
    MANUAL = "manual",// Created by Tenant Admin
    SSO = "sso"
}
/**
 * SSO provider types
 */
export declare enum SSOProviderType {
    AZURE_AD = "azure_ad",
    OKTA = "okta",
    GOOGLE = "google",
    SAML = "saml",
    OIDC = "oidc"
}
/**
 * Group claim configuration
 */
export interface GroupClaimConfig {
    claimName: string;
    claimType: 'array' | 'string';
    separator?: string;
}
/**
 * SSO group mapping rule
 */
export interface SSOGroupMapping {
    externalGroupId: string;
    externalGroupName?: string;
    platformGroupId?: string;
    createGroup?: {
        name: string;
        description?: string;
    };
    addOnly: boolean;
}
/**
 * SSO group mapping configuration
 */
export interface SSOGroupMappingConfig {
    tenantId: string;
    providerId: string;
    providerType: SSOProviderType;
    groupClaim: GroupClaimConfig;
    mappings: SSOGroupMapping[];
    autoCreateGroups: boolean;
    autoCreatePrefix?: string;
    syncOnLogin: boolean;
    syncSchedule?: string;
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
/**
 * User group structured data (stored in Shard)
 */
export interface UserGroupStructuredData {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    source: GroupSource;
    ssoConfig?: GroupSSOConfig;
    memberUserIds?: string[];
    memberCount: number;
}
/**
 * User group (full entity with Shard fields)
 */
export interface UserGroup {
    id: string;
    tenantId: string;
    userId: string;
    shardTypeId: 'c_userGroup';
    structuredData: UserGroupStructuredData;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create group input
 */
export interface CreateGroupInput {
    tenantId: string;
    userId: string;
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
/**
 * Group membership record
 */
export interface GroupMembership {
    groupId: string;
    userId: string;
    tenantId: string;
    source: GroupSource;
    addedAt: Date;
    addedBy?: string;
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
/**
 * SSO sync result
 */
export interface SSOSyncResult {
    tenantId: string;
    providerId: string;
    syncedAt: Date;
    groupsCreated: number;
    groupsUpdated: number;
    membersAdded: number;
    membersRemoved: number;
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
    raw: string[];
    mapped: {
        externalGroupId: string;
        platformGroupId?: string;
        groupName?: string;
        isNew: boolean;
    }[];
    unmapped: string[];
}
/**
 * Permission check with groups
 */
export interface GroupPermissionCheck {
    userId: string;
    tenantId: string;
    groupIds: string[];
    roleIds: string[];
}
/**
 * Resolved permission
 */
export interface ResolvedPermission {
    hasAccess: boolean;
    level: string;
    source: 'user' | 'group' | 'role';
    sourceId: string;
}
/**
 * Default SSO group mapping config
 */
export declare const DEFAULT_SSO_GROUP_CONFIG: Omit<SSOGroupMappingConfig, 'tenantId' | 'providerId' | 'providerType' | 'configuredAt' | 'configuredBy'>;
//# sourceMappingURL=group.types.d.ts.map