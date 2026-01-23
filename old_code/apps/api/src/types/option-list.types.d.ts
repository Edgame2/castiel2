/**
 * Option List Types
 *
 * Types for managing reusable dropdown option lists.
 * Option lists can be system-wide (global) or tenant-specific.
 */
import type { SelectOption } from '@castiel/shared-types';
/**
 * Option list scope
 */
export type OptionListScope = 'system' | 'tenant';
/**
 * Option List document stored in Cosmos DB
 */
export interface OptionList {
    id: string;
    /** 'system' for global lists, tenant UUID for tenant-specific */
    tenantId: string;
    /** Unique name within scope (e.g., "countries", "currencies", "priorities") */
    name: string;
    /** Display name for UI */
    displayName: string;
    /** Description */
    description?: string;
    /** The options */
    options: SelectOption[];
    /** Is this a system-provided list */
    isSystem: boolean;
    /** Can tenants override this list */
    allowTenantOverride: boolean;
    /** Is this list active */
    isActive: boolean;
    /** Tags for categorization */
    tags: string[];
    /** Created by user ID */
    createdBy: string;
    /** Updated by user ID */
    updatedBy?: string;
    /** Timestamps */
    createdAt: Date;
    updatedAt: Date;
    /** Cosmos DB system fields */
    _rid?: string;
    _self?: string;
    _etag?: string;
    _attachments?: string;
    _ts?: number;
}
/**
 * Reference to an option list
 * Format: "scope:name" e.g., "system:countries" or "tenant:custom-statuses"
 */
export interface OptionListRef {
    scope: OptionListScope;
    name: string;
}
/**
 * Parse an options reference string
 * @param ref Reference string in format "scope:name"
 */
export declare function parseOptionsRef(ref: string): OptionListRef | null;
/**
 * Build an options reference string
 */
export declare function buildOptionsRef(scope: OptionListScope, name: string): string;
/**
 * Option List creation input
 */
export interface CreateOptionListInput {
    tenantId: string;
    name: string;
    displayName: string;
    description?: string;
    options: SelectOption[];
    isSystem?: boolean;
    allowTenantOverride?: boolean;
    tags?: string[];
    createdBy: string;
}
/**
 * Option List update input
 */
export interface UpdateOptionListInput {
    displayName?: string;
    description?: string;
    options?: SelectOption[];
    allowTenantOverride?: boolean;
    isActive?: boolean;
    tags?: string[];
    updatedBy: string;
}
/**
 * Option List query filter
 */
export interface OptionListQueryFilter {
    tenantId?: string;
    name?: string;
    isSystem?: boolean;
    isActive?: boolean;
    tags?: string[];
    search?: string;
}
/**
 * Option List list options
 */
export interface OptionListListOptions {
    filter?: OptionListQueryFilter;
    limit?: number;
    continuationToken?: string;
    orderBy?: 'name' | 'displayName' | 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
}
/**
 * Option List list result
 */
export interface OptionListListResult {
    optionLists: OptionList[];
    continuationToken?: string;
    count: number;
}
/**
 * Built-in system option lists
 */
export declare const BUILT_IN_OPTION_LISTS: {
    readonly COUNTRIES: "countries";
    readonly CURRENCIES: "currencies";
    readonly LANGUAGES: "languages";
    readonly TIMEZONES: "timezones";
    readonly PRIORITIES: "priorities";
    readonly STATUSES: "statuses";
};
/**
 * Priority options (built-in)
 */
export declare const PRIORITY_OPTIONS: SelectOption[];
/**
 * Status options (built-in)
 */
export declare const STATUS_OPTIONS: SelectOption[];
/**
 * Common currency options (built-in)
 */
export declare const CURRENCY_OPTIONS: SelectOption[];
//# sourceMappingURL=option-list.types.d.ts.map