/**
 * Organization Routes
 * 
 * API endpoints for managing organizations.
 * Per ModuleImplementationGuide Section 7
 * 
 * Endpoints:
 * - POST /api/v1/organizations - Create organization
 * - GET /api/v1/organizations - List user's organizations
 * - GET /api/v1/organizations/:orgId - Get organization details
 * - PUT /api/v1/organizations/:orgId - Update organization
 * - DELETE /api/v1/organizations/:orgId - Deactivate organization
 * - GET /api/v1/organizations/:orgId/member-count - Get member count
 * - GET /api/v1/organizations/:orgId/member-limit - Check if at member limit
 * - GET /api/v1/organizations/:orgId/api-keys - List API keys (Super Admin §10.3; stub returns empty until implemented)
 * - GET /api/v1/organizations/:orgId/settings - Get organization settings
 * - PUT /api/v1/organizations/:orgId/settings - Update organization settings
 * - GET /api/v1/organizations/:orgId/security-settings - Get security settings
 * - PUT /api/v1/organizations/:orgId/security-settings - Update security settings
 * 
 * Note: SSO configuration routes are in the auth service
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../middleware/auth';
import { requirePermission as _requirePermission } from '../middleware/rbac';
import * as organizationService from '../services/OrganizationService';
import * as organizationSettingsService from '../services/OrganizationSettingsService';
import * as apiKeyService from '../services/ApiKeyService';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { publishEventSafely, extractEventMetadata, createBaseEvent } from '../events/publishers/UserManagementEventPublisher';
import { UserManagementEvent } from '../types/events';

export async function setupOrganizationRoutes(fastify: FastifyInstance): Promise<void> {
  // Create organization
  fastify.post(
    '/api/v1/organizations',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          name: string;
          slug?: string;
          description?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { name, slug, description } = request.body;

        if (!name || name.trim().length === 0) {
          reply.code(400).send({ error: 'Organization name is required' });
          return;
        }

        const organization = await organizationService.createOrganization(
          requestUser.id,
          name,
          slug,
          description
        );

        // Publish organization.created event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('organization.created', requestUser.id, organization.id, undefined, {
            organizationId: organization.id,
            name: organization.name,
            slug: organization.slug,
            createdBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        reply.code(201).send({ data: organization });
      } catch (error: any) {
        log.error('Create organization error', error, { route: '/api/v1/organizations', userId: (request as any).user?.id, service: 'user-management' });

        if (error.message.includes('already exists') || error.message.includes('already taken')) {
          reply.code(409).send({ error: error.message });
          return;
        }

        if (error.message.includes('Invalid slug') || error.message.includes('name must be')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to create organization',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // List user's organizations
  fastify.get(
    '/api/v1/organizations',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Querystring: {
          includeInactive?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const includeInactive = request.query.includeInactive === 'true';

        const organizations = await organizationService.listUserOrganizations(
          requestUser.id,
          includeInactive
        );

        return { data: organizations };
      } catch (error: any) {
        log.error('List organizations error', error, { route: '/api/v1/organizations', userId: (request as any).user?.id, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list organizations',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Get organization details
  fastify.get(
    '/api/v1/organizations/:orgId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        const organization = await organizationService.getOrganization(orgId, requestUser.id);

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        // Check if user is a member
        if ('userMembership' in organization && !organization.userMembership) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }

        return { data: organization };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Get organization error', error, { route: '/api/v1/organizations/:orgId', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to get organization',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Update organization
  fastify.put(
    '/api/v1/organizations/:orgId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: {
          name?: string;
          slug?: string;
          description?: string;
          logoUrl?: string;
          settings?: Record<string, any>;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const updates = request.body;

        if (Object.keys(updates).length === 0) {
          reply.code(400).send({ error: 'At least one field must be provided for update' });
          return;
        }

        // Get before state for audit logging (Prisma client - see server for DB wiring)
        const db = getDatabaseClient() as unknown as { organization: { findUnique: (args: unknown) => Promise<unknown> } };
        void (await db.organization.findUnique({
          where: { id: orgId },
          select: {
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
            settings: true,
          },
        }));

        const organization = await organizationService.updateOrganization(
          orgId,
          requestUser.id,
          updates
        );

        // Publish organization.updated event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('organization.updated', requestUser.id, orgId, undefined, {
            organizationId: orgId,
            changes: updates,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { data: organization };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Update organization error', error, { route: '/api/v1/organizations/:orgId', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('already taken') ||
          error.message.includes('Invalid slug') ||
          error.message.includes('Invalid logo URL') ||
          error.message.includes('exceeds 64KB') ||
          error.message.includes('cannot be empty') ||
          error.message.includes('must be')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to update organization',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Deactivate organization
  fastify.delete(
    '/api/v1/organizations/:orgId',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        // Get organization info before deactivation for audit log
        const db = getDatabaseClient() as unknown as { organization: { findUnique: (args: unknown) => Promise<{ name: string } | null> } };
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        await organizationService.deactivateOrganization(orgId, requestUser.id);

        // Publish organization.deleted event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('organization.deleted', requestUser.id, orgId, undefined, {
            organizationId: orgId,
            name: organization?.name,
            deletedBy: requestUser.id,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { message: 'Organization deactivated successfully' };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Deactivate organization error', error, { route: '/api/v1/organizations/:orgId', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to deactivate organization',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // List organization members (Super Admin / org members)
  fastify.get(
    '/api/v1/organizations/:orgId/members',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: { orgId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const { orgId } = request.params;
        const members = await organizationService.getOrganizationMembers(orgId, requestUser.id);
        return { data: members };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('List members error', error, { route: '/api/v1/organizations/:orgId/members', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        if (error.message?.includes('not a member')) {
          reply.code(403).send({ error: error.message });
          return;
        }
        reply.code(500).send({
          error: 'Failed to list organization members',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Get organization member count
  fastify.get(
    '/api/v1/organizations/:orgId/member-count',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        // Check if user is a member
        const organization = await organizationService.getOrganization(orgId, requestUser.id);
        if (!organization || ('userMembership' in organization && !organization.userMembership)) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }

        const memberCount = await organizationService.getOrganizationMemberCount(orgId);

        return { data: { memberCount } };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Get member count error', error, { route: '/api/v1/organizations/:orgId/member-count', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to get member count',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Check if organization is at member limit
  fastify.get(
    '/api/v1/organizations/:orgId/member-limit',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        // Check if user is a member
        const organization = await organizationService.getOrganization(orgId, requestUser.id);
        if (!organization || ('userMembership' in organization && !organization.userMembership)) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }

        const isAtLimit = await organizationService.isOrganizationAtMemberLimit(orgId);
        const memberCount = await organizationService.getOrganizationMemberCount(orgId);

        // Get organization to get member limit
        const org = await organizationService.getOrganization(orgId);
        const memberLimit = org?.memberLimit || 500;

        return {
          data: {
            isAtLimit,
            memberCount,
            memberLimit,
          },
        };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Check member limit error', error, { route: '/api/v1/organizations/:orgId/member-limit', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to check member limit',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // List API keys for organization (Super Admin §10.3)
  fastify.get(
    '/api/v1/organizations/:orgId/api-keys',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: { orgId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const { orgId } = request.params;
        const organization = await organizationService.getOrganization(orgId, requestUser.id);
        if (!organization || ('userMembership' in organization && !organization.userMembership)) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }
        const items = await apiKeyService.listApiKeys(orgId);
        return { items };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('List API keys error', error, { route: '/api/v1/organizations/:orgId/api-keys', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to list API keys',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Create API key for organization (Super Admin §10.3; raw key returned only once)
  fastify.post<{
    Params: { orgId: string };
    Body: { name: string; scope?: string; expiresAt?: string };
  }>(
    '/api/v1/organizations/:orgId/api-keys',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const { orgId } = request.params;
        const organization = await organizationService.getOrganization(orgId, requestUser.id);
        if (!organization || ('userMembership' in organization && !organization.userMembership)) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }
        const body = request.body;
        if (!body?.name?.trim()) {
          reply.code(400).send({ error: 'name is required' });
          return;
        }
        const created = await apiKeyService.createApiKey(
          orgId,
          { name: body.name.trim(), scope: body.scope?.trim(), expiresAt: body.expiresAt?.trim() },
          requestUser.id
        );
        reply.code(201).send(created);
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Create API key error', error, { route: 'POST /api/v1/organizations/:orgId/api-keys', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to create API key',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Revoke (delete) API key (Super Admin §10.3)
  fastify.delete<{ Params: { orgId: string; keyId: string } }>(
    '/api/v1/organizations/:orgId/api-keys/:keyId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const { orgId, keyId } = request.params;
        const organization = await organizationService.getOrganization(orgId, requestUser.id);
        if (!organization || ('userMembership' in organization && !organization.userMembership)) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }
        await apiKeyService.revokeApiKey(orgId, keyId);
        reply.code(204).send();
      } catch (error: any) {
        if (error.message === 'API key not found') {
          reply.code(404).send({ error: 'API key not found' });
          return;
        }
        const params = request.params as { orgId?: string; keyId?: string };
        log.error('Revoke API key error', error, { route: 'DELETE /api/v1/organizations/:orgId/api-keys/:keyId', userId: (request as any).user?.id, organizationId: params?.orgId, keyId: params?.keyId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to revoke API key',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Rotate API key (Super Admin §10.3; new raw key returned only once)
  fastify.post<{ Params: { orgId: string; keyId: string } }>(
    '/api/v1/organizations/:orgId/api-keys/:keyId/rotate',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const { orgId, keyId } = request.params;
        const organization = await organizationService.getOrganization(orgId, requestUser.id);
        if (!organization || ('userMembership' in organization && !organization.userMembership)) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }
        const result = await apiKeyService.rotateApiKey(orgId, keyId, requestUser.id);
        reply.send(result);
      } catch (error: any) {
        if (error.message === 'API key not found') {
          reply.code(404).send({ error: 'API key not found' });
          return;
        }
        const params = request.params as { orgId?: string; keyId?: string };
        log.error('Rotate API key error', error, { route: 'POST /api/v1/organizations/:orgId/api-keys/:keyId/rotate', userId: (request as any).user?.id, organizationId: params?.orgId, keyId: params?.keyId, service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to rotate API key',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }
  );

  // Get organization settings
  fastify.get(
    '/api/v1/organizations/:orgId/settings',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        const settings = await organizationSettingsService.getOrganizationSettings(
          orgId,
          requestUser.id
        );

        return { data: { settings } };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Get organization settings error', error, { route: '/api/v1/organizations/:orgId/settings', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('not a member')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to get organization settings',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Update organization settings
  fastify.put(
    '/api/v1/organizations/:orgId/settings',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: organizationSettingsService.OrganizationSettings;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const settings = request.body;

        if (!settings || typeof settings !== 'object') {
          reply.code(400).send({ error: 'Settings object is required' });
          return;
        }

        const updatedSettings = await organizationSettingsService.updateOrganizationSettings(
          orgId,
          requestUser.id,
          settings
        );

        // Publish organization.settings_updated event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('organization.settings_updated', requestUser.id, orgId, undefined, {
            organizationId: orgId,
            changes: settings,
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return { data: { settings: updatedSettings } };
      } catch (error: any) {
        const params = request.params as { orgId?: string };
        log.error('Update organization settings error', error, { route: '/api/v1/organizations/:orgId/settings', userId: (request as any).user?.id, organizationId: params?.orgId, service: 'user-management' });

        if (error.message.includes('not found')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        if (error.message.includes('Permission denied')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        if (
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('exceeds 64KB')
        ) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to update organization settings',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Get organization security settings
  fastify.get(
    '/api/v1/organizations/:orgId/security-settings',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: { orgId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const db = getDatabaseClient() as unknown as {
          organizationMembership: { findFirst: (args: unknown) => Promise<{ role: { isOrgAdmin: boolean; isSuperAdmin: boolean } } | null> };
          organization: { findUnique: (args: unknown) => Promise<unknown> };
        };

        // Check membership and permissions
        const membership = await db.organizationMembership.findFirst({
          where: {
            userId: requestUser.id,
            organizationId: orgId,
            status: 'active',
          },
          include: { role: true },
        });

        if (!membership) {
          reply.code(403).send({ error: 'Not a member of this organization' });
          return;
        }

        // Only org admins can view security settings
        if (!membership.role.isOrgAdmin && !membership.role.isSuperAdmin) {
          reply.code(403).send({ error: 'Permission denied' });
          return;
        }

        const org = await db.organization.findUnique({
          where: { id: orgId },
          select: {
            maxSessionsPerUser: true,
            sessionTimeoutHours: true,
            sessionIdleTimeoutHours: true,
            requireMfa: true,
            passwordMinLength: true,
            passwordRequireUppercase: true,
            passwordRequireLowercase: true,
            passwordRequireNumbers: true,
            passwordRequireSpecial: true,
            passwordExpiryDays: true,
            passwordHistoryCount: true,
          },
        });

        if (!org) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        type SecurityOrg = {
          maxSessionsPerUser?: number; sessionTimeoutHours?: number; sessionIdleTimeoutHours?: number;
          requireMfa?: boolean; passwordMinLength?: number; passwordRequireUppercase?: boolean;
          passwordRequireLowercase?: boolean; passwordRequireNumbers?: boolean; passwordRequireSpecial?: boolean;
          passwordExpiryDays?: number | null; passwordHistoryCount?: number;
        };
        const o = org as SecurityOrg;
        return {
          data: {
            session: {
              maxSessionsPerUser: o.maxSessionsPerUser,
              sessionTimeoutHours: o.sessionTimeoutHours,
              sessionIdleTimeoutHours: o.sessionIdleTimeoutHours,
            },
            mfa: { requireMfa: o.requireMfa },
            password: {
              minLength: o.passwordMinLength,
              requireUppercase: o.passwordRequireUppercase,
              requireLowercase: o.passwordRequireLowercase,
              requireNumbers: o.passwordRequireNumbers,
              requireSpecial: o.passwordRequireSpecial,
              expiryDays: o.passwordExpiryDays,
              historyCount: o.passwordHistoryCount,
            },
          },
        };
      } catch (error: any) {
        log.error('Get security settings error', error, { route: '/api/v1/organizations/:orgId/security-settings', service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to get security settings',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );

  // Update organization security settings
  fastify.put(
    '/api/v1/organizations/:orgId/security-settings',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Params: { orgId: string };
        Body: {
          session?: {
            maxSessionsPerUser?: number;
            sessionTimeoutHours?: number;
            sessionIdleTimeoutHours?: number;
          };
          mfa?: {
            requireMfa?: boolean;
          };
          password?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecial?: boolean;
            expiryDays?: number | null;
            historyCount?: number;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const { session, mfa, password } = request.body;
        const db = getDatabaseClient() as unknown as {
          organizationMembership: { findFirst: (args: unknown) => Promise<{ role: { isOrgAdmin: boolean; isSuperAdmin: boolean } } | null> };
          organization: { findUnique: (args: unknown) => Promise<unknown>; update: (args: unknown) => Promise<unknown> };
        };

        // Check membership and permissions
        const membership = await db.organizationMembership.findFirst({
          where: {
            userId: requestUser.id,
            organizationId: orgId,
            status: 'active',
          },
          include: { role: true },
        });

        if (!membership) {
          reply.code(403).send({ error: 'Not a member of this organization' });
          return;
        }

        // Only org admins can update security settings
        if (!membership.role.isOrgAdmin && !membership.role.isSuperAdmin) {
          reply.code(403).send({ error: 'Permission denied' });
          return;
        }

        // Get before state for audit
        const beforeOrg = await db.organization.findUnique({
          where: { id: orgId },
          select: {
            maxSessionsPerUser: true,
            sessionTimeoutHours: true,
            sessionIdleTimeoutHours: true,
            requireMfa: true,
            passwordMinLength: true,
            passwordRequireUppercase: true,
            passwordRequireLowercase: true,
            passwordRequireNumbers: true,
            passwordRequireSpecial: true,
            passwordExpiryDays: true,
            passwordHistoryCount: true,
          },
        });

        if (!beforeOrg) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        // Prepare update data
        const updateData: any = {};

        if (session) {
          if (session.maxSessionsPerUser !== undefined) {
            if (session.maxSessionsPerUser < 1 || session.maxSessionsPerUser > 50) {
              reply.code(400).send({ error: 'Max sessions per user must be between 1 and 50' });
              return;
            }
            updateData.maxSessionsPerUser = session.maxSessionsPerUser;
          }
          if (session.sessionTimeoutHours !== undefined) {
            if (session.sessionTimeoutHours < 1 || session.sessionTimeoutHours > 168) {
              reply.code(400).send({ error: 'Session timeout must be between 1 and 168 hours' });
              return;
            }
            updateData.sessionTimeoutHours = session.sessionTimeoutHours;
          }
          if (session.sessionIdleTimeoutHours !== undefined) {
            if (session.sessionIdleTimeoutHours < 0.5 || session.sessionIdleTimeoutHours > 24) {
              reply.code(400).send({ error: 'Session idle timeout must be between 0.5 and 24 hours' });
              return;
            }
            updateData.sessionIdleTimeoutHours = session.sessionIdleTimeoutHours;
          }
        }

        if (mfa) {
          if (mfa.requireMfa !== undefined) {
            updateData.requireMfa = mfa.requireMfa;
          }
        }

        if (password) {
          if (password.minLength !== undefined) {
            if (password.minLength < 8 || password.minLength > 128) {
              reply.code(400).send({ error: 'Password minimum length must be between 8 and 128' });
              return;
            }
            updateData.passwordMinLength = password.minLength;
          }
          if (password.requireUppercase !== undefined) {
            updateData.passwordRequireUppercase = password.requireUppercase;
          }
          if (password.requireLowercase !== undefined) {
            updateData.passwordRequireLowercase = password.requireLowercase;
          }
          if (password.requireNumbers !== undefined) {
            updateData.passwordRequireNumbers = password.requireNumbers;
          }
          if (password.requireSpecial !== undefined) {
            updateData.passwordRequireSpecial = password.requireSpecial;
          }
          if (password.expiryDays !== undefined) {
            if (password.expiryDays !== null && (password.expiryDays < 1 || password.expiryDays > 365)) {
              reply.code(400).send({ error: 'Password expiry days must be between 1 and 365, or null' });
              return;
            }
            updateData.passwordExpiryDays = password.expiryDays;
          }
          if (password.historyCount !== undefined) {
            if (password.historyCount < 0 || password.historyCount > 20) {
              reply.code(400).send({ error: 'Password history count must be between 0 and 20' });
              return;
            }
            updateData.passwordHistoryCount = password.historyCount;
          }
        }

        // Update organization
        const updated = (await db.organization.update({
          where: { id: orgId },
          data: updateData,
          select: {
            maxSessionsPerUser: true,
            sessionTimeoutHours: true,
            sessionIdleTimeoutHours: true,
            requireMfa: true,
            passwordMinLength: true,
            passwordRequireUppercase: true,
            passwordRequireLowercase: true,
            passwordRequireNumbers: true,
            passwordRequireSpecial: true,
            passwordExpiryDays: true,
            passwordHistoryCount: true,
          },
        })) as {
          maxSessionsPerUser: number;
          sessionTimeoutHours: number;
          sessionIdleTimeoutHours: number;
          requireMfa: boolean;
          passwordMinLength: number;
          passwordRequireUppercase: boolean;
          passwordRequireLowercase: boolean;
          passwordRequireNumbers: boolean;
          passwordRequireSpecial: boolean;
          passwordExpiryDays: number | null;
          passwordHistoryCount: number;
        };

        // Publish organization.security_settings_updated event (logging service will consume it)
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('organization.security_settings_updated', requestUser.id, orgId, undefined, {
            organizationId: orgId,
            changes: { session, mfa, password },
          }),
          timestamp: new Date().toISOString(),
          actorId: requestUser.id,
          metadata,
        } as UserManagementEvent);

        return {
          data: {
            session: {
              maxSessionsPerUser: updated.maxSessionsPerUser,
              sessionTimeoutHours: updated.sessionTimeoutHours,
              sessionIdleTimeoutHours: updated.sessionIdleTimeoutHours,
            },
            mfa: {
              requireMfa: updated.requireMfa,
            },
            password: {
              minLength: updated.passwordMinLength,
              requireUppercase: updated.passwordRequireUppercase,
              requireLowercase: updated.passwordRequireLowercase,
              requireNumbers: updated.passwordRequireNumbers,
              requireSpecial: updated.passwordRequireSpecial,
              expiryDays: updated.passwordExpiryDays,
              historyCount: updated.passwordHistoryCount,
            },
          },
        };
      } catch (error: any) {
        log.error('Update security settings error', error, { route: '/api/v1/organizations/:orgId/security-settings', service: 'user-management' });
        reply.code(500).send({
          error: 'Failed to update security settings',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
        return;
      }
    }) as any
  );
}

