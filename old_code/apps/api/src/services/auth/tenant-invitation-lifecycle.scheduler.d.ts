import type { FastifyBaseLogger } from 'fastify';
import type { EmailService } from './email.service.js';
import type { TenantInvitationService, TenantInvitationConfig } from './tenant-invitation.service.js';
import type { TenantService } from './tenant.service.js';
import type { UserService } from './user.service.js';
export declare class TenantInvitationLifecycleScheduler {
    private readonly invitationService;
    private readonly tenantService;
    private readonly userService;
    private readonly emailService;
    private readonly frontendBaseUrl;
    private readonly config;
    private readonly logger;
    private interval?;
    private running;
    constructor(invitationService: TenantInvitationService, tenantService: TenantService, userService: UserService, emailService: EmailService, frontendBaseUrl: string, config: TenantInvitationConfig, logger: FastifyBaseLogger);
    start(): void;
    stop(): void;
    private runLifecycle;
    private sendReminder;
    private sendExpiryNotice;
    private notifyInviter;
    private loadTenant;
    private buildInviteUrl;
    private safeSendEmail;
}
//# sourceMappingURL=tenant-invitation-lifecycle.scheduler.d.ts.map