/**
 * SCIM Controller
 * HTTP handlers for SCIM 2.0 endpoints
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SCIMService } from '../services/auth/scim.service.js';
/**
 * SCIM Controller
 */
export declare class SCIMController {
    private readonly scimService;
    constructor(scimService: SCIMService);
    /**
     * GET /scim/v2/ServiceProviderConfig
     * Returns SCIM service provider configuration
     */
    getServiceProviderConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /scim/v2/ResourceTypes
     * Returns available SCIM resource types
     */
    getResourceTypes(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /scim/v2/Schemas
     * Returns SCIM schemas
     */
    getSchemas(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /scim/v2/Users
     * Create user via SCIM
     */
    createUser(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /scim/v2/Users
     * List users via SCIM
     */
    listUsers(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /scim/v2/Users/:id
     * Get user via SCIM
     */
    getUser(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PUT /scim/v2/Users/:id
     * Update user via SCIM (full update)
     */
    updateUser(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /scim/v2/Users/:id
     * Patch user via SCIM (partial update)
     */
    patchUser(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /scim/v2/Users/:id
     * Delete user via SCIM
     */
    deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /scim/v2/Groups
     * Create group via SCIM
     */
    createGroup(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /scim/v2/Groups
     * List groups via SCIM
     */
    listGroups(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /scim/v2/Groups/:id
     * Get group via SCIM
     */
    getGroup(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /scim/v2/Groups/:id
     * Patch group via SCIM (update membership)
     */
    patchGroup(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /scim/v2/Groups/:id
     * Delete group via SCIM (removes all members)
     */
    deleteGroup(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=scim.controller.d.ts.map