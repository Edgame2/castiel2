/**
 * Option List Controller
 *
 * Handles REST API operations for reusable option lists.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { SelectOption } from '@castiel/shared-types';
/**
 * Request types
 */
interface CreateOptionListBody {
    name: string;
    displayName: string;
    description?: string;
    options: SelectOption[];
    isSystem?: boolean;
    allowTenantOverride?: boolean;
    tags?: string[];
}
interface UpdateOptionListBody {
    displayName?: string;
    description?: string;
    options?: SelectOption[];
    allowTenantOverride?: boolean;
    isActive?: boolean;
    tags?: string[];
}
interface ListQueryParams {
    name?: string;
    isSystem?: string;
    isActive?: string;
    tags?: string;
    search?: string;
    limit?: string;
    orderBy?: string;
    orderDirection?: string;
    continuationToken?: string;
}
interface IdParams {
    id: string;
}
interface AddOptionsBody {
    options: SelectOption[];
}
interface RemoveOptionsBody {
    values: string[];
}
interface CreateOverrideBody {
    options: SelectOption[];
}
interface NameParams {
    name: string;
}
/**
 * Option List Controller
 */
export declare class OptionListController {
    private service;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize the controller
     */
    initialize(): Promise<void>;
    /**
     * POST /api/v1/option-lists
     * Create a new option list
     */
    createOptionList: (req: FastifyRequest<{
        Body: CreateOptionListBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/option-lists
     * List option lists
     */
    listOptionLists: (req: FastifyRequest<{
        Querystring: ListQueryParams;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/option-lists/available
     * Get all available lists for tenant (system + tenant-specific)
     */
    getAvailableLists: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/option-lists/system
     * Get all system option lists
     */
    getSystemLists: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/option-lists/:id
     * Get an option list by ID
     */
    getOptionList: (req: FastifyRequest<{
        Params: IdParams;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/option-lists/by-name/:name
     * Get an option list by name (resolves tenant then system)
     */
    getOptionListByName: (req: FastifyRequest<{
        Params: NameParams;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/option-lists/by-name/:name/options
     * Get just the options for a list by name (for field selects)
     */
    getOptions: (req: FastifyRequest<{
        Params: NameParams;
        Querystring: {
            scope?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/v1/option-lists/:id
     * Update an option list
     */
    updateOptionList: (req: FastifyRequest<{
        Params: IdParams;
        Body: UpdateOptionListBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/option-lists/:id
     * Delete an option list
     */
    deleteOptionList: (req: FastifyRequest<{
        Params: IdParams;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/option-lists/:id/options
     * Add options to an existing list
     */
    addOptions: (req: FastifyRequest<{
        Params: IdParams;
        Body: AddOptionsBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/option-lists/:id/options
     * Remove options from an existing list
     */
    removeOptions: (req: FastifyRequest<{
        Params: IdParams;
        Body: RemoveOptionsBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/option-lists/system/:name/override
     * Create a tenant override for a system list
     */
    createTenantOverride: (req: FastifyRequest<{
        Params: NameParams;
        Body: CreateOverrideBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Handle errors consistently
     */
    private handleError;
}
export {};
//# sourceMappingURL=option-list.controller.d.ts.map