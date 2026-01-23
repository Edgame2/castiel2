/**
 * Proactive Insights Digest Worker
 *
 * Background worker that processes queued proactive insights and sends them
 * as email digests according to user preferences (frequency, time, quiet hours).
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { UnifiedEmailService } from './email/email.service.js';
import { ProactiveInsightsDeliveryPreferencesRepository } from '../repositories/proactive-insights-delivery-preferences.repository.js';
import { UserService } from './auth/user.service.js';
import type { ProactiveInsightsAnalyticsService } from './proactive-insights-analytics.service.js';
export interface ProactiveInsightsDigestWorkerConfig {
    pollIntervalMs?: number;
    enabled?: boolean;
}
/**
 * Background worker for processing proactive insights email digests
 */
export declare class ProactiveInsightsDigestWorker {
    private readonly redis;
    private readonly emailService;
    private readonly deliveryPreferencesRepository;
    private readonly userService;
    private readonly monitoring;
    private readonly analyticsService?;
    private isRunning;
    private pollInterval;
    private readonly pollIntervalMs;
    private readonly enabled;
    constructor(redis: Redis, emailService: UnifiedEmailService, deliveryPreferencesRepository: ProactiveInsightsDeliveryPreferencesRepository, userService: UserService, monitoring: IMonitoringProvider, analyticsService?: ProactiveInsightsAnalyticsService | undefined, config?: ProactiveInsightsDigestWorkerConfig);
    /**
     * Start the background worker
     */
    start(): void;
    /**
     * Stop the background worker
     */
    stop(): void;
    /**
     * Check if the worker is running
     */
    getIsRunning(): boolean;
    /**
     * Main polling loop
     */
    private poll;
    /**
     * Process pending digests
     */
    private processDigests;
    /**
     * Process a single digest queue
     * Queue key format: digest:pending:${tenantId}:${userId}
     */
    private processDigestQueue;
    /**
     * Check if it's time to send a digest based on preferences
     */
    private shouldSendDigest;
    /**
     * Check if current time is within quiet hours
     */
    private isInQuietHours;
    /**
     * Check if it's time to send digest based on frequency and time
     */
    private isTimeToSend;
    /**
     * Send digest email
     */
    private sendDigestEmail;
    /**
     * Record analytics events for all insights in a digest
     */
    private recordDigestAnalytics;
    /**
     * Get period label for email subject
     */
    private getPeriodLabel;
    /**
     * Build HTML email body
     */
    private buildDigestEmailBody;
    /**
     * Build plain text email body
     */
    private buildDigestEmailText;
    /**
     * Get color for priority level
     */
    private getPriorityColor;
    /**
     * Escape HTML characters
     */
    private escapeHtml;
}
//# sourceMappingURL=proactive-insights-digest-worker.service.d.ts.map