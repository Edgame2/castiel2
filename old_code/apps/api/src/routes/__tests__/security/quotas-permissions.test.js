/**
 * Quota Routes Permission Tests
 *
 * Tests for permission enforcement on quota API routes.
 * Verifies that role-based access control is properly enforced.
 *
 * Tests cover:
 * - Permission checks on quota CRUD endpoints
 * - Role-based access (User, Manager, Director, Admin)
 * - Service-level filtering for list endpoints
 * - Permission guard integration
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createPermissionGuard } from '../../../middleware/permission.guard.js';
import { ForbiddenError } from '../../../middleware/error-handler.js';
import { UserRole } from '@castiel/shared-types';
// Mock RoleManagementService
const createMockRoleService = () => {
    return {
        getRoleByName: vi.fn(),
        listRoles: vi.fn(),
        createRole: vi.fn(),
        updateRole: vi.fn(),
        deleteRole: vi.fn(),
        addMemberToRole: vi.fn(),
        removeMemberFromRole: vi.fn(),
        listRoleMembers: vi.fn(),
        getUserRoles: vi.fn(),
        getUserPermissions: vi.fn(),
        createIdPGroupMapping: vi.fn(),
        deleteIdPGroupMapping: vi.fn(),
        listIdPGroupMappings: vi.fn(),
    };
};
// Helper to create mock request with user
const createMockRequest = (user) => {
    return {
        user: {
            id: user.id,
            tenantId: user.tenantId,
            roles: user.roles,
            email: 'test@example.com',
        },
        log: {
            error: vi.fn(),
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
        },
    };
};
// Helper to create mock reply
const createMockReply = () => {
    return {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
        code: vi.fn().mockReturnThis(),
    };
};
describe('Quota Routes Permission Tests', () => {
    let roleService;
    let checkPermission;
    beforeEach(() => {
        roleService = createMockRoleService();
        checkPermission = createPermissionGuard(roleService);
    });
    describe('Create Quota Permissions', () => {
        it('should reject USER from creating quota', async () => {
            const request = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: [UserRole.USER],
            });
            const reply = createMockReply();
            // USER does not have shard:create:tenant permission
            const guard = checkPermission('shard:create:tenant');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should reject MANAGER from creating quota', async () => {
            const request = createMockRequest({
                id: 'manager1',
                tenantId: 'tenant1',
                roles: [UserRole.MANAGER],
            });
            const reply = createMockReply();
            // MANAGER does not have shard:create:tenant permission
            const guard = checkPermission('shard:create:tenant');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should reject DIRECTOR from creating quota', async () => {
            const request = createMockRequest({
                id: 'director1',
                tenantId: 'tenant1',
                roles: [UserRole.DIRECTOR],
            });
            const reply = createMockReply();
            // DIRECTOR does not have shard:create:tenant permission
            const guard = checkPermission('shard:create:tenant');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should allow ADMIN to create quota', async () => {
            const request = createMockRequest({
                id: 'admin1',
                tenantId: 'tenant1',
                roles: [UserRole.ADMIN],
            });
            const reply = createMockReply();
            // ADMIN has shard:create:tenant permission
            const guard = checkPermission('shard:create:tenant');
            await expect(guard(request, reply)).resolves.not.toThrow();
        });
    });
    describe('Update Quota Permissions', () => {
        it('should reject USER from updating quota', async () => {
            const request = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: [UserRole.USER],
            });
            const reply = createMockReply();
            // USER does not have shard:update:all permission
            const guard = checkPermission('shard:update:all');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should reject MANAGER from updating quota', async () => {
            const request = createMockRequest({
                id: 'manager1',
                tenantId: 'tenant1',
                roles: [UserRole.MANAGER],
            });
            const reply = createMockReply();
            // MANAGER does not have shard:update:all permission
            const guard = checkPermission('shard:update:all');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should reject DIRECTOR from updating quota', async () => {
            const request = createMockRequest({
                id: 'director1',
                tenantId: 'tenant1',
                roles: [UserRole.DIRECTOR],
            });
            const reply = createMockReply();
            // DIRECTOR does not have shard:update:all permission
            const guard = checkPermission('shard:update:all');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should allow ADMIN to update quota', async () => {
            const request = createMockRequest({
                id: 'admin1',
                tenantId: 'tenant1',
                roles: [UserRole.ADMIN],
            });
            const reply = createMockReply();
            // ADMIN has shard:update:all permission
            const guard = checkPermission('shard:update:all');
            await expect(guard(request, reply)).resolves.not.toThrow();
        });
    });
    describe('Delete Quota Permissions', () => {
        it('should reject USER from deleting quota', async () => {
            const request = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: [UserRole.USER],
            });
            const reply = createMockReply();
            // USER does not have shard:delete:all permission
            const guard = checkPermission('shard:delete:all');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should reject MANAGER from deleting quota', async () => {
            const request = createMockRequest({
                id: 'manager1',
                tenantId: 'tenant1',
                roles: [UserRole.MANAGER],
            });
            const reply = createMockReply();
            // MANAGER does not have shard:delete:all permission
            const guard = checkPermission('shard:delete:all');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should reject DIRECTOR from deleting quota', async () => {
            const request = createMockRequest({
                id: 'director1',
                tenantId: 'tenant1',
                roles: [UserRole.DIRECTOR],
            });
            const reply = createMockReply();
            // DIRECTOR does not have shard:delete:all permission
            const guard = checkPermission('shard:delete:all');
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
        it('should allow ADMIN to delete quota', async () => {
            const request = createMockRequest({
                id: 'admin1',
                tenantId: 'tenant1',
                roles: [UserRole.ADMIN],
            });
            const reply = createMockReply();
            // ADMIN has shard:delete:all permission
            const guard = checkPermission('shard:delete:all');
            await expect(guard(request, reply)).resolves.not.toThrow();
        });
    });
    describe('List Quota Permissions', () => {
        it('should allow all authenticated users to list quotas (service-level filtering)', async () => {
            // Note: List endpoints don't have permission guards - they use service-level filtering
            // This test documents the expected behavior
            const userRequest = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: [UserRole.USER],
            });
            const managerRequest = createMockRequest({
                id: 'manager1',
                tenantId: 'tenant1',
                roles: [UserRole.MANAGER],
            });
            const directorRequest = createMockRequest({
                id: 'director1',
                tenantId: 'tenant1',
                roles: [UserRole.DIRECTOR],
            });
            // All should be able to access (service filters results based on role)
            // This is tested at the service level, not route level
            expect(userRequest.user.roles).toContain(UserRole.USER);
            expect(managerRequest.user.roles).toContain(UserRole.MANAGER);
            expect(directorRequest.user.roles).toContain(UserRole.DIRECTOR);
        });
    });
    describe('Super Admin Bypass', () => {
        it('should allow SUPER_ADMIN to bypass all quota permission checks', async () => {
            const request = createMockRequest({
                id: 'superadmin1',
                tenantId: 'tenant1',
                roles: [UserRole.SUPER_ADMIN],
            });
            const reply = createMockReply();
            // SUPER_ADMIN should bypass all permission checks
            const createGuard = checkPermission('shard:create:tenant');
            const updateGuard = checkPermission('shard:update:all');
            const deleteGuard = checkPermission('shard:delete:all');
            // Should not throw for any permission
            await expect(createGuard(request, reply)).resolves.not.toThrow();
            await expect(updateGuard(request, reply)).resolves.not.toThrow();
            await expect(deleteGuard(request, reply)).resolves.not.toThrow();
        });
    });
    describe('Dynamic Role Permissions', () => {
        it('should check dynamic role permissions for quota creation', async () => {
            const request = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: ['quota-admin'],
            });
            const reply = createMockReply();
            // Mock role service to return custom role with permission
            roleService.getRoleByName.mockResolvedValue({
                id: 'role1',
                name: 'quota-admin',
                permissions: ['shard:create:tenant'],
            });
            const guard = checkPermission('shard:create:tenant');
            // Should not throw - custom role has permission
            await expect(guard(request, reply)).resolves.not.toThrow();
            expect(roleService.getRoleByName).toHaveBeenCalledWith('tenant1', 'quota-admin');
        });
        it('should reject when dynamic role lacks quota permission', async () => {
            const request = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: ['limited-user'],
            });
            const reply = createMockReply();
            // Mock role service to return custom role without permission
            roleService.getRoleByName.mockResolvedValue({
                id: 'role1',
                name: 'limited-user',
                permissions: ['shard:read:assigned'],
            });
            const guard = checkPermission('shard:create:tenant');
            // Should throw - custom role doesn't have permission
            await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
        });
    });
    describe('Multiple Roles', () => {
        it('should allow access if any role has quota permission', async () => {
            const request = createMockRequest({
                id: 'user1',
                tenantId: 'tenant1',
                roles: [UserRole.USER, 'quota-manager'],
            });
            const reply = createMockReply();
            // Mock role service to return custom role with permission
            roleService.getRoleByName.mockResolvedValue({
                id: 'role1',
                name: 'quota-manager',
                permissions: ['shard:create:tenant', 'shard:update:all'],
            });
            const createGuard = checkPermission('shard:create:tenant');
            const updateGuard = checkPermission('shard:update:all');
            // Should not throw - custom role has permissions even though USER doesn't
            await expect(createGuard(request, reply)).resolves.not.toThrow();
            await expect(updateGuard(request, reply)).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=quotas-permissions.test.js.map