import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
/**
 * Permission Guard Factory
 * Creates a middleware that checks if the user has the required permission.
 * Supports both static system roles (Enum) and dynamic DB roles.
 */
export declare function createPermissionGuard(roleService: RoleManagementService): (permission: string) => (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=permission.guard.d.ts.map