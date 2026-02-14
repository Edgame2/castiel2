/**
 * Role Routes
 * Tenant-scoped roles and permissions.
 *
 * Endpoints:
 * - GET /api/v1/tenants/:tenantId/roles - List roles
 * - GET /api/v1/tenants/:tenantId/roles/:roleId - Get role details
 * - POST /api/v1/tenants/:tenantId/roles - Create custom role
 * - PUT /api/v1/tenants/:tenantId/roles/:roleId - Update custom role
 * - DELETE /api/v1/tenants/:tenantId/roles/:roleId - Delete custom role
 * - GET /api/v1/tenants/:tenantId/roles/:roleId/permissions - Get role permissions
 * - GET /api/v1/tenants/:tenantId/permissions - List all permissions (for role create/edit UI)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import * as roleService from '../services/RoleService';
import { log } from '../utils/logger';
import { publishEventSafely, extractEventMetadata, createBaseEvent } from '../events/publishers/UserManagementEventPublisher';
import { UserManagementEvent } from '../types/events';

export async function setupRoleRoutes(fastify: FastifyInstance): Promise<void> {
  // List roles
  fastify.get(
    '/api/v1/tenants/:tenantId/roles',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.view', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          tenantId: string;
        };
        Querystring: {
          includeSystemRoles?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const tenantId = request.params.tenantId;
        const includeSystemRoles = request.query.includeSystemRoles !== 'false';

        const roles = await roleService.listRoles(tenantId, includeSystemRoles);

        return { data: roles };
      } catch (error: any) {
        const params = request.params as { tenantId?: string };
        log.error('List roles error', error, { route: '/api/v1/tenants/:tenantId/roles', userId: (request as any).user?.id, tenantId: params?.tenantId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list roles',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // List all permissions (for role create/edit UI)
  fastify.get(
    '/api/v1/tenants/:tenantId/permissions',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.view', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const tenantId = request.params.tenantId;
        const permissions = await roleService.listPermissions(tenantId);
        return { data: permissions };
      } catch (error: any) {
        const params = request.params as { tenantId?: string };
        log.error('List permissions error', error, { route: '/api/v1/tenants/:tenantId/permissions', userId: (request as any).user?.id, tenantId: params?.tenantId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list permissions',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Get role details
  fastify.get(
    '/api/v1/tenants/:tenantId/roles/:roleId',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.view', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          tenantId: string;
          roleId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { tenantId, roleId } = request.params;

        const role = await roleService.getRole(tenantId, roleId);

        if (!role) {
          reply.code(404).send({ error: 'Role not found' });
          return;
        }

        return { data: role };
      } catch (error: any) {
        const params = request.params as { tenantId?: string; roleId?: string };
        log.error('Get role error', error, { route: '/api/v1/tenants/:tenantId/roles/:roleId', userId: (request as any).user?.id, tenantId: params?.tenantId, roleId: params?.roleId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to get role',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Create custom role
  fastify.post(
    '/api/v1/tenants/:tenantId/roles',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.create', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          tenantId: string;
        };
        Body: {
          name: string;
          description?: string | null;
          permissionIds: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const tenantId = request.params.tenantId;
        const { name, description, permissionIds } = request.body;

        if (!name || name.trim().length === 0) {
          reply.code(400).send({ error: 'Role name is required' });
          return;
        }

        if (!Array.isArray(permissionIds)) {
          reply.code(400).send({ error: 'permissionIds must be an array' });
          return;
        }

        const role = await roleService.createCustomRole(
          tenantId,
          name,
          description || null,
          permissionIds,
          requestUser.id
        );

        // Publish role.created event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('role.created', requestUser.id, tenantId, undefined, {
            roleId: role.id,
            tenantId,
            name: role.name,
            permissionCount: permissionIds.length,
            createdBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        reply.code(201).send({ data: role });
      } catch (error: any) {
        const params = request.params as { tenantId?: string };
        log.error('Create role error', error, { route: '/api/v1/tenants/:tenantId/roles', userId: (request as any).user?.id, tenantId: params?.tenantId, service: 'user-management' });

        if (error.message.includes('already exists') || error.message.includes('system role name')) {
          reply.code(409).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('required') ||
          error.message.includes('must be') ||
          error.message.includes('Maximum') ||
          error.message.includes('invalid')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to create role',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Update custom role
  fastify.put(
    '/api/v1/tenants/:tenantId/roles/:roleId',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.update', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          tenantId: string;
          roleId: string;
        };
        Body: {
          name?: string;
          description?: string | null;
          permissionIds?: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { tenantId, roleId } = request.params;
        const updates = request.body;

        if (Object.keys(updates).length === 0) {
          reply.code(400).send({ error: 'At least one field must be provided for update' });
          return;
        }

        if (updates.permissionIds !== undefined && !Array.isArray(updates.permissionIds)) {
          reply.code(400).send({ error: 'permissionIds must be an array' });
          return;
        }

        // Get before state for audit logging
        const beforeRole = await roleService.getRole(tenantId, roleId);
        if (!beforeRole) {
          reply.code(404).send({ error: 'Role not found' });
          return;
        }

        const role = await roleService.updateCustomRole(
          tenantId,
          roleId,
          updates,
          requestUser.id
        );

        // Publish role.updated event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('role.updated', requestUser.id, tenantId, undefined, {
            roleId: role.id,
            tenantId,
            changes: updates,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { data: role };
      } catch (error: any) {
        const params = request.params as { tenantId?: string; roleId?: string };
        log.error('Update role error', error, { route: '/api/v1/tenants/:tenantId/roles/:roleId', userId: (request as any).user?.id, tenantId: params?.tenantId, roleId: params?.roleId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied') || error.message.includes('Cannot modify system roles')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('already exists') ||
          error.message.includes('system role name') ||
          error.message.includes('cannot be empty') ||
          error.message.includes('must be') ||
          error.message.includes('Maximum') ||
          error.message.includes('invalid')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to update role',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Delete custom role
  fastify.delete(
    '/api/v1/tenants/:tenantId/roles/:roleId',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.delete', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          tenantId: string;
          roleId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { tenantId, roleId } = request.params;

        // Get role info before deletion for audit log
        const role = await roleService.getRole(tenantId, roleId);
        if (!role) {
          reply.code(404).send({ error: 'Role not found' });
          return;
        }

        await roleService.deleteCustomRole(tenantId, roleId, requestUser.id);

        // Publish role.deleted event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('role.deleted', requestUser.id, tenantId, undefined, {
            roleId: role.id,
            tenantId,
            name: role.name,
            deletedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Role deleted successfully' };
      } catch (error: any) {
        const params = request.params as { tenantId?: string; roleId?: string };
        log.error('Delete role error', error, { route: '/api/v1/tenants/:tenantId/roles/:roleId', userId: (request as any).user?.id, tenantId: params?.tenantId, roleId: params?.roleId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied') || error.message.includes('Cannot delete system roles')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (error.message.includes('Cannot delete role') || error.message.includes('assigned to this role')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to delete role',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );

  // Get role permissions
  fastify.get(
    '/api/v1/tenants/:tenantId/roles/:roleId/permissions',
    {
      preHandler: [
        authenticateRequest,
        requirePermission('roles.role.view', 'tenant'),
      ],
    },
    (async (
      request: FastifyRequest<{
        Params: {
          tenantId: string;
          roleId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { tenantId, roleId } = request.params;

        const permissions = await roleService.getRolePermissions(tenantId, roleId);

        return { data: permissions };
      } catch (error: any) {
        const params = request.params as { tenantId?: string; roleId?: string };
        log.error('Get role permissions error', error, { route: '/api/v1/tenants/:tenantId/roles/:roleId/permissions', userId: (request as any).user?.id, tenantId: params?.tenantId, roleId: params?.roleId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to get role permissions',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
  }) as any
  );
}

