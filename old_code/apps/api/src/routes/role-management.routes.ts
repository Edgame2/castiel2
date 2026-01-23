import type { FastifyInstance } from 'fastify';
import { RoleManagementController } from '../controllers/role-management.controller.js';
import {
  listRolesSchema,
  createRoleSchema,
  getRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
  roleMembersSchema,
  addRoleMembersSchema,
  removeRoleMemberSchema,
  createIdPMappingSchema,
  listIdPMappingsSchema,
  listPermissionsSchema,
} from '../schemas/role-management.schemas.js';
import { requireAuth, requireSameTenant } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';

export async function registerRoleManagementRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { roleManagementController?: RoleManagementController })
    .roleManagementController;

  if (!controller) {
    server.log.warn('⚠️  Role management routes not registered - controller missing');
    return;
  }

  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️  Role management routes not registered - authentication decorator missing');
    return;
  }

  // Get role service for permission checking
  const roleService = (server as any).roleManagementService;
  const checkPerm = roleService ? createPermissionGuard(roleService) : undefined;

  server.get(
    '/api/tenants/:tenantId/roles',
    {
      schema: listRolesSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.READ)] : [])
      ] as any,
    },
    (request, reply) => controller.listRoles(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/roles',
    {
      schema: createRoleSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.CREATE)] : [])
      ]
    },
    (request, reply) => controller.createRole(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/roles/:roleId',
    {
      schema: getRoleSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.READ)] : [])
      ]
    },
    (request, reply) => controller.getRole(request as any, reply)
  );

  server.patch(
    '/api/tenants/:tenantId/roles/:roleId',
    {
      schema: updateRoleSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.UPDATE)] : [])
      ]
    },
    (request, reply) => controller.updateRole(request as any, reply)
  );

  server.delete(
    '/api/tenants/:tenantId/roles/:roleId',
    {
      schema: deleteRoleSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.DELETE)] : [])
      ]
    },
    (request, reply) => controller.deleteRole(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/roles/:roleId/members',
    {
      schema: roleMembersSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.READ)] : [])
      ]
    },
    (request, reply) => controller.getRoleMembers(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/roles/:roleId/members',
    {
      schema: addRoleMembersSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.UPDATE)] : [])
      ]
    },
    (request, reply) => controller.addRoleMembers(request as any, reply)
  );

  server.delete(
    '/api/tenants/:tenantId/roles/:roleId/members/:userId',
    {
      schema: removeRoleMemberSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.UPDATE)] : [])
      ]
    },
    (request, reply) => controller.removeRoleMember(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/roles/:roleId/map',
    {
      schema: createIdPMappingSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.UPDATE)] : [])
      ]
    },
    (request, reply) => controller.createIdPGroupMapping(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/roles/:roleId/mappings',
    {
      schema: listIdPMappingsSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireSameTenant(),
        ...(checkPerm ? [checkPerm(SYSTEM_PERMISSIONS.ROLES.READ)] : [])
      ]
    },
    (request, reply) => controller.getIdPGroupMappings(request as any, reply)
  );

  server.get(
    '/api/permissions',
    { schema: listPermissionsSchema, onRequest: [authDecorator, requireAuth()] },
    (request, reply) => controller.getPermissions(request as any, reply)
  );

  server.log.info('✅ Role management routes registered');
}
