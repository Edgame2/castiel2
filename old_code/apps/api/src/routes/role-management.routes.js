import { listRolesSchema, createRoleSchema, getRoleSchema, updateRoleSchema, deleteRoleSchema, roleMembersSchema, addRoleMembersSchema, removeRoleMemberSchema, createIdPMappingSchema, listIdPMappingsSchema, listPermissionsSchema, } from '../schemas/role-management.schemas.js';
import { requireAuth, requireSameTenant } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';
export async function registerRoleManagementRoutes(server) {
    const controller = server
        .roleManagementController;
    if (!controller) {
        server.log.warn('⚠️  Role management routes not registered - controller missing');
        return;
    }
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️  Role management routes not registered - authentication decorator missing');
        return;
    }
    server.get('/api/tenants/:tenantId/roles', {
        schema: listRolesSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.READ)
        ]
    }, (request, reply) => controller.listRoles(request, reply));
    server.post('/api/tenants/:tenantId/roles', {
        schema: createRoleSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.CREATE)
        ]
    }, (request, reply) => controller.createRole(request, reply));
    server.get('/api/tenants/:tenantId/roles/:roleId', {
        schema: getRoleSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.READ)
        ]
    }, (request, reply) => controller.getRole(request, reply));
    server.patch('/api/tenants/:tenantId/roles/:roleId', {
        schema: updateRoleSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.UPDATE)
        ]
    }, (request, reply) => controller.updateRole(request, reply));
    server.delete('/api/tenants/:tenantId/roles/:roleId', {
        schema: deleteRoleSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.DELETE)
        ]
    }, (request, reply) => controller.deleteRole(request, reply));
    server.get('/api/tenants/:tenantId/roles/:roleId/members', {
        schema: roleMembersSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.READ)
        ]
    }, (request, reply) => controller.getRoleMembers(request, reply));
    server.post('/api/tenants/:tenantId/roles/:roleId/members', {
        schema: addRoleMembersSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.UPDATE)
        ]
    }, (request, reply) => controller.addRoleMembers(request, reply));
    server.delete('/api/tenants/:tenantId/roles/:roleId/members/:userId', {
        schema: removeRoleMemberSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.UPDATE)
        ]
    }, (request, reply) => controller.removeRoleMember(request, reply));
    server.post('/api/tenants/:tenantId/roles/:roleId/map', {
        schema: createIdPMappingSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.UPDATE)
        ]
    }, (request, reply) => controller.createIdPGroupMapping(request, reply));
    server.get('/api/tenants/:tenantId/roles/:roleId/mappings', {
        schema: listIdPMappingsSchema,
        onRequest: [
            authDecorator,
            requireAuth(),
            requireSameTenant(),
            createPermissionGuard(SYSTEM_PERMISSIONS.ROLES.READ)
        ]
    }, (request, reply) => controller.getIdPGroupMappings(request, reply));
    server.get('/api/permissions', { schema: listPermissionsSchema, onRequest: [authDecorator, requireAuth()] }, (request, reply) => controller.getPermissions(request, reply));
    server.log.info('✅ Role management routes registered');
}
//# sourceMappingURL=role-management.routes.js.map