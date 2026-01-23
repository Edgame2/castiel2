import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TenantJoinRequestService } from '../services/auth/tenant-join-request.service.js';
import type { TenantInvitationService, TenantInvitationConfig } from '../services/auth/tenant-invitation.service.js';
import { TenantInvitationRateLimitError, TenantInvitationValidationError } from '../services/auth/tenant-invitation.service.js';
import type { TenantService } from '../services/auth/tenant.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { EmailService } from '../services/auth/email.service.js';
import type { User } from '../types/user.types.js';
import { UserStatus } from '../types/user.types.js';
import { TenantInvitationStatus, TenantInvitationResponse } from '../types/tenant-invitation.types.js';
import { TenantJoinRequestStatus } from '../types/join-request.types.js';
import type { AuthenticatedRequest, AuthUser } from '../types/auth.types.js';

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

interface RespondInvitationBody {
  userId?: string;
  tenantSwitchTargetId?: string;
  decisionMetadata?: Record<string, any>;
}

export class TenantMembershipController {
  constructor(
    private readonly joinRequestService: TenantJoinRequestService,
    private readonly invitationService: TenantInvitationService,
    private readonly tenantService: TenantService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly frontendBaseUrl: string,
    private readonly invitationConfig: TenantInvitationConfig,
  ) {}

  async createJoinRequest(
    request: FastifyRequest<{ Params: TenantParams; Body: { message?: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = this.getAuthUser(request);
    const { tenantId } = request.params;

    if (!user) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (user.tenantId !== tenantId) {
      reply.status(400).send({ error: 'Bad Request', message: 'Tenant mismatch' });
      return;
    }

    const tenant = await this.tenantService.getTenant(tenantId);
    if (!tenant) {
      reply.status(404).send({ error: 'Not Found', message: 'Tenant not found' });
      return;
    }

    const joinRequest = await this.joinRequestService.createRequest({
      tenantId,
      requesterUserId: user.id,
      requesterEmail: user.email,
      message: request.body?.message,
    });

    await this.notifyTenantAdmins(tenant.id, tenant.adminUserIds, joinRequest.requesterEmail);

    reply.status(201).send(joinRequest);
  }

  async listJoinRequests(
    request: FastifyRequest<{ Params: TenantParams; Querystring?: { status?: TenantJoinRequestStatus } }>,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId } = request.params;
    const { status } = request.query || {};

    const result = await this.joinRequestService.listRequests(tenantId, status);
    reply.send(result);
  }

  async getMembershipSummary(
    request: FastifyRequest<{ Params: TenantParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId } = request.params;
    const [pendingJoinRequests, pendingInvites, expiringInvites] = await Promise.all([
      this.joinRequestService.countRequestsByStatus(tenantId, TenantJoinRequestStatus.PENDING),
      this.invitationService.countPendingInvitations(tenantId),
      this.invitationService.countExpiringInvitations(tenantId, this.invitationConfig.expiringSoonHours),
    ]);

    reply.send({
      joinRequests: {
        pending: pendingJoinRequests,
      },
      invitations: {
        pending: pendingInvites,
        expiringSoon: expiringInvites,
      },
    });
  }

  async approveJoinRequest(
    request: FastifyRequest<{ Params: JoinRequestParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = this.getAuthUser(request);
    const { tenantId, requestId } = request.params;

    if (!user) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const result = await this.joinRequestService.approveRequest({
      tenantId,
      requestId,
      approverUserId: user.id,
    });

    if (!result) {
      reply.status(404).send({ error: 'Not Found', message: 'Join request not found or already processed' });
      return;
    }

    const targetUser = await this.userService.findById(result.requesterUserId, tenantId);
    if (targetUser) {
      const updates: Partial<User> = {
        status: UserStatus.ACTIVE,
        pendingTenantId: undefined,
        roles: targetUser.roles?.length ? targetUser.roles : ['user'],
      };
      await this.userService.updateUser(targetUser.id, tenantId, updates);

      await this.emailService.sendEmail({
        to: targetUser.email,
        subject: 'Tenant access approved',
        text: 'Your request to join this tenant has been approved. You can now log in.',
      });
    }

    reply.send({ success: true, request: result });
  }

  async declineJoinRequest(
    request: FastifyRequest<{ Params: JoinRequestParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = this.getAuthUser(request);
    const { tenantId, requestId } = request.params;

    if (!user) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const result = await this.joinRequestService.declineRequest({
      tenantId,
      requestId,
      approverUserId: user.id,
    });

    if (!result) {
      reply.status(404).send({ error: 'Not Found', message: 'Join request not found or already processed' });
      return;
    }

    const targetUser = await this.userService.findById(result.requesterUserId, tenantId);
    if (targetUser) {
      await this.emailService.sendEmail({
        to: targetUser.email,
        subject: 'Tenant access declined',
        text: 'Your request to join this tenant was declined by an administrator.',
      });
    }

    reply.send({ success: true, request: result });
  }

  async createInvitation(
    request: FastifyRequest<{ Params: TenantParams; Body: CreateInvitationBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = this.getAuthUser(request);
    const { tenantId } = request.params;

    if (!user) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const tenant = await this.tenantService.getTenant(tenantId);
    if (!tenant) {
      reply.status(404).send({ error: 'Not Found', message: 'Tenant not found' });
      return;
    }

    try {
      const invitation = await this.invitationService.createInvitation({
        tenantId,
        email: request.body.email,
        inviterUserId: user.id,
        message: request.body.message,
        expiresAt: request.body.expiresAt,
        roles: request.body.roles,
        rolesPreset: request.body.rolesPreset,
        audit: {
          issuerIp: request.ip,
          issuerUserAgent: request.headers['user-agent'],
        },
      });

      const inviteToken = invitation.token || invitation.id;
      const inviteUrl = `${this.frontendBaseUrl}/invitations/${inviteToken}?tenantId=${tenantId}`;

      await this.emailService.sendEmail({
        to: invitation.email,
        subject: `Invitation to join ${tenant.name}`,
        text: `You've been invited to join ${tenant.name}. Open ${inviteUrl} to review and respond before ${invitation.expiresAt}.`,
        html: `You have been invited to join <strong>${tenant.name}</strong>.<br/><br/>Message: ${
          invitation.message || 'No message provided'
        }<br/><br/>Invitation link: <a href="${inviteUrl}">${inviteUrl}</a><br/>Expires at: ${invitation.expiresAt}`,
      });

      reply.status(201).send(invitation);
    } catch (error) {
      if (error instanceof TenantInvitationRateLimitError) {
        reply.status(429).send({
          error: 'Too Many Requests',
          message:
            error.scope === 'tenant'
              ? 'Tenant invitation limit reached for today'
              : 'You have reached your daily invitation limit',
        });
        return;
      }

      if (error instanceof TenantInvitationValidationError) {
        reply.status(400).send({ error: 'Bad Request', message: error.message });
        return;
      }

      throw error;
    }
  }

  async previewInvitation(
    request: FastifyRequest<{ Params: InvitationParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId, token } = request.params;
    const invitation = await this.invitationService.getInvitationForPreview(token, tenantId);

    if (!invitation) {
      reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
      return;
    }

    const tenant = await this.tenantService.getTenant(tenantId);
    const issuer = await this.userService.findById(invitation.inviterUserId, tenantId);
    const isExpired = this.invitationService.isExpired(invitation);
    const isRedeemable = invitation.status === TenantInvitationStatus.PENDING && !isExpired;

    reply.send({
      id: invitation.id,
      tenantId: invitation.tenantId,
      tenantName: tenant?.name,
      email: invitation.email,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      issuedAt: invitation.createdAt,
      issuerUserId: invitation.inviterUserId,
      issuerDisplayName: issuer
        ? [issuer.firstName, issuer.lastName].filter(Boolean).join(' ') || issuer.email
        : undefined,
      roles: invitation.roles,
      rolesPreset: invitation.rolesPreset,
      status: invitation.status,
      isExpired,
      isRedeemable,
    });
  }

  async acceptInvitation(
    request: FastifyRequest<{ Params: InvitationParams; Body?: { userId?: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleInvitationResponse(request, reply, TenantInvitationStatus.ACCEPTED);
  }

  async declineInvitation(
    request: FastifyRequest<{ Params: InvitationParams; Body?: { userId?: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    await this.handleInvitationResponse(request, reply, TenantInvitationStatus.DECLINED);
  }

  /**
   * List all invitations for a tenant
   */
  async listInvitations(
    request: FastifyRequest<{ Params: TenantParams; Querystring: { status?: string; limit?: number; offset?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId } = request.params;
    const { status, limit, offset } = request.query;

    const result = await this.invitationService.listInvitations(tenantId, {
      status: status as TenantInvitationStatus,
      limit: limit || 50,
      offset: offset || 0,
    });

    // Enrich with issuer info
    const enrichedInvitations = await Promise.all(
      result.invitations.map(async (inv) => {
        // Get the document to access inviterUserId
        const invitationDoc = await (this.invitationService as any).getInvitationDocumentById(inv.id, tenantId);
        const inviterUserId = invitationDoc?.inviterUserId;
        const issuer = inviterUserId ? await this.userService.findById(inviterUserId, tenantId) : null;
        return {
          ...inv,
          issuerDisplayName: issuer
            ? [issuer.firstName, issuer.lastName].filter(Boolean).join(' ') || issuer.email
            : 'Unknown',
          isExpired: invitationDoc ? this.invitationService.isExpired(invitationDoc) : false,
        };
      })
    );

    reply.send({
      invitations: enrichedInvitations,
      total: result.total,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(
    request: FastifyRequest<{ Params: { tenantId: string; invitationId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const { tenantId, invitationId } = request.params;

    const result = await this.invitationService.revokeInvitation(invitationId, tenantId);

    if (!result) {
      reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found or already processed',
      });
      return;
    }

    reply.send({
      message: 'Invitation revoked successfully',
      invitation: result,
    });
  }

  /**
   * Resend an invitation with a new token
   */
  async resendInvitation(
    request: FastifyRequest<{ Params: { tenantId: string; invitationId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const user = this.getAuthUser(request);
    if (!user) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }
    const { tenantId, invitationId } = request.params;

    const result = await this.invitationService.resendInvitation(invitationId, tenantId, user.id);

    if (!result) {
      reply.status(404).send({
        error: 'Not Found',
        message: 'Invitation not found or already processed',
      });
      return;
    }

    // TODO: Send email with new invitation link
    // await this.emailService.sendInvitationEmail(...)

    reply.send({
      message: 'Invitation resent successfully',
      invitation: result,
    });
  }

  private async handleInvitationResponse(
    request: FastifyRequest<{ Params: InvitationParams; Body?: RespondInvitationBody }>,
    reply: FastifyReply,
    status: TenantInvitationStatus
  ): Promise<void> {
    const { tenantId, token } = request.params;
    const invitation = await this.invitationService.getInvitationByToken(token, tenantId);

    if (!invitation) {
      reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
      return;
    }

    const user = this.getAuthUser(request);
    const decisionBy = request.body?.userId || user?.id;
    const updated = await this.invitationService.respondToInvitation(invitation.tenantId, invitation.id, status, decisionBy, {
      decisionIp: request.ip,
      decisionUserAgent: request.headers['user-agent'],
      decisionMetadata: request.body?.decisionMetadata,
    });

    if (!updated) {
      reply.status(410).send({ error: 'Gone', message: 'Invitation is no longer valid' });
      return;
    }

    let membership: { userId: string; tenantId: string; requiresVerification?: boolean } | undefined;

    if (status === TenantInvitationStatus.ACCEPTED) {
      membership = await this.ensureInvitationMembership(updated, decisionBy);
    }

    reply.send({ success: true, invitation: updated, membership });
  }

  private getAuthUser(request: FastifyRequest): AuthUser | undefined {
    return (request as AuthenticatedRequest).user;
  }

  private async notifyTenantAdmins(tenantId: string, adminIds: string[], requesterEmail: string): Promise<void> {
    if (!adminIds || adminIds.length === 0) {
      return;
    }

    for (const adminId of adminIds) {
      const adminUser = await this.userService.findById(adminId, tenantId);
      if (!adminUser) {
        continue;
      }

      await this.emailService.sendEmail({
        to: adminUser.email,
        subject: 'New tenant join request',
        text: `User ${requesterEmail} requested access to tenant ${tenantId}.`,
      });
    }
  }

  private async ensureInvitationMembership(
    invitation: TenantInvitationResponse,
    decisionBy?: string
  ): Promise<{ userId: string; tenantId: string; requiresVerification?: boolean }> {
    const tenantId = invitation.tenantId;
    const normalizedEmail = invitation.email.toLowerCase();
    const targetRoles = invitation.roles && invitation.roles.length ? invitation.roles : ['user'];

    const existingUser = await this.userService.findByEmail(normalizedEmail, tenantId);
    if (existingUser) {
      const updatedUser = await this.userService.ensureUserRoles(existingUser.id, tenantId, targetRoles);
      const finalUser = updatedUser || existingUser;
      return {
        userId: finalUser.id,
        tenantId: finalUser.tenantId,
        requiresVerification: !finalUser.emailVerified,
      };
    }

    let sourceUser = decisionBy ? await this.userService.findByIdAcrossTenants(decisionBy) : null;
    if (!sourceUser) {
      sourceUser = await this.userService.findByEmailAcrossTenants(normalizedEmail);
    }

    if (sourceUser) {
      const cloned = await this.userService.cloneUserToTenant(sourceUser, tenantId, targetRoles);
      return {
        userId: cloned.id,
        tenantId: cloned.tenantId,
        requiresVerification: !cloned.emailVerified,
      };
    }

    const invitedUser = await this.userService.createInvitedUserAccount(normalizedEmail, tenantId, targetRoles);
    if (invitedUser.verificationToken && this.emailService.isReady()) {
      await this.emailService.sendVerificationEmail(invitedUser.email, invitedUser.verificationToken, this.frontendBaseUrl);
    }

    return {
      userId: invitedUser.id,
      tenantId: invitedUser.tenantId,
      requiresVerification: true,
    };
  }
}
