// @ts-nocheck
import { Container } from '@azure/cosmos';
import { randomBytes } from 'crypto';
import type { Redis } from 'ioredis';
import {
  CreateTenantInvitationInput,
  TenantInvitationDocument,
  TenantInvitationLifecycleResult,
  TenantInvitationAudit,
  TenantInvitationResponse,
  TenantInvitationStatus,
} from '../../types/tenant-invitation.types.js';

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

const ROLE_PRESETS: Record<string, string[]> = {
  member: ['user'],
  admin: ['admin', 'user'],
  billing_admin: ['billing_admin', 'user'],
};

export class TenantInvitationRateLimitError extends Error {
  constructor(public scope: 'tenant' | 'admin') {
    super(scope === 'tenant' ? 'Tenant invitation limit reached for tenant' : 'Invitation limit reached for admin');
    this.name = 'TenantInvitationRateLimitError';
  }
}

export class TenantInvitationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantInvitationValidationError';
  }
}

export class TenantInvitationService {
  constructor(
    private readonly container: Container,
    private readonly config: TenantInvitationConfig,
    private readonly redis?: Redis | null
  ) {}

  async createInvitation(input: CreateTenantInvitationInput): Promise<TenantInvitationResponse> {
    await this.enforceRateLimits(input.tenantId, input.inviterUserId);

    const existing = await this.findPendingInvitation(input.tenantId, input.email);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const invitation: TenantInvitationDocument = {
      id: randomBytes(16).toString('hex'),
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      token: randomBytes(24).toString('hex'),
      inviterUserId: input.inviterUserId,
      status: TenantInvitationStatus.PENDING,
      message: input.message,
      createdAt: now,
      updatedAt: now,
      expiresAt: this.resolveExpiryDate(input.expiresAt),
      reminderSentAt: undefined,
      roles: this.resolveRoles(input.roles, input.rolesPreset),
      rolesPreset: input.rolesPreset,
      audit: input.audit,
      partitionKey: input.tenantId,
    };

    const { resource } = await this.container.items.create(invitation);
    return this.toResponse(resource as TenantInvitationDocument);
  }

  async getInvitationByToken(token: string, tenantId: string): Promise<TenantInvitationResponse | null> {
    const doc = await this.getInvitationDocumentByToken(token, tenantId);
    if (!doc) {
      return null;
    }

    if (this.isExpired(doc)) {
      await this.expireInvitation(doc);
      return null;
    }

    return this.toResponse(doc);
  }

  async getInvitationForPreview(token: string, tenantId: string): Promise<TenantInvitationDocument | null> {
    return this.getInvitationDocumentByToken(token, tenantId);
  }

  async respondToInvitation(
    tenantId: string,
    invitationId: string,
    status: TenantInvitationStatus,
    decisionBy?: string,
    audit?: TenantInvitationAudit
  ): Promise<TenantInvitationResponse | null> {
    const invitation = await this.getInvitationDocumentById(invitationId, tenantId);
    if (!invitation || invitation.status !== TenantInvitationStatus.PENDING) {
      return null;
    }

    if (this.isExpired(invitation)) {
      await this.expireInvitation(invitation);
      return null;
    }

    const now = new Date().toISOString();
    const updated: TenantInvitationDocument = {
      ...invitation,
      status,
      respondedAt: now,
      updatedAt: now,
      decisionAt: now,
      decisionBy,
      audit: {
        ...invitation.audit,
        ...audit,
      },
    };

    const { resource } = await this.container.item(invitationId, tenantId).replace(updated);
    return resource ? this.toResponse(resource as TenantInvitationDocument) : null;
  }

  async revokeInvitation(id: string, tenantId: string): Promise<TenantInvitationResponse | null> {
    const invitation = await this.getInvitationDocumentById(id, tenantId);
    if (!invitation || invitation.status !== TenantInvitationStatus.PENDING) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: TenantInvitationDocument = {
      ...invitation,
      status: TenantInvitationStatus.REVOKED,
      updatedAt: now,
      respondedAt: now,
    };

    const { resource } = await this.container.item(id, tenantId).replace(updated);
    return resource ? this.toResponse(resource as TenantInvitationDocument) : null;
  }

  /**
   * List invitations for a tenant with optional filtering
   */
  async listInvitations(
    tenantId: string,
    options?: {
      status?: TenantInvitationStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ invitations: TenantInvitationResponse[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: { name: string; value: any }[] = [
      { name: '@tenantId', value: tenantId },
    ];

    if (options?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: options.status });
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
    const total = await this.countByQuery(countQuery, parameters, tenantId);

    // Get paginated results
    query += ' ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
    parameters.push({ name: '@offset', value: offset });
    parameters.push({ name: '@limit', value: limit });

    const { resources } = await this.container.items
      .query<TenantInvitationDocument>({ query, parameters })
      .fetchAll();

    return {
      invitations: resources.map(doc => this.toResponse(doc)),
      total,
    };
  }

  /**
   * Resend an invitation (creates a new invitation token)
   */
  async resendInvitation(id: string, tenantId: string, inviterUserId: string): Promise<TenantInvitationResponse | null> {
    const invitation = await this.getInvitationDocumentById(id, tenantId);
    if (!invitation || invitation.status !== TenantInvitationStatus.PENDING) {
      return null;
    }

    // Generate new token and update expiry
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const updated: TenantInvitationDocument = {
      ...invitation,
      token: this.generateToken(),
      expiresAt: newExpiresAt.toISOString(),
      updatedAt: now.toISOString(),
      reminderSentAt: undefined, // Reset reminder
    };

    const { resource } = await this.container.item(id, tenantId).replace(updated);
    return resource ? this.toResponse(resource as TenantInvitationDocument) : null;
  }

  async countPendingInvitations(tenantId: string): Promise<number> {
    return this.countByQuery(
      'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
      [
        { name: '@tenantId', value: tenantId },
        { name: '@status', value: TenantInvitationStatus.PENDING },
      ],
      tenantId
    );
  }

  async countExpiringInvitations(tenantId: string, hours: number): Promise<number> {
    const threshold = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    return this.countByQuery(
      'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status AND c.expiresAt <= @threshold',
      [
        { name: '@tenantId', value: tenantId },
        { name: '@status', value: TenantInvitationStatus.PENDING },
        { name: '@threshold', value: threshold },
      ],
      tenantId
    );
  }

  async processLifecycle(now = new Date()): Promise<TenantInvitationLifecycleResult> {
    const nowIso = now.toISOString();
    const reminderThreshold = new Date(now.getTime() + this.config.reminderLeadHours * 60 * 60 * 1000).toISOString();

    const [reminders, expired] = await Promise.all([
      this.queryCrossPartition(
        'SELECT * FROM c WHERE c.status = @status AND IS_NULL(c.reminderSentAt) AND c.expiresAt <= @threshold AND c.expiresAt > @now',
        [
          { name: '@status', value: TenantInvitationStatus.PENDING },
          { name: '@threshold', value: reminderThreshold },
          { name: '@now', value: nowIso },
        ]
      ),
      this.queryCrossPartition(
        'SELECT * FROM c WHERE c.status = @status AND c.expiresAt <= @now',
        [
          { name: '@status', value: TenantInvitationStatus.PENDING },
          { name: '@now', value: nowIso },
        ]
      ),
    ]);

    await Promise.all([
      ...reminders.map((doc) => this.markReminderSent(doc, nowIso)),
      ...expired.map((doc) => this.expireInvitation(doc, nowIso)),
    ]);

    return { reminders, expired };
  }

  private async getInvitationDocumentByToken(token: string, tenantId: string): Promise<TenantInvitationDocument | null> {
    const { resources } = await this.container.items
      .query<TenantInvitationDocument>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.token = @token',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@token', value: token },
        ],
      }, { partitionKey: tenantId })
      .fetchAll();

    return resources[0] || null;
  }

  private async getInvitationDocumentById(id: string, tenantId: string): Promise<TenantInvitationDocument | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<TenantInvitationDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  private async findPendingInvitation(tenantId: string, email: string): Promise<TenantInvitationResponse | null> {
    const { resources } = await this.container.items
      .query<TenantInvitationDocument>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.email = @email AND c.status = @status',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@email', value: email.toLowerCase() },
          { name: '@status', value: TenantInvitationStatus.PENDING },
        ],
      }, { partitionKey: tenantId })
      .fetchAll();

    const doc = resources[0];
    if (!doc) {
      return null;
    }

    if (this.isExpired(doc)) {
      await this.expireInvitation(doc);
      return null;
    }

    return this.toResponse(doc);
  }

  private toResponse(doc: TenantInvitationDocument): TenantInvitationResponse {
    return {
      id: doc.id,
      tenantId: doc.tenantId,
      email: doc.email,
      status: doc.status,
      message: doc.message,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      respondedAt: doc.respondedAt,
      expiresAt: doc.expiresAt,
      reminderSentAt: doc.reminderSentAt,
      roles: doc.roles,
      rolesPreset: doc.rolesPreset,
      decisionBy: doc.decisionBy,
      decisionAt: doc.decisionAt,
      token: doc.token,
    };
  }

  private async countByQuery(
    query: string,
    parameters: { name: string; value: any }[],
    partitionKey: string
  ): Promise<number> {
    const { resources } = await this.container.items
      .query<number>({ query, parameters }, { partitionKey })
      .fetchAll();
    return resources[0] || 0;
  }

  private async queryCrossPartition(
    query: string,
    parameters: { name: string; value: any }[]
  ): Promise<TenantInvitationDocument[]> {
    const { resources } = await this.container.items
      .query<TenantInvitationDocument>({ query, parameters })
      .fetchAll();
    return resources;
  }

  private resolveRoles(roles?: string[], preset?: string): string[] | undefined {
    if (roles && roles.length > 0) {
      const unique = Array.from(new Set(roles.map((role) => role.trim()).filter(Boolean)));
      return unique.length ? unique : undefined;
    }
    if (preset && ROLE_PRESETS[preset]) {
      return ROLE_PRESETS[preset];
    }
    return undefined;
  }

  isExpired(doc: TenantInvitationDocument): boolean {
    return new Date(doc.expiresAt).getTime() <= Date.now() || doc.status === TenantInvitationStatus.EXPIRED;
  }

  private async markReminderSent(doc: TenantInvitationDocument, reminderAt: string): Promise<void> {
    const updated: TenantInvitationDocument = {
      ...doc,
      reminderSentAt: reminderAt,
      updatedAt: reminderAt,
    };
    await this.container.item(doc.id, doc.partitionKey).replace(updated);
  }

  private async expireInvitation(doc: TenantInvitationDocument, expiredAt?: string): Promise<void> {
    const timestamp = expiredAt || new Date().toISOString();
    const updated: TenantInvitationDocument = {
      ...doc,
      status: TenantInvitationStatus.EXPIRED,
      updatedAt: timestamp,
      respondedAt: timestamp,
    };
    await this.container.item(doc.id, doc.partitionKey).replace(updated);
  }

  private async enforceRateLimits(tenantId: string, inviterUserId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const redis = this.redis;
    const dayKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    await Promise.all([
      this.bumpRateLimit(redis, `invite:tenant:${tenantId}:${dayKey}`, this.config.perTenantDailyLimit, 'tenant'),
      this.bumpRateLimit(redis, `invite:admin:${tenantId}:${inviterUserId}:${dayKey}`, this.config.perAdminDailyLimit, 'admin'),
    ]);
  }

  private async bumpRateLimit(redis: Redis, key: string, limit: number, scope: 'tenant' | 'admin'): Promise<void> {
    const ttlSeconds = 24 * 60 * 60;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    if (count > limit) {
      await redis.decr(key);
      throw new TenantInvitationRateLimitError(scope);
    }
  }

  private resolveExpiryDate(explicit?: string): string {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const minTs = now + this.config.minExpiryDays * dayMs;
    const maxTs = now + this.config.maxExpiryDays * dayMs;

    if (!explicit) {
      return new Date(now + this.config.defaultExpiryDays * dayMs).toISOString();
    }

    const candidate = Date.parse(explicit);
    if (Number.isNaN(candidate)) {
      throw new TenantInvitationValidationError('Invalid invitation expiration date');
    }

    if (candidate < minTs) {
      throw new TenantInvitationValidationError('Invitation expiration is earlier than allowed minimum');
    }

    if (candidate > maxTs) {
      throw new TenantInvitationValidationError('Invitation expiration exceeds allowed maximum');
    }

    return new Date(candidate).toISOString();
  }
}
