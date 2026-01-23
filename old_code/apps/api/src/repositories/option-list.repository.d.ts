/**
 * Option List Repository
 *
 * Cosmos DB operations for Option Lists.
 * Supports system-wide and tenant-specific option lists.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { OptionList, CreateOptionListInput, UpdateOptionListInput, OptionListListOptions, OptionListListResult } from '../types/option-list.types.js';
/**
 * Option List Repository
 */
export declare class OptionListRepository {
    private client;
    private container;
    private monitoring;
    private initialized;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize the container
     */
    initialize(): Promise<void>;
    /**
     * Ensure container is initialized
     */
    private ensureInitialized;
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
    update(id: string, tenantId: string, input: UpdateOptionListInput): Promise<OptionList | null>;
    /**
     * Delete an option list (soft delete - sets isActive to false)
     */
    delete(id: string, tenantId: string, deletedBy: string): Promise<boolean>;
    /**
     * Hard delete an option list (permanent)
     */
    hardDelete(id: string, tenantId: string): Promise<boolean>;
    /**
     * List option lists
     */
    list(options: OptionListListOptions): Promise<OptionListListResult>;
    /**
     * Get all system option lists
     */
    getSystemLists(): Promise<OptionList[]>;
    /**
     * Get all tenant option lists (including overrides of system lists)
     */
    getTenantLists(tenantId: string): Promise<OptionList[]>;
    /**
     * Check if a name is unique within the tenant
     */
    isNameUnique(name: string, tenantId: string, excludeId?: string): Promise<boolean>;
}
//# sourceMappingURL=option-list.repository.d.ts.map