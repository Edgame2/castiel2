/**
 * External User IDs Controller
 * Handles HTTP requests for external user ID management
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IntegrationExternalUserIdService } from '../services/integration-external-user-id.service.js';
interface GetExternalUserIdsParams {
    tenantId: string;
    userId: string;
}
interface CreateExternalUserIdParams {
    tenantId: string;
    userId: string;
}
interface CreateExternalUserIdBody {
    integrationId: string;
    externalUserId: string;
    integrationName?: string;
    connectionId?: string;
    metadata?: Record<string, any>;
    status?: 'active' | 'invalid' | 'pending';
}
interface UpdateExternalUserIdParams {
    tenantId: string;
    userId: string;
    integrationId: string;
}
interface UpdateExternalUserIdBody {
    externalUserId?: string;
    integrationName?: string;
    connectionId?: string;
    metadata?: Record<string, any>;
    status?: 'active' | 'invalid' | 'pending';
}
interface DeleteExternalUserIdParams {
    tenantId: string;
    userId: string;
    integrationId: string;
}
interface SyncExternalUserIdParams {
    tenantId: string;
    userId: string;
    integrationId: string;
}
export declare class ExternalUserIdsController {
    private readonly externalUserIdService;
    constructor(externalUserIdService: IntegrationExternalUserIdService);
    /**
     * GET /api/tenants/:tenantId/users/:userId/external-user-ids
     * Get all external user IDs for a user
     */
    getUserExternalUserIds(request: FastifyRequest<{
        Params: GetExternalUserIdsParams;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/tenants/:tenantId/users/:userId/external-user-ids
     * Create or update external user ID
     */
    createOrUpdateExternalUserId(request: FastifyRequest<{
        Params: CreateExternalUserIdParams;
        Body: CreateExternalUserIdBody;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId
     * Update external user ID and metadata
     */
    updateExternalUserId(request: FastifyRequest<{
        Params: UpdateExternalUserIdParams;
        Body: UpdateExternalUserIdBody;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId
     * Remove external user ID
     */
    deleteExternalUserId(request: FastifyRequest<{
        Params: DeleteExternalUserIdParams;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId/sync
     * Manually sync external user ID from integration
     */
    syncExternalUserId(request: FastifyRequest<{
        Params: SyncExternalUserIdParams;
    }>, reply: FastifyReply): Promise<void>;
}
export {};
//# sourceMappingURL=external-user-ids.controller.d.ts.map