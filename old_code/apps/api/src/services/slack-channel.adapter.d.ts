/**
 * Slack Channel Adapter
 * Formats and delivers notifications to Slack using Block Kit
 */
import { QueuedNotification } from '../types/notification.types';
/**
 * Delivery result
 */
export interface SlackDeliveryResult {
    success: boolean;
    messageTs?: string;
    error?: string;
    statusCode?: number;
    retryAfter?: number;
}
export declare class SlackChannelAdapter {
    private readonly logger;
    private readonly DEFAULT_TIMEOUT;
    private readonly MAX_RETRIES;
    /**
     * Send notification to Slack
     */
    sendNotification(webhookUrl: string, notification: QueuedNotification): Promise<SlackDeliveryResult>;
    /**
     * Build Slack message payload with Block Kit
     */
    private buildSlackPayload;
    /**
     * Build Block Kit blocks based on event type
     */
    private buildBlocksForEvent;
    /**
     * Build blocks for project shared notification
     */
    private buildProjectSharedBlocks;
    /**
     * Build blocks for collaborator added
     */
    private buildCollaboratorAddedBlocks;
    /**
     * Build blocks for shard created
     */
    private buildShardCreatedBlocks;
    /**
     * Build blocks for recommendation generated
     */
    private buildRecommendationBlocks;
    /**
     * Build blocks for activity threshold alert
     */
    private buildActivityAlertBlocks;
    /**
     * Build generic blocks for any notification
     */
    private buildGenericBlocks;
    /**
     * Get fallback text for notification
     */
    private getFallbackText;
    /**
     * Simple template interpolation
     */
    private interpolateTemplate;
    /**
     * Handle delivery errors
     */
    private handleError;
    /**
     * Send with retry logic
     */
    sendWithRetry(webhookUrl: string, notification: QueuedNotification, maxRetries?: number): Promise<SlackDeliveryResult>;
}
//# sourceMappingURL=slack-channel.adapter.d.ts.map