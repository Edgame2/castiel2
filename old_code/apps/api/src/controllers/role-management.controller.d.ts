import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RoleCreate, RoleUpdate, RoleListQuery, AddRoleMembersRequest, CreateIdPGroupMappingRequest } from '@castiel/shared-types';
import { RoleManagementService } from '../services/auth/role-management.service.js';
export declare class RoleManagementController {
    private readonly roleService;
    constructor(roleService: RoleManagementService);
    listRoles(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Querystring: RoleListQuery;
    }>, reply: FastifyReply): Promise<void>;
    createRole(request: FastifyRequest<{
        Params: {
            tenantId: string;
        };
        Body: RoleCreate;
    }>, reply: FastifyReply): Promise<void>;
    getRole(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    updateRole(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
        Body: RoleUpdate;
    }>, reply: FastifyReply): Promise<void>;
    deleteRole(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    getRoleMembers(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    addRoleMembers(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
        Body: AddRoleMembersRequest;
    }>, reply: FastifyReply): Promise<void>;
    removeRoleMember(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
            userId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    createIdPGroupMapping(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
        Body: CreateIdPGroupMappingRequest;
    }>, reply: FastifyReply): Promise<void>;
    getIdPGroupMappings(request: FastifyRequest<{
        Params: {
            tenantId: string;
            roleId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    getPermissions(_request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=role-management.controller.d.ts.map