import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  RoleCreate,
  RoleUpdate,
  RoleListQuery,
  AddRoleMembersRequest,
  CreateIdPGroupMappingRequest,
} from '@castiel/shared-types';
import { RoleManagementService } from '../services/auth/role-management.service.js';
import { getUser } from '../middleware/authenticate.js';

export class RoleManagementController {
  constructor(private readonly roleService: RoleManagementService) {}

  async listRoles(
    request: FastifyRequest<{ Params: { tenantId: string }; Querystring: RoleListQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId } = request.params;
      const result = await this.roleService.listRoles(tenantId, request.query);
      reply.send(result);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to list roles');
      reply.status(500).send({ error: error.message || 'Failed to list roles' });
    }
  }

  async createRole(
    request: FastifyRequest<{ Params: { tenantId: string }; Body: RoleCreate }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId } = request.params;
      const user = getUser(request);
      const role = await this.roleService.createRole(tenantId, request.body, user.id);
      reply.status(201).send(role);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to create role');
      const status = error.message?.includes('already exists') ? 409 : 500;
      reply.status(status).send({ error: error.message || 'Failed to create role' });
    }
  }

  async getRole(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      const role = await this.roleService.getRole(tenantId, roleId);
      reply.send(role);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to get role');
      const status = error.message?.includes('not found') ? 404 : 500;
      reply.status(status).send({ error: error.message || 'Failed to get role' });
    }
  }

  async updateRole(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string }; Body: RoleUpdate }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      const user = getUser(request);
      const role = await this.roleService.updateRole(tenantId, roleId, request.body, user.id);
      reply.send(role);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to update role');
      let status = 500;
      if (error.message?.includes('not found')) {
        status = 404;
      } else if (error.message?.includes('system')) {
        status = 403;
      }
      reply.status(status).send({ error: error.message || 'Failed to update role' });
    }
  }

  async deleteRole(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      await this.roleService.deleteRole(tenantId, roleId);
      reply.status(204).send();
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to delete role');
      let status = 500;
      if (error.message?.includes('not found')) {
        status = 404;
      } else if (error.message?.includes('system')) {
        status = 403;
      } else if (error.message?.includes('members')) {
        status = 409;
      }
      reply.status(status).send({ error: error.message || 'Failed to delete role' });
    }
  }

  async getRoleMembers(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      const result = await this.roleService.getRoleMembers(tenantId, roleId);
      reply.send(result);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to get role members');
      reply.status(500).send({ error: error.message || 'Failed to get role members' });
    }
  }

  async addRoleMembers(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string }; Body: AddRoleMembersRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      await this.roleService.addRoleMembers(tenantId, roleId, request.body.userIds);
      reply.status(204).send();
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to add role members');
      reply.status(500).send({ error: error.message || 'Failed to add role members' });
    }
  }

  async removeRoleMember(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string; userId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId, userId } = request.params;
      await this.roleService.removeRoleMember(tenantId, roleId, userId);
      reply.status(204).send();
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to remove role member');
      reply.status(500).send({ error: error.message || 'Failed to remove role member' });
    }
  }

  async createIdPGroupMapping(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string }; Body: CreateIdPGroupMappingRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      const mapping = await this.roleService.createIdPGroupMapping(tenantId, roleId, request.body);
      reply.status(201).send(mapping);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to create IdP mapping');
      reply.status(500).send({ error: error.message || 'Failed to create mapping' });
    }
  }

  async getIdPGroupMappings(
    request: FastifyRequest<{ Params: { tenantId: string; roleId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId, roleId } = request.params;
      const mappings = await this.roleService.getIdPGroupMappings(tenantId, roleId);
      reply.send({ mappings });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to get IdP mappings');
      reply.status(500).send({ error: error.message || 'Failed to get mappings' });
    }
  }

  async getPermissions(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const categories = await this.roleService.getPermissions();
      reply.send({ categories });
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get permissions' });
    }
  }
}
