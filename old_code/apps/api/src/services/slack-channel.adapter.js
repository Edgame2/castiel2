/**
 * Slack Channel Adapter
 * Formats and delivers notifications to Slack using Block Kit
 */
import axios from 'axios';
// @ts-ignore - notification.types may not exist
import { NotificationEventType } from '../types/notification.types';
export class SlackChannelAdapter {
    monitoring;
    DEFAULT_TIMEOUT = 10000; // 10 seconds
    MAX_RETRIES = 3;
    
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    
    // Logger methods using monitoring if available, otherwise no-op
    logger = {
        log: (message) => {
            if (this.monitoring) {
                this.monitoring.trackEvent('slack-adapter.log', { message });
            }
        },
        warn: (message) => {
            if (this.monitoring) {
                this.monitoring.trackEvent('slack-adapter.warn', { message });
            }
        },
        error: (message) => {
            if (this.monitoring) {
                this.monitoring.trackException(new Error(message), { operation: 'slack-adapter.error' });
            }
        },
    };
    /**
     * Send notification to Slack
     */
    async sendNotification(webhookUrl, notification) {
        try {
            const payload = this.buildSlackPayload(notification);
            const response = await axios.post(webhookUrl, payload, {
                timeout: this.DEFAULT_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 200 && response.data === 'ok') {
                return {
                    success: true,
                    messageTs: response.headers['x-slack-req-id'],
                };
            }
            return {
                success: false,
                error: `Unexpected response: ${response.data}`,
                statusCode: response.status,
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * Build Slack message payload with Block Kit
     */
    buildSlackPayload(notification) {
        const { templateVars, template, metadata } = notification;
        const eventType = templateVars.eventType || 'notification';
        // Fallback text for notifications and search
        const fallbackText = this.getFallbackText(notification);
        // Build blocks based on event type
        const blocks = this.buildBlocksForEvent(eventType, notification);
        return {
            text: fallbackText,
            blocks,
            username: metadata?.slackUsername || 'Castiel',
            icon_emoji: metadata?.slackIconEmoji || ':sparkles:',
            channel: metadata?.slackChannel,
        };
    }
    /**
     * Build Block Kit blocks based on event type
     */
    buildBlocksForEvent(eventType, notification) {
        const { templateVars } = notification;
        switch (eventType) {
            case NotificationEventType.PROJECT_SHARED:
                return this.buildProjectSharedBlocks(templateVars);
            case NotificationEventType.COLLABORATOR_ADDED:
                return this.buildCollaboratorAddedBlocks(templateVars);
            case NotificationEventType.SHARD_CREATED:
                return this.buildShardCreatedBlocks(templateVars);
            case NotificationEventType.RECOMMENDATION_GENERATED:
                return this.buildRecommendationBlocks(templateVars);
            case NotificationEventType.ACTIVITY_THRESHOLD_EXCEEDED:
                return this.buildActivityAlertBlocks(templateVars);
            default:
                return this.buildGenericBlocks(templateVars);
        }
    }
    /**
     * Build blocks for project shared notification
     */
    buildProjectSharedBlocks(vars) {
        return [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🔗 Project Shared with You',
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${vars.senderName}* has shared *${vars.projectName}* with you.`,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Role:*\n${vars.role || 'Viewer'}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Organization:*\n${vars.organizationName || 'Personal'}`,
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Open Project',
                            emoji: true,
                        },
                        url: vars.actionUrl,
                        style: 'primary',
                    },
                ],
            },
        ];
    }
    /**
     * Build blocks for collaborator added
     */
    buildCollaboratorAddedBlocks(vars) {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `👥 *${vars.senderName}* added you as a collaborator to *${vars.projectName}*`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Access level: *${vars.role}* | ${vars.timestamp}`,
                    },
                ],
            },
        ];
    }
    /**
     * Build blocks for shard created
     */
    buildShardCreatedBlocks(vars) {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `📝 New shard created in *${vars.projectName}*`,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Type:*\n${vars.shardType || 'Unknown'}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Created by:*\n${vars.senderName}`,
                    },
                ],
            },
        ];
    }
    /**
     * Build blocks for recommendation generated
     */
    buildRecommendationBlocks(vars) {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `💡 *New Recommendation*\n${vars.message || 'A new recommendation has been generated for your project.'}`,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Confidence:*\n${vars.confidence || 'High'}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Project:*\n${vars.projectName}`,
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Details',
                        },
                        url: vars.actionUrl,
                    },
                ],
            },
        ];
    }
    /**
     * Build blocks for activity threshold alert
     */
    buildActivityAlertBlocks(vars) {
        return [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '⚠️ Activity Alert',
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: vars.message || 'Activity threshold has been exceeded.',
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Project:*\n${vars.projectName}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Threshold:*\n${vars.threshold || 'N/A'}`,
                    },
                ],
            },
        ];
    }
    /**
     * Build generic blocks for any notification
     */
    buildGenericBlocks(vars) {
        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: vars.message || 'You have a new notification from Castiel.',
                },
            },
        ];
        // Add context if available
        if (vars.projectName || vars.senderName) {
            blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: [
                            vars.projectName && `Project: *${vars.projectName}*`,
                            vars.senderName && `From: ${vars.senderName}`,
                            vars.timestamp,
                        ]
                            .filter(Boolean)
                            .join(' | '),
                    },
                ],
            });
        }
        // Add action button if URL available
        if (vars.actionUrl) {
            blocks.push({
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Details',
                        },
                        url: vars.actionUrl,
                    },
                ],
            });
        }
        return blocks;
    }
    /**
     * Get fallback text for notification
     */
    getFallbackText(notification) {
        const { templateVars, template } = notification;
        if (template?.body) {
            return this.interpolateTemplate(template.body, templateVars);
        }
        if (templateVars.message) {
            return templateVars.message;
        }
        return `New notification from ${templateVars.senderName || 'Castiel'}`;
    }
    /**
     * Simple template interpolation
     */
    interpolateTemplate(template, vars) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return vars[key] || match;
        });
    }
    /**
     * Handle delivery errors
     */
    handleError(error) {
        if (error.response) {
            // HTTP error response
            const statusCode = error.response.status;
            const data = error.response.data;
            this.logger.warn(`Slack API error: ${statusCode} - ${JSON.stringify(data)}`);
            // Check for rate limiting
            if (statusCode === 429) {
                const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
                return {
                    success: false,
                    error: 'Rate limited',
                    statusCode,
                    retryAfter,
                };
            }
            return {
                success: false,
                error: data?.error || 'Slack API error',
                statusCode,
            };
        }
        if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                error: 'Request timeout',
            };
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: 'Network error',
            };
        }
        return {
            success: false,
            error: error.message || 'Unknown error',
        };
    }
    /**
     * Send with retry logic
     */
    async sendWithRetry(webhookUrl, notification, maxRetries = this.MAX_RETRIES) {
        let lastResult = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            lastResult = await this.sendNotification(webhookUrl, notification);
            if (lastResult.success) {
                return lastResult;
            }
            // Don't retry on client errors (4xx except 429)
            if (lastResult.statusCode &&
                lastResult.statusCode >= 400 &&
                lastResult.statusCode < 500 &&
                lastResult.statusCode !== 429) {
                this.logger.warn(`Slack delivery failed with client error, not retrying: ${lastResult.error}`);
                return lastResult;
            }
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                const delay = lastResult.retryAfter
                    ? lastResult.retryAfter * 1000
                    : Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                this.logger.log(`Retrying Slack delivery in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        return lastResult || { success: false, error: 'All retries failed' };
    }
}
//# sourceMappingURL=slack-channel.adapter.js.map