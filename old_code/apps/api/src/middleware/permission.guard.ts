import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from './error-handler.js';
import { isGlobalAdmin } from './authorization.js';
import { getUser } from './authenticate.js';
import { hasPermission as checkStaticPermission, UserRole } from '@castiel/shared-types';
import type { RoleManagementService } from '../services/auth/role-management.service.js';

/**
 * Permission Guard Factory
 * Creates a middleware that checks if the user has the required permission.
 * Supports both static system roles (Enum) and dynamic DB roles.
 */
export function createPermissionGuard(roleService: RoleManagementService) {
    return function requirePermission(permission: string) {
        return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
            const user = getUser(request);

            // 1. Super Admin Bypass
            if (isGlobalAdmin(user)) {
                return;
            }

            // 2. Check Permissions
            let hasPerm = false;

            // We need to check all roles the user has
            for (const roleName of user.roles) {
                // A. Check Static System Roles (e.g. 'admin', 'user')
                // We cast string to UserRole to see if it matches known static definitions
                const asEnum = roleName as UserRole;
                if (Object.values(UserRole).includes(asEnum)) {
                    if (checkStaticPermission(asEnum, permission)) {
                        hasPerm = true;
                        break;
                    }
                }

                // B. Check Dynamic Roles via Service
                // We rely on the RoleManagementService to look up the role's permission list
                // Note: caching is handled inside the Service or we should add it here.
                // For now, assuming Service is fast (cached).
                try {
                    const roleDef = await roleService.getRoleByName(user.tenantId, roleName);
                    if (roleDef && roleDef.permissions.includes(permission)) {
                        hasPerm = true;
                        break;
                    }
                } catch (e) {
                    // Ignore missing roles or errors, try next role
                    request.log.warn({ roleName, err: e }, 'Failed to check dynamic role permission');
                }
            }

            if (!hasPerm) {
                throw new ForbiddenError(`Missing permission: ${permission}`);
            }
        };
    };
}
