import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TenantJoinRequestService } from '../services/auth/tenant-join-request.service.js';
import type { TenantInvitationService, TenantInvitationConfig } from '../services/auth/tenant-invitation.service.js';
import type { TenantService } from '../services/auth/tenant.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { EmailService } from '../services/auth/email.service.js';
import { TenantJoinRequestStatus } from '../types/join-request.types.js';
interface TenantParams {
    tenantId: string;
}
interface JoinRequestParams extends TenantParams {
    requestId: string;
}
interface InvitationParams extends TenantParams {
    token: string;
}
interface CreateInvitationBody {
    email: string;
    message?: string;
    expiresAt?: string;
    roles?: string[];
    rolesPreset?: string;
}
export declare class TenantMembershipController {
    private readonly joinRequestService;
    private readonly invitationService;
    private readonly tenantService;
    private readonly userService;
    private readonly emailService;
    private readonly frontendBaseUrl;
    private readonly invitationConfig;
    constructor(joinRequestService: TenantJoinRequestService, invitationService: TenantInvitationService, tenantService: TenantService, userService: UserService, emailService: EmailService, frontendBaseUrl: string, invitationConfig: TenantInvitationConfig);
    createJoinRequest(request: FastifyRequest<{
        Params: TenantParams;
        Body: {
            message?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    listJoinRequests(request: FastifyRequest<{
        Params: TenantParams;
        Querystring?: {
            status?: TenantJoinRequestStatus;
        };
    }>, reply: FastifyReply): Promise<void>;
    getMembershipSummary(request: FastifyRequest<{
        Params: TenantParams;
    }>, reply: FastifyReply): Promise<void>;
    approveJoinRequest(request: FastifyRequest<{
        Params: JoinRequestParams;
    }>, reply: FastifyReply): Promise<void>;
    declineJoinRequest(request: FastifyRequest<{
        Params: JoinRequestParams;
    }>, reply: FastifyReply): Promise<void>;
    createInvitation(request: FastifyRequest<{
        Params: TenantParams;
        Body: CreateInvitationBody;
    }>, reply: FastifyReply): Promise<void>;
    previewInvitation(request: FastifyRequest<{
        Params: InvitationParams;
    }>, reply: FastifyReply): Promise<void>;
    acceptInvitation(request: FastifyRequest<{
        Params: InvitationParams;
        Body?: {
            userId?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    declineInvitation(request: FastifyRequest<{
        Params: InvitationParams;
        Body?: {
            userId?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * List all invitations for a tenant
     */
    listInvitations(request: FastifyRequest<{
        Params: TenantParams;
        Querystring: {
            status?: string;
            limit?: number;
            offset?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Revoke a pending invitation
     */
    revokeInvitation(request: FastifyRequest<{
        Params: {
            tenantId: string;
            invitationId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Resend an invitation with a new token
     */
    resendInvitation(request: FastifyRequest<{
        Params: {
            tenantId: string;
            invitationId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    private handleInvitationResponse;
    private getAuthUser;
    private notifyTenantAdmins;
    private ensureInvitationMembership;
}
export {};
//# sourceMappingURL=tenant-membership.controller.d.ts.map