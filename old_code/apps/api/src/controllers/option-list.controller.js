/**
 * Option List Controller
 *
 * Handles REST API operations for reusable option lists.
 */
import { OptionListRepository } from '../repositories/option-list.repository.js';
import { OptionListService, OptionListError, OptionListErrorCode, } from '../services/option-list.service.js';
import { UserRole } from '@castiel/shared-types';
/**
 * Option List Controller
 */
export class OptionListController {
    service;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        const repository = new OptionListRepository(monitoring);
        this.service = new OptionListService(repository, monitoring);
    }
    /**
     * Initialize the controller
     */
    async initialize() {
        await this.service.initialize();
    }
    /**
     * POST /api/v1/option-lists
     * Create a new option list
     */
    createOptionList = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            const { tenantId, userId, roles } = auth;
            const { name, displayName, description, options, isSystem, allowTenantOverride, tags, } = req.body;
            // Only super admins can create system lists
            if (isSystem) {
                const userRoles = roles || [];
                if (!userRoles.includes(UserRole.SUPER_ADMIN)) {
                    reply.status(403).send({
                        error: 'Forbidden: Only SUPER_ADMIN can create system option lists',
                    });
                    return;
                }
            }
            // Regular admins can create tenant lists
            const userRoles = roles || [];
            const canCreate = userRoles.includes(UserRole.SUPER_ADMIN) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canCreate) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can create option lists',
                });
                return;
            }
            // Validation
            if (!name || !displayName || !options || options.length === 0) {
                reply.status(400).send({
                    error: 'Missing required fields: name, displayName, options',
                });
                return;
            }
            const optionList = await this.service.create({
                tenantId: isSystem ? 'system' : tenantId,
                name,
                displayName,
                description,
                options,
                isSystem: isSystem || false,
                allowTenantOverride: allowTenantOverride ?? true,
                tags: tags || [],
                createdBy: userId,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.create.duration', duration);
            reply.status(201).send(optionList);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * GET /api/v1/option-lists
     * List option lists
     */
    listOptionLists = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { tenantId } = auth;
            if (!tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { name, isSystem, isActive, tags, search, limit, orderBy, orderDirection, continuationToken, } = req.query;
            const result = await this.service.list({
                filter: {
                    tenantId,
                    name,
                    isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
                    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
                    tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
                    search,
                },
                limit: (() => {
                    const parsed = limit ? parseInt(limit, 10) : 50;
                    return isNaN(parsed) || parsed < 1 ? 50 : Math.min(parsed, 1000); // Max 1000 items per page
                })(),
                orderBy: orderBy,
                orderDirection: orderDirection,
                continuationToken,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.list.duration', duration);
            reply.send(result);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * GET /api/v1/option-lists/available
     * Get all available lists for tenant (system + tenant-specific)
     */
    getAvailableLists = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { tenantId } = auth;
            if (!tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const lists = await this.service.getAvailableListsForTenant(tenantId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.available.duration', duration);
            reply.send({ optionLists: lists, count: lists.length });
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * GET /api/v1/option-lists/system
     * Get all system option lists
     */
    getSystemLists = async (req, reply) => {
        const startTime = Date.now();
        try {
            const result = await this.service.list({
                filter: {
                    tenantId: 'system',
                    isSystem: true,
                    isActive: true,
                },
                limit: 1000,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.system.duration', duration);
            reply.send(result);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * GET /api/v1/option-lists/:id
     * Get an option list by ID
     */
    getOptionList = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { tenantId } = auth;
            if (!tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { id } = req.params;
            // Try tenant first, then system
            let optionList = await this.service.getById(id, tenantId);
            if (!optionList) {
                optionList = await this.service.getById(id, 'system');
            }
            if (!optionList) {
                reply.status(404).send({ error: 'Option list not found' });
                return;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.get.duration', duration);
            reply.send(optionList);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * GET /api/v1/option-lists/by-name/:name
     * Get an option list by name (resolves tenant then system)
     */
    getOptionListByName = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { tenantId } = auth;
            if (!tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { name } = req.params;
            // Try tenant first, then system
            let optionList = await this.service.getByName(name, tenantId);
            if (!optionList) {
                optionList = await this.service.getSystemByName(name);
            }
            if (!optionList) {
                reply.status(404).send({ error: `Option list '${name}' not found` });
                return;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.getByName.duration', duration);
            reply.send(optionList);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * GET /api/v1/option-lists/by-name/:name/options
     * Get just the options for a list by name (for field selects)
     */
    getOptions = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { tenantId } = auth;
            if (!tenantId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            const { name } = req.params;
            const scope = req.query.scope || 'tenant';
            const optionsRef = `${scope}:${name}`;
            const options = await this.service.getOptions(optionsRef, tenantId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.getOptions.duration', duration);
            reply.send({ options, count: options.length });
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * PATCH /api/v1/option-lists/:id
     * Update an option list
     */
    updateOptionList = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            const { tenantId, userId, roles } = auth;
            const { id } = req.params;
            const { displayName, description, options, allowTenantOverride, isActive, tags } = req.body;
            // Check permissions
            const userRoles = roles || [];
            const canUpdate = userRoles.includes(UserRole.SUPER_ADMIN) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canUpdate) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can update option lists',
                });
                return;
            }
            // Try tenant first, then system (for super admins)
            let optionList = await this.service.getById(id, tenantId);
            let effectiveTenantId = tenantId;
            if (!optionList && userRoles.includes(UserRole.SUPER_ADMIN)) {
                optionList = await this.service.getById(id, 'system');
                effectiveTenantId = 'system';
            }
            if (!optionList) {
                reply.status(404).send({ error: 'Option list not found' });
                return;
            }
            const updated = await this.service.update(id, effectiveTenantId, {
                displayName,
                description,
                options,
                allowTenantOverride,
                isActive,
                tags,
                updatedBy: userId,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.update.duration', duration);
            reply.send(updated);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * DELETE /api/v1/option-lists/:id
     * Delete an option list
     */
    deleteOptionList = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            const { tenantId, userId, roles } = auth;
            const { id } = req.params;
            // Check permissions
            const userRoles = roles || [];
            const canDelete = userRoles.includes(UserRole.SUPER_ADMIN) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canDelete) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can delete option lists',
                });
                return;
            }
            await this.service.delete(id, tenantId, userId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.delete.duration', duration);
            reply.status(204).send();
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * POST /api/v1/option-lists/:id/options
     * Add options to an existing list
     */
    addOptions = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            const { tenantId, userId, roles } = auth;
            const { id } = req.params;
            const { options } = req.body;
            // Check permissions
            const userRoles = roles || [];
            const canUpdate = userRoles.includes(UserRole.SUPER_ADMIN) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canUpdate) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can modify option lists',
                });
                return;
            }
            if (!options || options.length === 0) {
                reply.status(400).send({ error: 'Options array is required' });
                return;
            }
            const updated = await this.service.addOptions(id, tenantId, options, userId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.addOptions.duration', duration);
            reply.send(updated);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * DELETE /api/v1/option-lists/:id/options
     * Remove options from an existing list
     */
    removeOptions = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            const { tenantId, userId, roles } = auth;
            const { id } = req.params;
            const { values } = req.body;
            // Check permissions
            const userRoles = roles || [];
            const canUpdate = userRoles.includes(UserRole.SUPER_ADMIN) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canUpdate) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can modify option lists',
                });
                return;
            }
            if (!values || values.length === 0) {
                reply.status(400).send({ error: 'Values array is required' });
                return;
            }
            const updated = await this.service.removeOptions(id, tenantId, values, userId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.removeOptions.duration', duration);
            reply.send(updated);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * POST /api/v1/option-lists/system/:name/override
     * Create a tenant override for a system list
     */
    createTenantOverride = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth;
            if (!auth || !auth.tenantId || !(auth).userId) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            const { tenantId, userId, roles } = auth;
            const { name } = req.params;
            const { options } = req.body;
            // Check permissions
            const userRoles = roles || [];
            const canCreate = userRoles.includes(UserRole.SUPER_ADMIN) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canCreate) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can create tenant overrides',
                });
                return;
            }
            if (!options || options.length === 0) {
                reply.status(400).send({ error: 'Options array is required' });
                return;
            }
            const override = await this.service.createTenantOverride(name, tenantId, options, userId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.optionLists.createOverride.duration', duration);
            reply.status(201).send(override);
        }
        catch (error) {
            this.handleError(error, reply, startTime);
        }
    };
    /**
     * Handle errors consistently
     */
    handleError(error, reply, startTime) {
        const duration = Date.now() - startTime;
        this.monitoring.trackMetric('api.optionLists.error.duration', duration);
        if (error instanceof OptionListError) {
            switch (error.code) {
                case OptionListErrorCode.NOT_FOUND:
                    reply.status(404).send({ error: error.message, code: error.code });
                    break;
                case OptionListErrorCode.NAME_EXISTS:
                    reply.status(409).send({ error: error.message, code: error.code });
                    break;
                case OptionListErrorCode.SYSTEM_LIST_READONLY:
                    reply.status(403).send({ error: error.message, code: error.code });
                    break;
                case OptionListErrorCode.VALIDATION_FAILED:
                case OptionListErrorCode.INVALID_REF:
                    reply.status(400).send({ error: error.message, code: error.code });
                    break;
                default:
                    reply.status(500).send({ error: 'Internal server error' });
            }
        }
        else {
            this.monitoring.trackException(error, {
                controller: 'OptionListController',
            });
            reply.status(500).send({ error: 'Internal server error' });
        }
    }
}
//# sourceMappingURL=option-list.controller.js.map