/**
 * Role Management Types (Frontend)
 */

export interface PermissionDefinition {
  id: string;
  name: string;
  resource: string;
  action: string;
  scope: string;
  description: string;
  category: string;
}

export interface RoleEntity {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
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

export interface PermissionCategory {
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}
