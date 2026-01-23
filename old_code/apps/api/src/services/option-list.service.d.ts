/**
 * Option List Service
 *
 * Business logic for managing reusable dropdown option lists.
 * Implements OptionListProvider interface for field validation integration.
 */
import type { SelectOption } from '@castiel/shared-types';
import { IMonitoringProvider } from '@castiel/monitoring';
import { OptionListRepository } from '../repositories/option-list.repository.js';
import { OptionList, CreateOptionListInput, UpdateOptionListInput, OptionListListOptions, OptionListListResult } from '../types/option-list.types.js';
import type { OptionListProvider } from './field-validation.service.js';
/**
 * Error codes for option list operations
 */
export declare enum OptionListErrorCode {
    NOT_FOUND = "OPTION_LIST_NOT_FOUND",
    NAME_EXISTS = "OPTION_LIST_NAME_EXISTS",
    SYSTEM_LIST_READONLY = "SYSTEM_LIST_READONLY",
    INVALID_REF = "INVALID_OPTIONS_REF",
    VALIDATION_FAILED = "OPTION_LIST_VALIDATION_FAILED"
}
/**
 * Option List Service Error
 */
export declare class OptionListError extends Error {
    code: OptionListErrorCode;
    details?: Record<string, unknown> | undefined;
    constructor(code: OptionListErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
/**
 * Option List Service
 */
export declare class OptionListService implements OptionListProvider {
    private repository;
    private monitoring;
    private cache;
    private readonly CACHE_TTL_MS;
    constructor(repository: OptionListRepository, monitoring: IMonitoringProvider);
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Seed built-in system option lists
     */
    private seedSystemLists;
    /**
     * Get options for a field (implements OptionListProvider)
     * @param optionsRef Reference string in format "scope:name"
     * @param tenantId Tenant ID to resolve tenant-specific lists
     */
    getOptions(optionsRef: string, tenantId: string): Promise<SelectOption[]>;
    /**
     * Create an option list
     */
    create(input: CreateOptionListInput): Promise<OptionList>;
    /**
     * Get an option list by ID
     */
    getById(id: string, tenantId: string): Promise<OptionList | null>;
    /**
     * Get an option list by name
     */
    getByName(name: string, tenantId: string): Promise<OptionList | null>;
    /**
     * Get a system option list by name
     */
    getSystemByName(name: string): Promise<OptionList | null>;
    /**
     * Update an option list
     */
    update(id: string, tenantId: string, input: UpdateOptionListInput): Promise<OptionList>;
    /**
     * Delete an option list
     */
    delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
    /**
     * List option lists
     */
    list(options: OptionListListOptions): Promise<OptionListListResult>;
    /**
     * Get all available lists for a tenant (system + tenant-specific)
     */
    getAvailableListsForTenant(tenantId: string): Promise<OptionList[]>;
    /**
     * Create a tenant override for a system list
     */
    createTenantOverride(systemListName: string, tenantId: string, options: SelectOption[], createdBy: string): Promise<OptionList>;
    /**
     * Add options to an existing list
     */
    addOptions(id: string, tenantId: string, newOptions: SelectOption[], updatedBy: string): Promise<OptionList>;
    /**
     * Remove options from an existing list
     */
    removeOptions(id: string, tenantId: string, valuesToRemove: string[], updatedBy: string): Promise<OptionList>;
    private validateOptionListInput;
    private validateOptions;
    private invalidateCacheForList;
    /**
     * Clear the entire cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
//# sourceMappingURL=option-list.service.d.ts.map