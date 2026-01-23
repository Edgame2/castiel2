/**
 * Microsoft Teams Channel Adapter
 * Formats and delivers notifications to Teams using Adaptive Cards
 */
import { QueuedNotification } from '../types/notification.types';
/**
 * Delivery result
 */
export interface TeamsDeliveryResult {
    success: boolean;
    messageId?: string;
    error?: string;
    statusCode?: number;
    retryAfter?: number;
}
export declare class TeamsChannelAdapter {
    private readonly logger;
    private readonly DEFAULT_TIMEOUT;
    private readonly MAX_RETRIES;
    /**
     * Send notification to Teams
     */
    sendNotification(webhookUrl: string, notification: QueuedNotification): Promise<TeamsDeliveryResult>;
    /**
     * Build Teams message payload
     */
    private buildTeamsPayload;
    /**
     * Build card based on event type
     */
    private buildCardForEvent;
    /**
     * Build card for project shared notification
     */
    private buildProjectSharedCard;
    /**
     * Build card for collaborator added
     */
    private buildCollaboratorAddedCard;
    /**
     * Build card for shard created
     */
    private buildShardCreatedCard;
    /**
     * Build card for recommendation
     */
    private buildRecommendationCard;
    /**
     * Build card for activity alert
     */
    private buildActivityAlertCard;
    /**
     * Build generic card
     */
    private buildGenericCard;
    /**
     * Handle delivery errors
     */
    private handleError;
    /**
     * Send with retry logic
     */
    sendWithRetry(webhookUrl: string, notification: QueuedNotification, maxRetries?: number): Promise<TeamsDeliveryResult>;
}
//# sourceMappingURL=teams-channel.adapter.d.ts.map