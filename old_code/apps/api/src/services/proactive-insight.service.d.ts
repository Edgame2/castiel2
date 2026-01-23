/**
 * Proactive Insight Service
 *
 * Orchestrates the detection, generation, and delivery of proactive insights.
 * Monitors shard data for conditions that warrant user attention and
 * automatically generates contextual insights.
 *
 * @see docs/features/ai-insights/README.md
 * @see apps/api/src/types/proactive-insights.types.ts
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { ProactiveTrigger, ProactiveInsight, ProactiveInsightType, ProactiveInsightPriority, ProactiveInsightStatus, TriggerEvaluationResult, DeliveryPreferences, InsightDelivery, GenerateProactiveInsightInput, CheckTriggersOptions, CheckTriggersResult } from '../types/proactive-insights.types.js';
import { InsightService } from './insight.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ProactiveInsightsRepository } from '../repositories/proactive-insights.repository.js';
import { ProactiveTriggersRepository } from '../repositories/proactive-triggers.repository.js';
import { ProactiveInsightsDeliveryPreferencesRepository } from '../repositories/proactive-insights-delivery-preferences.repository.js';
import { NotificationService } from './notification.service.js';
import { UserService } from './auth/user.service.js';
import type { ProactiveInsightsAnalyticsService } from './proactive-insights-analytics.service.js';
import type { UnifiedEmailService } from './email/email.service.js';
/**
 * Proactive Insight Service
 *
 * Main orchestrator for proactive insight functionality:
 * - Evaluates triggers against shards
 * - Generates insight content (with optional AI enhancement)
 * - Delivers insights through configured channels
 */
export declare class ProactiveInsightService {
    private monitoring;
    private shardRepository;
    private insightService;
    private redis?;
    private repository?;
    private triggersRepository?;
    private deliveryPreferencesRepository?;
    private notificationService?;
    private userService?;
    private analyticsService?;
    private emailService?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, insightService: InsightService, redis?: Redis | undefined, repository?: ProactiveInsightsRepository, notificationService?: NotificationService, triggersRepository?: ProactiveTriggersRepository, userService?: UserService, analyticsService?: ProactiveInsightsAnalyticsService, emailService?: UnifiedEmailService);
    /**
     * Set repository (for late initialization)
     */
    setRepository(repository: ProactiveInsightsRepository): void;
    /**
     * Set analytics service (for late initialization)
     */
    setAnalyticsService(analyticsService: ProactiveInsightsAnalyticsService): void;
    /**
     * Set triggers repository (for late initialization)
     */
    setTriggersRepository(repository: ProactiveTriggersRepository): void;
    /**
     * Set notification service (for late initialization)
     */
    setNotificationService(notificationService: NotificationService): void;
    /**
     * Set delivery preferences repository (for late initialization)
     */
    setDeliveryPreferencesRepository(repository: ProactiveInsightsDeliveryPreferencesRepository): void;
    /**
     * Set user service (for late initialization)
     */
    setUserService(userService: UserService): void;
    /**
     * Seed default triggers for a tenant
     * Creates all DEFAULT_PROACTIVE_TRIGGERS for the specified tenant
     */
    seedDefaultTriggers(tenantId: string): Promise<{
        seeded: number;
        skipped: number;
        errors: number;
    }>;
    /**
     * Check all triggers for a tenant and generate insights
     * This is the main entry point for scheduled trigger evaluation
     */
    checkTriggers(tenantId: string, options?: CheckTriggersOptions): Promise<CheckTriggersResult>;
    /**
     * Evaluate a single trigger against a shard
     */
    evaluateTrigger(trigger: ProactiveTrigger, shardId: string, shardData: Record<string, unknown>): Promise<TriggerEvaluationResult>;
    /**
     * Generate a proactive insight from a triggered condition
     */
    generateProactiveInsight(input: GenerateProactiveInsightInput): Promise<ProactiveInsight>;
    /**
     * Deliver an insight through configured channels
     */
    deliverInsight(insight: ProactiveInsight, preferences: DeliveryPreferences): Promise<InsightDelivery[]>;
    /**
     * Evaluate conditions against shard data
     */
    private evaluateConditions;
    /**
     * Evaluate a single condition
     */
    private evaluateSingleCondition;
    /**
     * Compare values using the specified operator
     */
    private compareValues;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Parse relative date expression
     */
    private parseRelativeDate;
    /**
     * Generate insight title based on trigger and shard
     */
    private generateTitle;
    /**
     * Generate insight summary from matched conditions
     */
    private generateSummary;
    /**
     * Interpolate template with shard data
     */
    private interpolateTemplate;
    /**
     * Generate AI-enhanced content
     */
    private generateAIContent;
    /**
     * Build suggested actions based on insight type
     */
    private buildSuggestedActions;
    /**
     * Determine which channels to use for delivery
     */
    private determineChannels;
    /**
     * Deliver to a specific channel
     */
    private deliverToChannel;
    /**
     * Deliver in-app notification
     */
    private deliverInApp;
    /**
     * Add to dashboard widget
     */
    private deliverToDashboard;
    /**
     * Send immediate email notification
     * Sends email directly for high-priority insights that meet the immediate threshold.
     * This is used when email is enabled but in_app notifications are disabled,
     * or when immediate email delivery is specifically requested.
     */
    private deliverEmail;
    /**
     * Check if current time is within quiet hours
     */
    private isInQuietHours;
    /**
     * Get color for priority level
     */
    private getPriorityColor;
    /**
     * Build HTML email body
     */
    private buildEmailBody;
    /**
     * Build plain text email body
     */
    private buildEmailText;
    /**
     * Escape HTML characters
     */
    private escapeHtml;
    /**
     * Queue insight for digest email
     */
    private queueForDigest;
    /**
     * Deliver webhook
     */
    private deliverWebhook;
    /**
     * Get delivery preferences for a user (with defaults fallback)
     */
    private getDeliveryPreferences;
    /**
     * Deliver to default channels (when no user preferences available)
     * Now attempts to get user preferences first, falls back to defaults
     * When userId is undefined (worker context), delivers to all users in tenant
     */
    private deliverToDefaultChannels;
    /**
     * Check if trigger-shard pair is in cooldown
     */
    private isInCooldown;
    /**
     * Set cooldown for trigger-shard pair
     */
    private setCooldown;
    /**
     * Get active triggers for a tenant
     * Public method for use by event subscriber
     */
    getActiveTriggers(tenantId: string, triggerIds?: string[]): Promise<ProactiveTrigger[]>;
    /**
     * Group triggers by shard type
     */
    private groupTriggersByShardType;
    /**
     * Get shards for trigger evaluation
     */
    private getShardsForEvaluation;
    /**
     * Store insight
     */
    private storeInsight;
    /**
     * Update insight
     */
    private updateInsight;
    /**
     * Get insight by ID
     */
    getInsight(insightId: string, tenantId: string): Promise<ProactiveInsight | null>;
    /**
     * List insights for a tenant
     */
    listInsights(tenantId: string, options?: {
        status?: ProactiveInsightStatus | ProactiveInsightStatus[];
        type?: ProactiveInsightType | ProactiveInsightType[];
        priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
        shardId?: string;
        triggerId?: string;
        limit?: number;
        offset?: number;
        orderBy?: 'createdAt' | 'updatedAt' | 'priority';
        order?: 'asc' | 'desc';
    }): Promise<{
        insights: ProactiveInsight[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Acknowledge an insight
     */
    acknowledgeInsight(insightId: string, tenantId: string, userId: string): Promise<ProactiveInsight>;
    /**
     * Dismiss an insight
     */
    dismissInsight(insightId: string, tenantId: string, userId: string, reason?: string): Promise<ProactiveInsight>;
    /**
     * Mark insight as actioned
     */
    actionInsight(insightId: string, tenantId: string, userId: string): Promise<ProactiveInsight>;
    /**
     * Delete an insight
     */
    deleteInsight(insightId: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=proactive-insight.service.d.ts.map