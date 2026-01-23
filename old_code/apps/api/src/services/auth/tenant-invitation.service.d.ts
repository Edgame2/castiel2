import { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import { CreateTenantInvitationInput, TenantInvitationDocument, TenantInvitationLifecycleResult, TenantInvitationAudit, TenantInvitationResponse, TenantInvitationStatus } from '../../types/tenant-invitation.types.js';
export interface TenantInvitationConfig {
    defaultExpiryDays: number;
    minExpiryDays: number;
    maxExpiryDays: number;
    reminderLeadHours: number;
    lifecycleIntervalMs: number;
    perTenantDailyLimit: number;
    perAdminDailyLimit: number;
    expiringSoonHours: number;
}
export declare class TenantInvitationRateLimitError extends Error {
    scope: 'tenant' | 'admin';
    constructor(scope: 'tenant' | 'admin');
}
export declare class TenantInvitationValidationError extends Error {
    constructor(message: string);
}
export declare class TenantInvitationService {
    private readonly container;
    private readonly config;
    private readonly redis?;
    constructor(container: Container, config: TenantInvitationConfig, redis?: (Redis | null) | undefined);
    createInvitation(input: CreateTenantInvitationInput): Promise<TenantInvitationResponse>;
    getInvitationByToken(token: string, tenantId: string): Promise<TenantInvitationResponse | null>;
    getInvitationForPreview(token: string, tenantId: string): Promise<TenantInvitationDocument | null>;
    respondToInvitation(tenantId: string, invitationId: string, status: TenantInvitationStatus, decisionBy?: string, audit?: TenantInvitationAudit): Promise<TenantInvitationResponse | null>;
    revokeInvitation(id: string, tenantId: string): Promise<TenantInvitationResponse | null>;
    /**
     * List invitations for a tenant with optional filtering
     */
    listInvitations(tenantId: string, options?: {
        status?: TenantInvitationStatus;
        limit?: number;
        offset?: number;
    }): Promise<{
        invitations: TenantInvitationResponse[];
        total: number;
    }>;
    /**
     * Resend an invitation (creates a new invitation token)
     */
    resendInvitation(id: string, tenantId: string, inviterUserId: string): Promise<TenantInvitationResponse | null>;
    countPendingInvitations(tenantId: string): Promise<number>;
    countExpiringInvitations(tenantId: string, hours: number): Promise<number>;
    processLifecycle(now?: Date): Promise<TenantInvitationLifecycleResult>;
    private getInvitationDocumentByToken;
    private getInvitationDocumentById;
    private findPendingInvitation;
    private toResponse;
    private countByQuery;
    private queryCrossPartition;
    private resolveRoles;
    isExpired(doc: TenantInvitationDocument): boolean;
    private markReminderSent;
    private expireInvitation;
    private enforceRateLimits;
    private bumpRateLimit;
    private resolveExpiryDate;
}
//# sourceMappingURL=tenant-invitation.service.d.ts.map