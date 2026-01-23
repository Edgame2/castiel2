/**
 * Role Management API Client
 */

import axios from 'axios';
import { env } from '@/lib/env';
import type {
  RoleEntity,
  RoleCreate,
  RoleUpdate,
  RoleListQuery,
  RoleListResponse,
  RoleMemberListResponse,
  PermissionCategory,
} from '@/types/roles';

const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL;

export async function listRoles(tenantId: string, query?: RoleListQuery): Promise<RoleListResponse> {
  const params = new URLSearchParams();
  if (query?.includeSystem !== undefined) params.append('includeSystem', String(query.includeSystem));
  if (query?.search) params.append('search', query.search);
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));

  const response = await axios.get(`${API_BASE_URL}/api/tenants/${tenantId}/roles?${params.toString()}`);
  return response.data;
}

export async function getRole(tenantId: string, roleId: string): Promise<RoleEntity> {
  const response = await axios.get(`${API_BASE_URL}/api/tenants/${tenantId}/roles/${roleId}`);
  return response.data;
}

export async function createRole(tenantId: string, data: RoleCreate): Promise<RoleEntity> {
  const response = await axios.post(`${API_BASE_URL}/api/tenants/${tenantId}/roles`, data);
  return response.data;
}

export async function updateRole(tenantId: string, roleId: string, data: RoleUpdate): Promise<RoleEntity> {
  const response = await axios.patch(`${API_BASE_URL}/api/tenants/${tenantId}/roles/${roleId}`, data);
  return response.data;
}

export async function deleteRole(tenantId: string, roleId: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/tenants/${tenantId}/roles/${roleId}`);
}

export async function getRoleMembers(tenantId: string, roleId: string): Promise<RoleMemberListResponse> {
  const response = await axios.get(`${API_BASE_URL}/api/tenants/${tenantId}/roles/${roleId}/members`);
  return response.data;
}

export async function addRoleMembers(tenantId: string, roleId: string, userIds: string[]): Promise<void> {
  await axios.post(`${API_BASE_URL}/api/tenants/${tenantId}/roles/${roleId}/members`, { userIds });
}

export async function removeRoleMember(tenantId: string, roleId: string, userId: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/tenants/${tenantId}/roles/${roleId}/members/${userId}`);
}

export async function getPermissions(): Promise<{ categories: PermissionCategory[] }> {
  const response = await axios.get(`${API_BASE_URL}/api/permissions`);
  return response.data;
}
