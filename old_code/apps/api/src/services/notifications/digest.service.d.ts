/**
 * Notification Digest Service
 *
 * Handles compilation and sending of notification digests.
 * Digests batch multiple notifications into a single message sent via email, Slack, or Teams.
 */
import { NotificationRepository } from '../../repositories/notification.repository.js';
import { NotificationDigestRepository } from '../../repositories/notification-digest.repository.js';
import { NotificationPreferenceRepository } from '../../repositories/notification-preference.repository.js';
import { NotificationDigest, DigestCompilationResult } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { UnifiedEmailService } from '../email/email.service.js';
import { SlackNotificationService } from './slack-notification.service.js';
import { TeamsNotificationService } from './teams-notification.service.js';
import { UserService } from '../auth/user.service.js';
export interface DigestServiceConfig {
    enabled: boolean;
    minNotificationsForDigest?: number;
    baseUrl?: string;
}
/**
 * Notification Digest Service
 * Compiles and sends notification digests
 */
export declare class DigestService {
    private notificationRepository;
    private digestRepository;
    private preferenceRepository?;
    private userService;
    private emailService?;
    private slackNotificationService?;
    private teamsNotificationService?;
    private monitoring;
    private config;
    constructor(notificationRepository: NotificationRepository, digestRepository: NotificationDigestRepository, userService: UserService, monitoring: IMonitoringProvider, config: DigestServiceConfig, emailService?: UnifiedEmailService, slackNotificationService?: SlackNotificationService, teamsNotificationService?: TeamsNotificationService, preferenceRepository?: NotificationPreferenceRepository);
    /**
     * Compile a digest: fetch notifications and create summary
     */
    compileDigest(digest: NotificationDigest): Promise<DigestCompilationResult>;
    /**
     * Send a compiled digest via the appropriate channel
     */
    sendDigest(compilation: DigestCompilationResult): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Send email digest
     */
    private sendEmailDigest;
    /**
     * Build HTML email body for digest
     */
    private buildEmailDigestBody;
    /**
     * Build plain text email body for digest
     */
    private buildEmailDigestText;
    /**
     * Send Slack digest
     */
    private sendSlackDigest;
    /**
     * Build Slack Block Kit message content for digest
     */
    private buildSlackDigestContent;
    /**
     * Get emoji for notification type
     */
    private getTypeEmoji;
    /**
     * Send Teams digest
     */
    private sendTeamsDigest;
    /**
     * Build Teams Adaptive Card content for digest
     */
    private buildTeamsDigestContent;
    /**
     * Get color for notification type
     */
    private getTypeColor;
}
//# sourceMappingURL=digest.service.d.ts.map