/**
 * Option List Service
 *
 * Business logic for managing reusable dropdown option lists.
 * Implements OptionListProvider interface for field validation integration.
 */
import { parseOptionsRef, PRIORITY_OPTIONS, STATUS_OPTIONS, CURRENCY_OPTIONS, BUILT_IN_OPTION_LISTS, } from '../types/option-list.types.js';
/**
 * Error codes for option list operations
 */
export var OptionListErrorCode;
(function (OptionListErrorCode) {
    OptionListErrorCode["NOT_FOUND"] = "OPTION_LIST_NOT_FOUND";
    OptionListErrorCode["NAME_EXISTS"] = "OPTION_LIST_NAME_EXISTS";
    OptionListErrorCode["SYSTEM_LIST_READONLY"] = "SYSTEM_LIST_READONLY";
    OptionListErrorCode["INVALID_REF"] = "INVALID_OPTIONS_REF";
    OptionListErrorCode["VALIDATION_FAILED"] = "OPTION_LIST_VALIDATION_FAILED";
})(OptionListErrorCode || (OptionListErrorCode = {}));
/**
 * Option List Service Error
 */
export class OptionListError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'OptionListError';
    }
}
/**
 * Option List Service
 */
export class OptionListService {
    repository;
    monitoring;
    cache = new Map();
    CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    constructor(repository, monitoring) {
        this.repository = repository;
        this.monitoring = monitoring;
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.repository.initialize();
        await this.seedSystemLists();
    }
    /**
     * Seed built-in system option lists
     */
    async seedSystemLists() {
        const systemLists = [
            {
                name: BUILT_IN_OPTION_LISTS.PRIORITIES,
                displayName: 'Priorities',
                description: 'Standard priority levels',
                options: PRIORITY_OPTIONS,
            },
            {
                name: BUILT_IN_OPTION_LISTS.STATUSES,
                displayName: 'Statuses',
                description: 'Standard status options',
                options: STATUS_OPTIONS,
            },
            {
                name: BUILT_IN_OPTION_LISTS.CURRENCIES,
                displayName: 'Currencies',
                description: 'Common currencies',
                options: CURRENCY_OPTIONS,
            },
        ];
        for (const listDef of systemLists) {
            const existing = await this.repository.getByName(listDef.name, 'system');
            if (!existing) {
                await this.repository.create({
                    tenantId: 'system',
                    name: listDef.name,
                    displayName: listDef.displayName,
                    description: listDef.description,
                    options: listDef.options,
                    isSystem: true,
                    allowTenantOverride: true,
                    createdBy: 'system',
                });
                this.monitoring.trackEvent('system-option-list-seeded', {
                    name: listDef.name,
                });
            }
        }
    }
    // ============================================================================
    // OptionListProvider Implementation
    // ============================================================================
    /**
     * Get options for a field (implements OptionListProvider)
     * @param optionsRef Reference string in format "scope:name"
     * @param tenantId Tenant ID to resolve tenant-specific lists
     */
    async getOptions(optionsRef, tenantId) {
        // Check cache
        const cacheKey = `${optionsRef}:${tenantId}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.options;
        }
        // Parse reference
        const ref = parseOptionsRef(optionsRef);
        if (!ref) {
            throw new OptionListError(OptionListErrorCode.INVALID_REF, `Invalid options reference: ${optionsRef}`);
        }
        let options = [];
        if (ref.scope === 'system') {
            // Get system list
            const systemList = await this.repository.getByName(ref.name, 'system');
            if (systemList) {
                options = systemList.options;
            }
        }
        else if (ref.scope === 'tenant') {
            // Try tenant-specific first, fall back to system
            const tenantList = await this.repository.getByName(ref.name, tenantId);
            if (tenantList) {
                options = tenantList.options;
            }
            else {
                // Check for system list with same name
                const systemList = await this.repository.getByName(ref.name, 'system');
                if (systemList && systemList.allowTenantOverride) {
                    options = systemList.options;
                }
            }
        }
        // Cache the result
        this.cache.set(cacheKey, {
            options,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
        return options;
    }
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    /**
     * Create an option list
     */
    async create(input) {
        // Validate input
        this.validateOptionListInput(input);
        // Check name uniqueness
        const isUnique = await this.repository.isNameUnique(input.name, input.tenantId);
        if (!isUnique) {
            throw new OptionListError(OptionListErrorCode.NAME_EXISTS, `Option list with name "${input.name}" already exists`, { name: input.name, tenantId: input.tenantId });
        }
        const optionList = await this.repository.create(input);
        // Invalidate cache
        this.invalidateCacheForList(input.tenantId, input.name);
        this.monitoring.trackEvent('option-list-created', {
            id: optionList.id,
            name: input.name,
            tenantId: input.tenantId,
            optionsCount: input.options.length,
        });
        return optionList;
    }
    /**
     * Get an option list by ID
     */
    async getById(id, tenantId) {
        return this.repository.getById(id, tenantId);
    }
    /**
     * Get an option list by name
     */
    async getByName(name, tenantId) {
        return this.repository.getByName(name, tenantId);
    }
    /**
     * Get a system option list by name
     */
    async getSystemByName(name) {
        return this.repository.getSystemByName(name);
    }
    /**
     * Update an option list
     */
    async update(id, tenantId, input) {
        const existing = await this.repository.getById(id, tenantId);
        if (!existing) {
            throw new OptionListError(OptionListErrorCode.NOT_FOUND, `Option list not found: ${id}`);
        }
        // Don't allow modifying core system list properties
        if (existing.isSystem && existing.tenantId === 'system') {
            // Only allow updating options and displayName for system lists
            const allowedFields = ['options', 'displayName', 'description', 'updatedBy'];
            const inputKeys = Object.keys(input);
            const invalidFields = inputKeys.filter(k => !allowedFields.includes(k));
            if (invalidFields.length > 0) {
                throw new OptionListError(OptionListErrorCode.SYSTEM_LIST_READONLY, `Cannot modify system list properties: ${invalidFields.join(', ')}`);
            }
        }
        // Validate options if provided
        if (input.options) {
            this.validateOptions(input.options);
        }
        const updated = await this.repository.update(id, tenantId, input);
        if (!updated) {
            throw new OptionListError(OptionListErrorCode.NOT_FOUND, `Option list not found: ${id}`);
        }
        // Invalidate cache
        this.invalidateCacheForList(tenantId, existing.name);
        this.monitoring.trackEvent('option-list-updated', {
            id,
            tenantId,
            name: existing.name,
        });
        return updated;
    }
    /**
     * Delete an option list
     */
    async delete(id, tenantId, deletedBy) {
        const existing = await this.repository.getById(id, tenantId);
        if (!existing) {
            throw new OptionListError(OptionListErrorCode.NOT_FOUND, `Option list not found: ${id}`);
        }
        if (existing.isSystem) {
            throw new OptionListError(OptionListErrorCode.SYSTEM_LIST_READONLY, 'Cannot delete system option lists');
        }
        await this.repository.delete(id, tenantId, deletedBy);
        // Invalidate cache
        this.invalidateCacheForList(tenantId, existing.name);
        this.monitoring.trackEvent('option-list-deleted', {
            id,
            tenantId,
            name: existing.name,
        });
    }
    /**
     * List option lists
     */
    async list(options) {
        return this.repository.list(options);
    }
    /**
     * Get all available lists for a tenant (system + tenant-specific)
     */
    async getAvailableListsForTenant(tenantId) {
        const [systemLists, tenantLists] = await Promise.all([
            this.repository.getSystemLists(),
            this.repository.getTenantLists(tenantId),
        ]);
        // Merge: tenant lists override system lists with same name
        const listMap = new Map();
        for (const list of systemLists) {
            listMap.set(list.name, list);
        }
        for (const list of tenantLists) {
            listMap.set(list.name, list);
        }
        return Array.from(listMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    /**
     * Create a tenant override for a system list
     */
    async createTenantOverride(systemListName, tenantId, options, createdBy) {
        // Get the system list
        const systemList = await this.repository.getByName(systemListName, 'system');
        if (!systemList) {
            throw new OptionListError(OptionListErrorCode.NOT_FOUND, `System option list not found: ${systemListName}`);
        }
        if (!systemList.allowTenantOverride) {
            throw new OptionListError(OptionListErrorCode.SYSTEM_LIST_READONLY, `System list "${systemListName}" does not allow tenant overrides`);
        }
        // Create tenant-specific list
        return this.create({
            tenantId,
            name: systemListName,
            displayName: systemList.displayName,
            description: `Tenant override of ${systemList.displayName}`,
            options,
            isSystem: false,
            allowTenantOverride: false,
            tags: ['override', ...systemList.tags],
            createdBy,
        });
    }
    /**
     * Add options to an existing list
     */
    async addOptions(id, tenantId, newOptions, updatedBy) {
        const existing = await this.repository.getById(id, tenantId);
        if (!existing) {
            throw new OptionListError(OptionListErrorCode.NOT_FOUND, `Option list not found: ${id}`);
        }
        // Validate new options
        this.validateOptions(newOptions);
        // Check for duplicate values
        const existingValues = new Set(existing.options.map(o => o.value));
        const duplicates = newOptions.filter(o => existingValues.has(o.value));
        if (duplicates.length > 0) {
            throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, `Duplicate option values: ${duplicates.map(d => d.value).join(', ')}`);
        }
        const mergedOptions = [...existing.options, ...newOptions];
        return this.update(id, tenantId, { options: mergedOptions, updatedBy });
    }
    /**
     * Remove options from an existing list
     */
    async removeOptions(id, tenantId, valuesToRemove, updatedBy) {
        const existing = await this.repository.getById(id, tenantId);
        if (!existing) {
            throw new OptionListError(OptionListErrorCode.NOT_FOUND, `Option list not found: ${id}`);
        }
        const filteredOptions = existing.options.filter(o => !valuesToRemove.includes(o.value));
        return this.update(id, tenantId, { options: filteredOptions, updatedBy });
    }
    // ============================================================================
    // Validation Helpers
    // ============================================================================
    validateOptionListInput(input) {
        // Validate name format (lowercase, alphanumeric with hyphens)
        if (!/^[a-z0-9-]+$/.test(input.name)) {
            throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, 'Name must be lowercase alphanumeric with hyphens only');
        }
        // Validate options
        this.validateOptions(input.options);
    }
    validateOptions(options) {
        if (!Array.isArray(options)) {
            throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, 'Options must be an array');
        }
        if (options.length === 0) {
            throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, 'Options array cannot be empty');
        }
        // Check for unique values
        const values = options.map(o => o.value);
        const uniqueValues = new Set(values);
        if (uniqueValues.size !== values.length) {
            throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, 'Option values must be unique');
        }
        // Validate each option
        for (const option of options) {
            if (!option.value || typeof option.value !== 'string') {
                throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, 'Each option must have a string value');
            }
            if (!option.label || typeof option.label !== 'string') {
                throw new OptionListError(OptionListErrorCode.VALIDATION_FAILED, 'Each option must have a string label');
            }
        }
    }
    // ============================================================================
    // Cache Management
    // ============================================================================
    invalidateCacheForList(tenantId, name) {
        // Invalidate all cache entries that might contain this list
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(name)) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            this.cache.delete(key);
        }
    }
    /**
     * Clear the entire cache
     */
    clearCache() {
        this.cache.clear();
        this.monitoring.trackEvent('option-list-cache-cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}
//# sourceMappingURL=option-list.service.js.map