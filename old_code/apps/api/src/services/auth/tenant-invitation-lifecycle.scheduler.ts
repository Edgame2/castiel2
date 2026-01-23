import type { FastifyBaseLogger } from 'fastify';
import type { EmailService } from './email.service.js';
import type { TenantInvitationService, TenantInvitationConfig } from './tenant-invitation.service.js';
import type { TenantService } from './tenant.service.js';
import type { UserService } from './user.service.js';
import type { TenantInvitationDocument } from '../../types/tenant-invitation.types.js';

type TenantMetadata = { name?: string } | null;

export class TenantInvitationLifecycleScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly invitationService: TenantInvitationService,
    private readonly tenantService: TenantService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly frontendBaseUrl: string,
    private readonly config: TenantInvitationConfig,
    private readonly logger: FastifyBaseLogger
  ) {}

  start(): void {
    if (this.interval) {
      return;
    }

    const run = () => {
      void this.runLifecycle();
    };

    this.interval = setInterval(run, this.config.lifecycleIntervalMs);
    run();
    this.logger.info('⏱️ Tenant invitation lifecycle scheduler started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
      this.logger.info('⏹️ Tenant invitation lifecycle scheduler stopped');
    }
  }

  private async runLifecycle(): Promise<void> {
    if (this.running) {
      this.logger.warn('Invitation lifecycle already running; skipping overlapping execution');
      return;
    }

    this.running = true;
    try {
      const result = await this.invitationService.processLifecycle();
      if (result.reminders.length === 0 && result.expired.length === 0) {
        return;
      }

  const tenantCache = new Map<string, TenantMetadata>();

      for (const reminder of result.reminders) {
        await this.sendReminder(reminder, tenantCache);
      }

      for (const expired of result.expired) {
        await this.sendExpiryNotice(expired, tenantCache);
      }

      this.logger.info(
        {
          reminders: result.reminders.length,
          expired: result.expired.length,
        },
        'Processed tenant invitation lifecycle run'
      );
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to process tenant invitation lifecycle');
    } finally {
      this.running = false;
    }
  }

  private async sendReminder(
    invitation: TenantInvitationDocument,
    tenantCache: Map<string, TenantMetadata>
  ): Promise<void> {
    const tenant = await this.loadTenant(invitation.tenantId, tenantCache);
    const inviteUrl = this.buildInviteUrl(invitation);

    await this.safeSendEmail({
      to: invitation.email,
      subject: `Reminder: ${tenant?.name || 'Tenant'} invitation expires soon`,
      text: `Your invitation to join ${tenant?.name || 'this tenant'} expires on ${invitation.expiresAt}. Visit ${inviteUrl} to respond.`,
      html: `Your invitation to join <strong>${tenant?.name || 'this tenant'}</strong> expires on <strong>${invitation.expiresAt}</strong>.<br/><br/>Respond here: <a href="${inviteUrl}">${inviteUrl}</a>`,
    });

    await this.notifyInviter(invitation, tenant, 'Reminder: tenant invitation expires soon',
      `Your invitation to ${invitation.email} will expire on ${invitation.expiresAt}.`);
  }

  private async sendExpiryNotice(
    invitation: TenantInvitationDocument,
    tenantCache: Map<string, TenantMetadata>
  ): Promise<void> {
    const tenant = await this.loadTenant(invitation.tenantId, tenantCache);
    await this.safeSendEmail({
      to: invitation.email,
      subject: `${tenant?.name || 'Tenant'} invitation expired`,
      text: `Your invitation to join ${tenant?.name || 'this tenant'} expired. Contact the admin if you still need access.`,
      html: `Your invitation to join <strong>${tenant?.name || 'this tenant'}</strong> has expired.<br/>Please contact the administrator if you still require access.`,
    });

    await this.notifyInviter(invitation, tenant, 'Tenant invitation expired',
      `The invitation sent to ${invitation.email} has expired.`);
  }

  private async notifyInviter(
    invitation: TenantInvitationDocument,
  tenant: TenantMetadata,
    subject: string,
    text: string
  ): Promise<void> {
    if (!invitation.inviterUserId) {
      return;
    }

    try {
      const inviter = await this.userService.findById(invitation.inviterUserId, invitation.tenantId);
      if (!inviter) {
        return;
      }

      await this.safeSendEmail({
        to: inviter.email,
        subject,
        text: `${text} (${tenant?.name || 'Tenant'})`,
        html: `${text} <br/><strong>Tenant:</strong> ${tenant?.name || invitation.tenantId}`,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to notify inviter about invitation lifecycle event');
    }
  }

  private async loadTenant(
    tenantId: string,
    tenantCache: Map<string, TenantMetadata>
  ): Promise<TenantMetadata> {
    if (tenantCache.has(tenantId)) {
      return tenantCache.get(tenantId) ?? null;
    }

    try {
      const tenant = await this.tenantService.getTenant(tenantId);
      const metadata: TenantMetadata = { name: tenant?.name };
      tenantCache.set(tenantId, metadata);
      return metadata;
    } catch (error) {
      this.logger.warn({ err: error, tenantId }, 'Failed to load tenant for invitation lifecycle');
      tenantCache.set(tenantId, null);
      return null;
    }
  }

  private buildInviteUrl(invitation: TenantInvitationDocument): string {
    const token = invitation.token || invitation.id;
    return `${this.frontendBaseUrl}/invitations/${token}?tenantId=${invitation.tenantId}`;
  }

  private async safeSendEmail(payload: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    try {
      await this.emailService.sendEmail(payload);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to send invitation lifecycle email');
    }
  }
}
