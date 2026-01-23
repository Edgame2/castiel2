import { impersonateUserSchema, updateUserStatusSchema, bulkUserOperationSchema, importUsersSchema } from '../schemas/user-management.schemas.js';
import { requireAuth, requireSameTenant, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';
export async function registerUserManagementRoutes(server) {
    const controller = server
        .userManagementController;
    const roleService = server
        .roleManagementService;
    if (!controller || !roleService) {
        server.log.warn('⚠️  User management routes not registered - controller or role service missing');
        return;
    }
    if (!server.authenticate) {
        server.log.warn('⚠️  User management routes not registered - authentication decorator missing');
        return;
    }
    const checkPerm = createPermissionGuard(roleService);
    // Update user status
    server.patch('/api/users/:userId/status', {
        schema: updateUserStatusSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
        ],
    }, (request, reply) => controller.updateUserStatus(request, reply));
    server.post('/api/tenants/:tenantId/users/:userId/impersonate', {
        schema: impersonateUserSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSameTenant(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.IMPERSONATE),
        ],
    }, (request, reply) => controller.impersonateUser(request, reply));
    // Bulk user operations
    server.post('/api/tenants/:tenantId/users/bulk', {
        schema: bulkUserOperationSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.BULK_ACTION),
        ],
    }, (request, reply) => controller.bulkOperation(request, reply));
    // Import Users
    server.post('/api/tenants/:tenantId/users/import', {
        schema: importUsersSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.CREATE),
        ],
    }, (request, reply) => controller.importUsers(request, reply));
    // User CRUD routes
    server.get('/api/tenants/:tenantId/users', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.READ),
        ],
    }, (request, reply) => controller.listUsers(request, reply));
    server.get('/api/tenants/:tenantId/users/:userId', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.READ),
        ],
    }, (request, reply) => controller.getUser(request, reply));
    server.post('/api/tenants/:tenantId/users', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.CREATE),
        ],
    }, (request, reply) => controller.createUser(request, reply));
    server.patch('/api/tenants/:tenantId/users/:userId', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
        ],
    }, (request, reply) => controller.updateUser(request, reply));
    server.delete('/api/tenants/:tenantId/users/:userId', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
            checkPerm(SYSTEM_PERMISSIONS.USERS.DELETE),
        ],
    }, (request, reply) => controller.deleteUser(request, reply));
    server.log.info('✅ User management routes registered');
}
//# sourceMappingURL=user-management.routes.js.map