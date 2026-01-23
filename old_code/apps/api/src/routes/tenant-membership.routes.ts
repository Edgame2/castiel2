import type { FastifyInstance } from 'fastify';
import { TenantMembershipController } from '../controllers/tenant-membership.controller.js';
import {
  createJoinRequestSchema,
  listJoinRequestsSchema,
  updateJoinRequestSchema,
  createInvitationSchema,
  respondInvitationSchema,
  previewInvitationSchema,
  membershipSummarySchema,
  listInvitationsSchema,
  revokeInvitationSchema,
  resendInvitationSchema,
} from '../schemas/tenant-membership.schemas.js';
import { requireAuth, requireRole, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';

export async function registerTenantMembershipRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { tenantMembershipController?: TenantMembershipController })
    .tenantMembershipController;

  if (!controller) {
    server.log.warn('⚠️ Tenant membership routes not registered - controller missing');
    return;
  }

  const authDecorator = (server as any).authenticate;
  const optionalAuth = (server as any).optionalAuthenticate;

  if (!authDecorator || !optionalAuth) {
    server.log.warn('⚠️ Tenant membership routes not registered - authentication decorators missing');
    return;
  }

  const memberGuards = [authDecorator, requireAuth()];
  const adminGuards = [authDecorator, requireAuth(), requireRole('owner', 'admin', 'global_admin'), requireTenantOrGlobalAdmin()];

  server.post(
    '/api/tenants/:tenantId/join-requests',
    { schema: createJoinRequestSchema, onRequest: memberGuards },
    (request, reply) => controller.createJoinRequest(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/join-requests',
    { schema: listJoinRequestsSchema, onRequest: adminGuards },
    (request, reply) => controller.listJoinRequests(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/membership/summary',
    { schema: membershipSummarySchema, onRequest: adminGuards },
    (request, reply) => controller.getMembershipSummary(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/join-requests/:requestId/approve',
    { schema: updateJoinRequestSchema, onRequest: adminGuards },
    (request, reply) => controller.approveJoinRequest(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/join-requests/:requestId/decline',
    { schema: updateJoinRequestSchema, onRequest: adminGuards },
    (request, reply) => controller.declineJoinRequest(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/invitations',
    { schema: createInvitationSchema, onRequest: adminGuards },
    (request, reply) => controller.createInvitation(request as any, reply)
  );

  // List all invitations for a tenant
  server.get(
    '/api/tenants/:tenantId/invitations',
    { schema: listInvitationsSchema, onRequest: adminGuards },
    (request, reply) => controller.listInvitations(request as any, reply)
  );

  // Revoke a pending invitation
  server.delete(
    '/api/tenants/:tenantId/invitations/:invitationId',
    { schema: revokeInvitationSchema, onRequest: adminGuards },
    (request, reply) => controller.revokeInvitation(request as any, reply)
  );

  // Resend an invitation
  server.post(
    '/api/tenants/:tenantId/invitations/:invitationId/resend',
    { schema: resendInvitationSchema, onRequest: adminGuards },
    (request, reply) => controller.resendInvitation(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/invitations/:token/preview',
    { schema: previewInvitationSchema, onRequest: [optionalAuth] },
    (request, reply) => controller.previewInvitation(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/invitations/:token/accept',
    { schema: respondInvitationSchema, onRequest: [optionalAuth] },
    (request, reply) => controller.acceptInvitation(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/invitations/:token/decline',
    { schema: respondInvitationSchema, onRequest: [optionalAuth] },
    (request, reply) => controller.declineInvitation(request as any, reply)
  );

  server.log.info('✅ Tenant membership routes registered');
}
