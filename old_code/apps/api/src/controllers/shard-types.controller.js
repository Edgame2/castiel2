import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardTypeStatus, ShardTypeCategory, } from '../types/shard-type.types.js';
import { UserRole } from '@castiel/shared-types';
// Utility: normalize role names and check super admin across aliases
const SUPER_ADMIN_ALIASES = new Set([
    'super_admin',
    'super-admin',
    'superadmin',
    'global_admin',
    'global-admin',
]);
function isSuperAdminRole(roles) {
    if (!roles || roles.length === 0) {
        return false;
    }
    return roles.some((r) => {
        if (!r) {
            return false;
        }
        const raw = String(r);
        const lower = raw.toLowerCase();
        const underscored = lower.replace(/-/g, '_');
        return (SUPER_ADMIN_ALIASES.has(raw) ||
            SUPER_ADMIN_ALIASES.has(lower) ||
            SUPER_ADMIN_ALIASES.has(underscored));
    });
}
// AuthContext declaration moved to types/fastify.d.ts
/**
 * ShardTypes Controller
 * Handles all REST API operations for ShardTypes
 * NO CACHING - ShardTypes don't change frequently
 */
export class ShardTypesController {
    repository;
    monitoring;
    enrichmentService;
    shardRepository;
    constructor(monitoring, enrichmentService, shardRepository) {
        this.monitoring = monitoring;
        this.repository = new ShardTypeRepository(monitoring);
        this.enrichmentService = enrichmentService;
        this.shardRepository = shardRepository;
    }
    /**
     * Initialize repository
     */
    async initialize() {
        await this.repository.ensureContainer();
    }
    /**
     * POST /api/v1/shard-types
     * Create a new shard type
     */
    createShardType = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId, id: userId, roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!userId || (!tenantId && !isSuperAdmin)) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { name, displayName, description, category, schema, uiSchema, icon, color, tags, parentShardTypeId, isGlobal, } = req.body;
            // Role-based authorization for global ShardTypes
            if (isGlobal === true || isGlobal === 'true') {
                const userRoles = roles || [];
                const isSuperAdmin = isSuperAdminRole(userRoles);
                if (!isSuperAdmin) {
                    reply.status(403).send({
                        error: 'Forbidden: Only SUPER_ADMIN can create global ShardTypes'
                    });
                    return;
                }
            }
            else {
                // Check if user has permission to create tenant ShardTypes (ADMIN or SUPER_ADMIN)
                const userRoles = roles || [];
                const canCreate = isSuperAdminRole(userRoles) ||
                    userRoles.includes(UserRole.ADMIN);
                if (!canCreate) {
                    reply.status(403).send({
                        error: 'Forbidden: Only ADMIN or SUPER_ADMIN can create ShardTypes'
                    });
                    return;
                }
            }
            // Validation
            if (!name || !displayName || !description || !category || !schema) {
                reply.status(400).send({ error: 'Missing required fields: name, displayName, description, category, schema' });
                return;
            }
            // Validate category
            if (!Object.values(ShardTypeCategory).includes(category)) {
                reply.status(400).send({
                    error: `Invalid category. Must be one of: ${Object.values(ShardTypeCategory).join(', ')}`
                });
                return;
            }
            // Check if name already exists for this tenant
            const existing = await this.repository.findByName(name, tenantId);
            if (existing) {
                reply.status(409).send({ error: `ShardType with name '${name}' already exists` });
                return;
            }
            // Create input
            const normalizedTags = Array.isArray(tags)
                ? tags
                : typeof tags === 'string'
                    ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                    : [];
            const input = {
                tenantId: tenantId,
                name,
                displayName,
                description,
                category,
                schema,
                uiSchema,
                icon,
                color,
                tags: normalizedTags,
                parentShardTypeId,
                isGlobal: isGlobal === true || isGlobal === 'true',
                isCustom: true,
                createdBy: userId,
            };
            const shardType = await this.repository.create(input);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.create.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.create.success', {
                shardTypeId: shardType.id,
                tenantId,
                name: shardType.name,
            });
            reply.status(201).send(shardType);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.create.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.create',
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to create shard type' });
        }
    };
    /**
     * GET /api/v1/shard-types
     * List shard types with filtering and pagination
     */
    listShardTypes = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId } = req.auth || {};
            const { roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { name, category, isCustom, isBuiltIn, status, parentShardTypeId, createdBy, createdAfter, createdBefore, isGlobal, tags, search, limit = '50', continuationToken, orderBy = 'name', orderDirection = 'asc', } = req.query;
            const normalizedTags = Array.isArray(tags)
                ? tags
                : typeof tags === 'string'
                    ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                    : undefined;
            const result = await this.repository.list({
                filter: {
                    tenantId: tenantId,
                    name,
                    category,
                    isCustom: isCustom === 'true' ? true : isCustom === 'false' ? false : undefined,
                    isBuiltIn: isBuiltIn === 'true' ? true : isBuiltIn === 'false' ? false : undefined,
                    status,
                    parentShardTypeId,
                    createdBy,
                    createdAfter: createdAfter ? (() => {
                        const date = new Date(createdAfter);
                        return isNaN(date.getTime()) ? undefined : date;
                    })() : undefined,
                    createdBefore: createdBefore ? (() => {
                        const date = new Date(createdBefore);
                        return isNaN(date.getTime()) ? undefined : date;
                    })() : undefined,
                    isGlobal: isGlobal === 'true' ? true : isGlobal === 'false' ? false : undefined,
                    tags: normalizedTags,
                    search,
                },
                limit: (() => {
                    const parsed = parseInt(limit, 10);
                    return isNaN(parsed) || parsed < 1 ? 50 : Math.min(parsed, 1000); // Max 1000 items per page
                })(),
                continuationToken,
                orderBy: orderBy,
                orderDirection: orderDirection,
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.list.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.list.success', {
                tenantId,
                count: result.count,
            });
            reply.status(200).send(result);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.list.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.list',
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to list shard types' });
        }
    };
    /**
     * GET /api/v1/shard-types/:id
     * Get a single shard type by ID
     */
    getShardType = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId } = req.auth || {};
            const { roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { id } = req.params;
            const { includeInheritance = 'false' } = req.query;
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            let shardType;
            if (includeInheritance === 'true') {
                shardType = await this.repository.findByIdWithInheritance(id, tenantId);
            }
            else {
                shardType = await this.repository.findById(id, tenantId);
            }
            if (!shardType) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.get.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.get.success', {
                shardTypeId: id,
                tenantId,
            });
            reply.status(200).send(shardType);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.get.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.get',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to get shard type' });
        }
    };
    /**
     * PUT /api/v1/shard-types/:id
     * Update a shard type
     */
    updateShardType = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId, id: userId, roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!userId || (!tenantId && !isSuperAdmin)) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { id } = req.params;
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            // Check if shard type exists
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            // Role-based authorization
            const userRoles = roles || [];
            const isAdmin = userRoles.includes(UserRole.ADMIN);
            // Super admin can update any ShardType
            // Admin can only update tenant ShardTypes (not global ones)
            if (!isSuperAdmin && (!isAdmin || existing.isGlobal)) {
                reply.status(403).send({
                    error: 'Forbidden: Insufficient permissions to update this ShardType'
                });
                return;
            }
            // Prevent updating built-in types
            if (existing.isBuiltIn) {
                reply.status(403).send({ error: 'Cannot update built-in ShardType' });
                return;
            }
            const { name, displayName, description, category, schema, uiSchema, icon, color, tags, status, isGlobal, parentShardTypeId, } = req.body;
            // Prevent making a ShardType global unless SUPER_ADMIN
            if (isGlobal === true || isGlobal === 'true') {
                if (!isSuperAdmin) {
                    reply.status(403).send({
                        error: 'Forbidden: Only SUPER_ADMIN can make ShardTypes global'
                    });
                    return;
                }
            }
            // If name is changing, check for conflicts
            if (name && name !== existing.name) {
                const conflicting = await this.repository.findByName(name, tenantId);
                if (conflicting) {
                    reply.status(409).send({ error: `ShardType with name '${name}' already exists` });
                    return;
                }
            }
            // Validate category if provided
            if (category && !Object.values(ShardTypeCategory).includes(category)) {
                reply.status(400).send({
                    error: `Invalid category. Must be one of: ${Object.values(ShardTypeCategory).join(', ')}`
                });
                return;
            }
            // Validate status if provided
            if (status && !Object.values(ShardTypeStatus).includes(status)) {
                reply.status(400).send({
                    error: `Invalid status. Must be one of: ${Object.values(ShardTypeStatus).join(', ')}`
                });
                return;
            }
            if (parentShardTypeId) {
                const circular = await this.repository.checkCircularInheritance(id, parentShardTypeId, tenantId);
                if (circular) {
                    reply.status(400).send({ error: 'Circular inheritance detected for the selected parent type' });
                    return;
                }
            }
            const parentToValidateId = parentShardTypeId ?? existing.parentShardTypeId;
            let parentType;
            if (parentToValidateId) {
                parentType = await this.repository.findById(parentToValidateId, tenantId);
                if (!parentType) {
                    reply.status(400).send({ error: 'Specified parent ShardType does not exist' });
                    return;
                }
            }
            const schemaToValidate = schema ?? existing.schema;
            if (parentType && schemaToValidate && !this.repository.validateSchemaCompatibility(parentType.schema, schemaToValidate)) {
                reply.status(400).send({ error: 'Schema changes are not compatible with parent ShardType' });
                return;
            }
            const normalizedTags = Array.isArray(tags)
                ? tags
                : typeof tags === 'string'
                    ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                    : undefined;
            const resolvedIsGlobal = isGlobal === 'true' ? true : isGlobal === 'false' ? false : typeof isGlobal === 'boolean' ? isGlobal : undefined;
            const input = {
                name,
                displayName,
                description,
                category,
                schema,
                status,
                uiSchema,
                icon,
                color,
                tags: normalizedTags,
                isGlobal: resolvedIsGlobal,
                parentShardTypeId,
            };
            const updated = await this.repository.update(id, tenantId, input);
            if (!updated) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.update.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.update.success', {
                shardTypeId: id,
                tenantId,
                version: updated.version,
            });
            reply.status(200).send(updated);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.update.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.update',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to update shard type' });
        }
    };
    /**
     * DELETE /api/v1/shard-types/:id
     * Soft delete a shard type
     */
    deleteShardType = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId, roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { id } = req.params;
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            // Check if shard type exists
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            // Role-based authorization
            const userRoles = roles || [];
            const isAdmin = userRoles.includes(UserRole.ADMIN);
            // Super admin can delete any ShardType
            // Admin can only delete tenant ShardTypes (not global ones)
            if (!isSuperAdmin && (!isAdmin || existing.isGlobal)) {
                reply.status(403).send({
                    error: 'Forbidden: Insufficient permissions to delete this ShardType'
                });
                return;
            }
            // Prevent deleting built-in types
            if (existing.isBuiltIn) {
                reply.status(403).send({ error: 'Cannot delete built-in ShardType' });
                return;
            }
            // Check if ShardType is in use
            const inUse = await this.repository.checkShardTypeInUse(id, tenantId);
            if (inUse) {
                reply.status(409).send({
                    error: 'Cannot delete ShardType: it is currently in use by existing Shards'
                });
                return;
            }
            const success = await this.repository.delete(id, tenantId);
            if (!success) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.delete.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.delete.success', {
                shardTypeId: id,
                tenantId,
            });
            reply.status(204).send();
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.delete.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.delete',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to delete shard type' });
        }
    };
    /**
     * GET /api/v1/shard-types/:id/children
     * Get all child types of a parent
     */
    getChildTypes = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId, roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { id } = req.params;
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            const children = await this.repository.findChildren(id, tenantId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.getChildren.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.getChildren.success', {
                parentId: id,
                tenantId,
                count: children.length,
            });
            reply.status(200).send({ children, count: children.length });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.getChildren.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.getChildren',
                parentId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to get child types' });
        }
    };
    /**
     * GET /api/v1/shard-types/:id/usage
     * Get usage statistics for a shard type
     */
    getUsageStats = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId } = req.auth || {};
            const { roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { id } = req.params;
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            // Check if shard type exists
            const shardType = await this.repository.findById(id, tenantId);
            if (!shardType) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            // Get usage count
            const usageCount = await this.repository.getShardTypeUsageCount(id, tenantId);
            const inUse = await this.repository.checkShardTypeInUse(id, tenantId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.getUsage.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.getUsage.success', {
                shardTypeId: id,
                tenantId,
                usageCount,
            });
            reply.status(200).send({
                shardTypeId: id,
                usageCount,
                inUse,
                canDelete: !inUse,
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.getUsage.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.getUsage',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to get usage statistics' });
        }
    };
    /**
     * POST /api/v1/shard-types/validate-schema
     * Validate a JSON schema
     */
    validateSchemaEndpoint = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId } = req.auth || {};
            const { roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { schema, parentShardTypeId } = req.body;
            if (!schema) {
                reply.status(400).send({ error: 'Missing required field: schema' });
                return;
            }
            // Basic JSON Schema validation
            const errors = [];
            // Check if it's a valid object
            if (typeof schema !== 'object' || schema === null) {
                errors.push('Schema must be a valid JSON object');
            }
            // Check for required JSON Schema properties
            if (!schema.type && !schema.$ref && !schema.allOf && !schema.anyOf && !schema.oneOf) {
                errors.push('Schema must have a type, $ref, or composition keyword (allOf, anyOf, oneOf)');
            }
            // If parentShardTypeId is provided, check compatibility
            let parentCompatible = true;
            if (parentShardTypeId) {
                const parentType = await this.repository.findById(parentShardTypeId, tenantId);
                if (!parentType) {
                    errors.push(`Parent ShardType with ID ${parentShardTypeId} not found`);
                }
                else {
                    parentCompatible = this.repository.validateSchemaCompatibility(parentType.schema, schema);
                    if (!parentCompatible) {
                        errors.push('Schema is not compatible with parent schema');
                    }
                }
            }
            const isValid = errors.length === 0;
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.validateSchema.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.validateSchema.completed', {
                tenantId,
                isValid,
                hasParent: !!parentShardTypeId,
                errorCount: errors.length,
            });
            reply.status(200).send({
                valid: isValid,
                errors: errors.length > 0 ? errors : undefined,
                parentCompatible: parentShardTypeId ? parentCompatible : undefined,
                warnings: [],
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.validateSchema.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.validateSchema',
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to validate schema' });
        }
    };
    /**
     * POST /api/v1/shard-types/:id/clone
     * Clone a ShardType with customizations
     */
    cloneShardType = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId, id: userId, roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!userId || (!tenantId && !isSuperAdmin)) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            // Check if user has permission to clone (ADMIN or SUPER_ADMIN)
            const userRoles = roles || [];
            const canClone = isSuperAdminRole(userRoles) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canClone) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can clone ShardTypes'
                });
                return;
            }
            const { id } = req.params;
            const { name, displayName, customizations } = req.body;
            if (!id) {
                reply.status(400).send({ error: 'Missing source ShardType ID' });
                return;
            }
            // Clone the ShardType
            const clonedType = await this.repository.cloneShardType(id, tenantId, {
                name,
                displayName,
                fields: customizations?.fields,
                enrichment: customizations?.enrichment,
                validationRules: customizations?.validationRules,
                fieldGroups: customizations?.fieldGroups,
            }, userId);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.clone.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.clone.success', {
                sourceId: id,
                clonedId: clonedType.id,
                tenantId,
                userId,
            });
            reply.status(201).send(clonedType);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.clone.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.clone',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            // Handle specific errors
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    reply.status(404).send({ error: error.message });
                    return;
                }
                if (error.message.includes('not marked as cloneable')) {
                    reply.status(400).send({ error: error.message });
                    return;
                }
            }
            reply.status(500).send({ error: 'Failed to clone ShardType' });
        }
    };
    /**
     * GET /api/v1/shard-types/:id/relationships
     * Get ShardType with resolved relationships
     */
    getWithRelationships = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId } = req.auth || {};
            const { roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!tenantId && !isSuperAdmin) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            const { id } = req.params;
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            const shardType = await this.repository.getByIdWithRelationships(id, tenantId);
            if (!shardType) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.getRelationships.duration', duration);
            this.monitoring.trackEvent('api.shardTypes.getRelationships.success', {
                shardTypeId: id,
                tenantId,
                relationshipCount: shardType.relationships?.length || 0,
            });
            reply.status(200).send(shardType);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.getRelationships.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.getRelationships',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to get ShardType with relationships' });
        }
    };
    /**
     * POST /api/v1/shard-types/:id/enrich
     * Manually trigger enrichment for a ShardType
     * Note: This is a placeholder - actual enrichment logic would be implemented separately
     */
    triggerEnrichment = async (req, reply) => {
        const startTime = Date.now();
        try {
            let { tenantId, id: userId, roles } = req.auth || {};
            const isSuperAdmin = isSuperAdminRole(roles);
            if (!userId || (!tenantId && !isSuperAdmin)) {
                reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                return;
            }
            if (!tenantId && isSuperAdmin) {
                tenantId = 'system';
            }
            // Check if user has permission (ADMIN or SUPER_ADMIN)
            const userRoles = roles || [];
            const canTrigger = isSuperAdminRole(userRoles) ||
                userRoles.includes(UserRole.ADMIN);
            if (!canTrigger) {
                reply.status(403).send({
                    error: 'Forbidden: Only ADMIN or SUPER_ADMIN can trigger enrichment'
                });
                return;
            }
            const { id } = req.params;
            // const { sampleData } = req.body as any; // Reserved for future enrichment implementation
            if (!id) {
                reply.status(400).send({ error: 'Missing shard type ID' });
                return;
            }
            // Check if ShardType exists and has enrichment configured
            const shardType = await this.repository.findById(id, tenantId);
            if (!shardType) {
                reply.status(404).send({ error: 'ShardType not found' });
                return;
            }
            if (!shardType.enrichment?.enabled) {
                reply.status(400).send({
                    error: 'Enrichment is not enabled for this ShardType'
                });
                return;
            }
            // Check if enrichment service is available
            // Try to get from server if not passed in constructor (lazy initialization)
            if (!this.enrichmentService) {
                const serverEnrichmentService = req.server.enrichmentService;
                if (serverEnrichmentService) {
                    this.enrichmentService = serverEnrichmentService;
                }
                else {
                    reply.status(503).send({
                        error: 'Enrichment service not available',
                        message: 'EnrichmentService is not initialized. Please check server configuration.'
                    });
                    return;
                }
            }
            // Get enrichment configuration ID from shard type
            // Use shardTypeId as the config identifier, or create a default one
            const enrichmentConfigId = `enrichment-${id}`;
            // Trigger bulk enrichment for all shards of this type
            try {
                const bulkResult = await this.enrichmentService.bulkEnrich({
                    tenantId: tenantId,
                    configId: enrichmentConfigId,
                    shardTypeId: id,
                    triggeredBy: 'manual',
                    triggeredByUserId: userId,
                    priority: 'normal',
                });
                const duration = Date.now() - startTime;
                this.monitoring.trackMetric('api.shardTypes.triggerEnrichment.duration', duration);
                this.monitoring.trackEvent('api.shardTypes.triggerEnrichment.success', {
                    shardTypeId: id,
                    tenantId,
                    userId,
                    batchId: bulkResult.batchId,
                    jobsCreated: bulkResult.jobsCreated,
                });
                reply.status(202).send({
                    message: 'Enrichment triggered successfully',
                    shardTypeId: id,
                    batchId: bulkResult.batchId,
                    status: 'queued',
                    totalShards: bulkResult.totalShards,
                    jobsCreated: bulkResult.jobsCreated,
                    estimatedTimeMinutes: bulkResult.estimatedTimeMinutes,
                });
            }
            catch (enrichmentError) {
                this.monitoring.trackException(enrichmentError instanceof Error ? enrichmentError : new Error(String(enrichmentError)), {
                    operation: 'shardTypes.controller.triggerEnrichment.bulkEnrich',
                    shardTypeId: id,
                    tenantId,
                });
                reply.status(500).send({
                    error: 'Failed to trigger enrichment',
                    message: enrichmentError.message || 'Unknown error during enrichment job creation',
                });
                return;
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shardTypes.triggerEnrichment.duration', duration);
            this.monitoring.trackException(error, {
                operation: 'shardTypes.controller.triggerEnrichment',
                shardTypeId: req.params.id,
                tenantId: req.auth?.tenantId,
            });
            reply.status(500).send({ error: 'Failed to trigger enrichment' });
        }
    };
}
//# sourceMappingURL=shard-types.controller.js.map