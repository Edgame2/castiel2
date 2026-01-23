/**
 * Role Management Types
 * 
 * Type definitions for dynamic role and permission management
 */

export interface PermissionDefinition {
  id: string;
  name: string;
  resource: string; // 'users', 'shards', 'settings', etc.
  action: string; // 'create', 'read', 'update', 'delete'
  scope: string; // 'own', 'tenant', 'all'
  description: string;
  category: string; // 'User Management', 'Content', 'Settings', etc.
}

export interface RoleEntity {
  id: string;
  tenantId: string;
  name: string; // Unique within tenant, e.g., 'editor', 'viewer'
  displayName: string; // Human-readable, e.g., 'Content Editor'
  description?: string;
  permissions: string[]; // Array of permission IDs
  isSystem: boolean; // Cannot be deleted/modified
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface RoleCreate {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

export interface RoleUpdate {
  displayName?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleListQuery {
  includeSystem?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RoleListResponse {
  roles: RoleEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface RoleMember {
  userId: string;
  userEmail: string;
  userName?: string;
  assignedAt: string;
  assignedBy?: string;
}

export interface RoleMemberListResponse {
  members: RoleMember[];
  total: number;
}

export interface AddRoleMembersRequest {
  userIds: string[];
}

export interface IdPGroupMapping {
  id: string;
  roleId: string;
  idpId: string; // SSO configuration ID
  groupAttribute: string; // SAML attribute or OIDC claim
  groupValues: string[]; // Group names/IDs to match
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdPGroupMappingRequest {
  idpId: string;
  groupAttribute: string;
  groupValues: string[];
}

export interface PermissionCategory {
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}
