/**
 * SCIM Controller
 * HTTP handlers for SCIM 2.0 endpoints
 */
/**
 * SCIM Controller
 */
export class SCIMController {
    scimService;
    constructor(scimService) {
        this.scimService = scimService;
    }
    /**
     * GET /scim/v2/ServiceProviderConfig
     * Returns SCIM service provider configuration
     */
    async getServiceProviderConfig(request, reply) {
        const config = {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
            patch: {
                supported: true,
            },
            bulk: {
                supported: false,
                maxOperations: 0,
                maxPayloadSize: 0,
            },
            filter: {
                supported: true,
                maxResults: 200,
            },
            changePassword: {
                supported: false,
            },
            sort: {
                supported: false,
            },
            etag: {
                supported: true,
            },
            authenticationSchemes: [
                {
                    type: 'oauthbearertoken',
                    name: 'OAuth Bearer Token',
                    description: 'Authentication using OAuth 2.0 Bearer Token',
                },
            ],
        };
        return reply.code(200).send(config);
    }
    /**
     * GET /scim/v2/ResourceTypes
     * Returns available SCIM resource types
     */
    async getResourceTypes(request, reply) {
        const resourceTypes = [
            {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
                id: 'User',
                name: 'User',
                endpoint: '/scim/v2/Users',
                description: 'User account',
                schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
                meta: {
                    resourceType: 'User',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                },
            },
            {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
                id: 'Group',
                name: 'Group',
                endpoint: '/scim/v2/Groups',
                description: 'Group',
                schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
                meta: {
                    resourceType: 'Group',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                },
            },
        ];
        return reply.code(200).send({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: resourceTypes.length,
            itemsPerPage: resourceTypes.length,
            startIndex: 1,
            Resources: resourceTypes,
        });
    }
    /**
     * GET /scim/v2/Schemas
     * Returns SCIM schemas
     */
    async getSchemas(request, reply) {
        // Return core User schema
        const userSchema = {
            id: 'urn:ietf:params:scim:schemas:core:2.0:User',
            name: 'User',
            description: 'User Account',
            attributes: [
                {
                    name: 'userName',
                    type: 'string',
                    multiValued: false,
                    required: true,
                    caseExact: false,
                    mutability: 'readWrite',
                    returned: 'default',
                    uniqueness: 'server',
                },
                {
                    name: 'name',
                    type: 'complex',
                    multiValued: false,
                    required: false,
                    caseExact: false,
                    mutability: 'readWrite',
                    returned: 'default',
                    uniqueness: 'none',
                },
                {
                    name: 'emails',
                    type: 'complex',
                    multiValued: true,
                    required: true,
                    caseExact: false,
                    mutability: 'readWrite',
                    returned: 'default',
                    uniqueness: 'none',
                },
                {
                    name: 'active',
                    type: 'boolean',
                    multiValued: false,
                    required: false,
                    caseExact: false,
                    mutability: 'readWrite',
                    returned: 'default',
                    uniqueness: 'none',
                },
            ],
        };
        // Return core Group schema
        const groupSchema = {
            id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
            name: 'Group',
            description: 'Group representing a user role',
            attributes: [
                {
                    name: 'displayName',
                    type: 'string',
                    multiValued: false,
                    required: true,
                    caseExact: false,
                    mutability: 'readWrite',
                    returned: 'default',
                    uniqueness: 'server',
                },
                {
                    name: 'members',
                    type: 'complex',
                    multiValued: true,
                    required: false,
                    caseExact: false,
                    mutability: 'readWrite',
                    returned: 'default',
                    uniqueness: 'none',
                },
            ],
        };
        return reply.code(200).send({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 2,
            itemsPerPage: 2,
            startIndex: 1,
            Resources: [userSchema, groupSchema],
        });
    }
    /**
     * POST /scim/v2/Users
     * Create user via SCIM
     */
    async createUser(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const scimUser = request.body;
            const created = await this.scimService.createUser(tenantId, scimUser);
            return reply.code(201).send(created);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create SCIM user');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to create user',
                status: '400',
            });
        }
    }
    /**
     * GET /scim/v2/Users
     * List users via SCIM
     */
    async listUsers(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const query = request.query;
            const startIndex = parseInt(query.startIndex || '1', 10);
            const count = parseInt(query.count || '100', 10);
            const filter = query.filter;
            const result = await this.scimService.listUsers(tenantId, startIndex, count, filter);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list SCIM users');
            return reply.code(500).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to list users',
                status: '500',
            });
        }
    }
    /**
     * GET /scim/v2/Users/:id
     * Get user via SCIM
     */
    async getUser(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            const user = await this.scimService.getUser(tenantId, id);
            if (!user) {
                return reply.code(404).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'User not found',
                    status: '404',
                });
            }
            return reply.code(200).send(user);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get SCIM user');
            return reply.code(500).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to get user',
                status: '500',
            });
        }
    }
    /**
     * PUT /scim/v2/Users/:id
     * Update user via SCIM (full update)
     */
    async updateUser(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            const scimUser = request.body;
            const updated = await this.scimService.updateUser(tenantId, id, scimUser, 'PUT');
            return reply.code(200).send(updated);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update SCIM user');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to update user',
                status: '400',
            });
        }
    }
    /**
     * PATCH /scim/v2/Users/:id
     * Patch user via SCIM (partial update)
     */
    async patchUser(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            const patchRequest = request.body;
            const updated = await this.scimService.patchUser(tenantId, id, patchRequest);
            return reply.code(200).send(updated);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to patch SCIM user');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to patch user',
                status: '400',
            });
        }
    }
    /**
     * DELETE /scim/v2/Users/:id
     * Delete user via SCIM
     */
    async deleteUser(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            await this.scimService.deleteUser(tenantId, id);
            return reply.code(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete SCIM user');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to delete user',
                status: '400',
            });
        }
    }
    // ============================================
    // Groups Endpoints
    // ============================================
    /**
     * POST /scim/v2/Groups
     * Create group via SCIM
     */
    async createGroup(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const scimGroup = request.body;
            const created = await this.scimService.createGroup(tenantId, scimGroup);
            return reply.code(201).send(created);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create SCIM group');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to create group',
                status: '400',
            });
        }
    }
    /**
     * GET /scim/v2/Groups
     * List groups via SCIM
     */
    async listGroups(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const query = request.query;
            const startIndex = parseInt(query.startIndex || '1', 10);
            const count = parseInt(query.count || '100', 10);
            const filter = query.filter;
            const result = await this.scimService.listGroups(tenantId, startIndex, count, filter);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list SCIM groups');
            return reply.code(500).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to list groups',
                status: '500',
            });
        }
    }
    /**
     * GET /scim/v2/Groups/:id
     * Get group via SCIM
     */
    async getGroup(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            const group = await this.scimService.getGroup(tenantId, id);
            if (!group) {
                return reply.code(404).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Group not found',
                    status: '404',
                });
            }
            return reply.code(200).send(group);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get SCIM group');
            return reply.code(500).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to get group',
                status: '500',
            });
        }
    }
    /**
     * PATCH /scim/v2/Groups/:id
     * Patch group via SCIM (update membership)
     */
    async patchGroup(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            const patchRequest = request.body;
            const updated = await this.scimService.patchGroup(tenantId, id, patchRequest);
            return reply.code(200).send(updated);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to patch SCIM group');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to patch group',
                status: '400',
            });
        }
    }
    /**
     * DELETE /scim/v2/Groups/:id
     * Delete group via SCIM (removes all members)
     */
    async deleteGroup(request, reply) {
        try {
            const tenantId = request.scimTenantId;
            if (!tenantId) {
                return reply.code(400).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'Tenant ID not found',
                    status: '400',
                });
            }
            const { id } = request.params;
            await this.scimService.deleteGroup(tenantId, id);
            return reply.code(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete SCIM group');
            return reply.code(400).send({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: error.message || 'Failed to delete group',
                status: '400',
            });
        }
    }
}
//# sourceMappingURL=scim.controller.js.map