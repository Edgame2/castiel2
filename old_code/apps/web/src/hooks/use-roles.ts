import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { useTenant } from './use-tenant';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRoleMembers,
  addRoleMembers,
  removeRoleMember,
  getPermissions,
} from '@/lib/api/roles';
import type {
  RoleEntity,
  RoleCreate,
  RoleUpdate,
  RoleListQuery,
  RoleListResponse,
  RoleMemberListResponse,
  PermissionCategory,
} from '@/types/roles';

export function useRoles(query?: RoleListQuery): UseQueryResult<RoleListResponse, Error> {
  const { data: tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ['roles', tenantId, query],
    queryFn: () => listRoles(tenantId!, query),
    enabled: !!tenantId,
  });
}

export function useRole(roleId: string): UseQueryResult<RoleEntity, Error> {
  const { data: tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ['roles', tenantId, roleId],
    queryFn: () => getRole(tenantId!, roleId),
    enabled: !!tenantId && !!roleId,
  });
}

export function useCreateRole(): UseMutationResult<RoleEntity, Error, RoleCreate> {
  const queryClient = useQueryClient();
  const { data: tenant } = useTenant();
  const tenantId = tenant?.id;

  return useMutation({
    mutationFn: (data: RoleCreate) => createRole(tenantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantId] });
    },
  });
}

export function useUpdateRole(roleId: string): UseMutationResult<RoleEntity, Error, RoleUpdate> {
  const queryClient = useQueryClient();
  const { data: tenant } = useTenant();
  const tenantId = tenant?.id;

  return useMutation({
    mutationFn: (data: RoleUpdate) => updateRole(tenantId!, roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['roles', tenantId, roleId] });
    },
  });
}

export function useDeleteRole(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const { data: tenant } = useTenant();
  const tenantId = tenant?.id;

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(tenantId!, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantId] });
    },
  });
}

export function useRoleMembers(roleId: string): UseQueryResult<RoleMemberListResponse, Error> {
  const { data: tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ['roleMembers', tenantId, roleId],
    queryFn: () => getRoleMembers(tenantId!, roleId),
    enabled: !!tenantId && !!roleId,
  });
}

export function useAddRoleMembers(roleId: string): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient();
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.id;

  return useMutation({
    mutationFn: (userIds: string[]) => addRoleMembers(tenantId!, roleId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleMembers', tenantId, roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles', tenantId, roleId] });
    },
  });
}

export function useRemoveRoleMember(roleId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.id;

  return useMutation({
    mutationFn: (userId: string) => removeRoleMember(tenantId!, roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleMembers', tenantId, roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles', tenantId, roleId] });
    },
  });
}

export function usePermissions(): UseQueryResult<{ categories: PermissionCategory[] }, Error> {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: 300000, // 5 minutes
  });
}
