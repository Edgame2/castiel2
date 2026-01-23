/**
 * Microsoft Teams Channel Adapter
 * Formats and delivers notifications to Teams using Adaptive Cards
 */
import axios from 'axios';
// @ts-ignore - notification.types may not exist
import { NotificationEventType } from '../types/notification.types';
export class TeamsChannelAdapter {
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
                this.monitoring.trackEvent('teams-adapter.log', { message });
            }
        },
        warn: (message) => {
            if (this.monitoring) {
                this.monitoring.trackEvent('teams-adapter.warn', { message });
            }
        },
        error: (message) => {
            if (this.monitoring) {
                this.monitoring.trackException(new Error(message), { operation: 'teams-adapter.error' });
            }
        },
    };
    /**
     * Send notification to Teams
     */
    async sendNotification(webhookUrl, notification) {
        try {
            const payload = this.buildTeamsPayload(notification);
            const response = await axios.post(webhookUrl, payload, {
                timeout: this.DEFAULT_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 200) {
                return {
                    success: true,
                    messageId: response.headers['x-ms-request-id'],
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
     * Build Teams message payload
     */
    buildTeamsPayload(notification) {
        const { templateVars, metadata } = notification;
        const eventType = templateVars.eventType || 'notification';
        // Build card based on event type
        const card = this.buildCardForEvent(eventType, notification);
        return card;
    }
    /**
     * Build card based on event type
     */
    buildCardForEvent(eventType, notification) {
        const { templateVars } = notification;
        switch (eventType) {
            case NotificationEventType.PROJECT_SHARED:
                return this.buildProjectSharedCard(templateVars);
            case NotificationEventType.COLLABORATOR_ADDED:
                return this.buildCollaboratorAddedCard(templateVars);
            case NotificationEventType.SHARD_CREATED:
                return this.buildShardCreatedCard(templateVars);
            case NotificationEventType.RECOMMENDATION_GENERATED:
                return this.buildRecommendationCard(templateVars);
            case NotificationEventType.ACTIVITY_THRESHOLD_EXCEEDED:
                return this.buildActivityAlertCard(templateVars);
            default:
                return this.buildGenericCard(templateVars);
        }
    }
    /**
     * Build card for project shared notification
     */
    buildProjectSharedCard(vars) {
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: `${vars.senderName} shared ${vars.projectName} with you`,
            themeColor: '0078D4',
            title: '🔗 Project Shared with You',
            sections: [
                {
                    activityTitle: `**${vars.senderName}** shared **${vars.projectName}**`,
                    activitySubtitle: vars.organizationName || 'Personal Project',
                    facts: [
                        {
                            name: 'Your Role:',
                            value: vars.role || 'Viewer',
                        },
                        {
                            name: 'Shared On:',
                            value: vars.timestamp || new Date().toLocaleString(),
                        },
                    ],
                },
            ],
            potentialAction: vars.actionUrl
                ? [
                    {
                        '@type': 'OpenUri',
                        name: 'Open Project',
                        targets: [
                            {
                                os: 'default',
                                uri: vars.actionUrl,
                            },
                        ],
                    },
                ]
                : undefined,
        };
    }
    /**
     * Build card for collaborator added
     */
    buildCollaboratorAddedCard(vars) {
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: `Added as collaborator to ${vars.projectName}`,
            themeColor: '28A745',
            title: '👥 New Collaboration',
            sections: [
                {
                    activityTitle: `You've been added to **${vars.projectName}**`,
                    activitySubtitle: `by ${vars.senderName}`,
                    facts: [
                        {
                            name: 'Access Level:',
                            value: vars.role || 'Viewer',
                        },
                    ],
                },
            ],
            potentialAction: vars.actionUrl
                ? [
                    {
                        '@type': 'OpenUri',
                        name: 'View Project',
                        targets: [{ os: 'default', uri: vars.actionUrl }],
                    },
                ]
                : undefined,
        };
    }
    /**
     * Build card for shard created
     */
    buildShardCreatedCard(vars) {
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: `New shard in ${vars.projectName}`,
            themeColor: '6264A7',
            title: '📝 Shard Created',
            sections: [
                {
                    activityTitle: `New shard in **${vars.projectName}**`,
                    activitySubtitle: `Created by ${vars.senderName}`,
                    facts: [
                        {
                            name: 'Type:',
                            value: vars.shardType || 'Unknown',
                        },
                        {
                            name: 'Created:',
                            value: vars.timestamp || new Date().toLocaleString(),
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Build card for recommendation
     */
    buildRecommendationCard(vars) {
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: 'New recommendation available',
            themeColor: 'FFC107',
            title: '💡 New Recommendation',
            sections: [
                {
                    text: vars.message || 'A new recommendation has been generated for your project.',
                    markdown: true,
                },
                {
                    facts: [
                        {
                            name: 'Project:',
                            value: vars.projectName || 'Unknown',
                        },
                        {
                            name: 'Confidence:',
                            value: vars.confidence || 'High',
                        },
                    ],
                },
            ],
            potentialAction: vars.actionUrl
                ? [
                    {
                        '@type': 'OpenUri',
                        name: 'View Details',
                        targets: [{ os: 'default', uri: vars.actionUrl }],
                    },
                ]
                : undefined,
        };
    }
    /**
     * Build card for activity alert
     */
    buildActivityAlertCard(vars) {
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: 'Activity threshold exceeded',
            themeColor: 'DC3545',
            title: '⚠️ Activity Alert',
            sections: [
                {
                    activityTitle: vars.message || 'Activity threshold has been exceeded',
                    facts: [
                        {
                            name: 'Project:',
                            value: vars.projectName || 'Unknown',
                        },
                        {
                            name: 'Threshold:',
                            value: vars.threshold || 'N/A',
                        },
                        {
                            name: 'Time:',
                            value: vars.timestamp || new Date().toLocaleString(),
                        },
                    ],
                },
            ],
            potentialAction: vars.actionUrl
                ? [
                    {
                        '@type': 'OpenUri',
                        name: 'View Activity',
                        targets: [{ os: 'default', uri: vars.actionUrl }],
                    },
                ]
                : undefined,
        };
    }
    /**
     * Build generic card
     */
    buildGenericCard(vars) {
        const facts = [];
        if (vars.projectName) {
            facts.push({ name: 'Project:', value: vars.projectName });
        }
        if (vars.senderName) {
            facts.push({ name: 'From:', value: vars.senderName });
        }
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: vars.message || 'New notification from Castiel',
            themeColor: '5865F2',
            title: '✨ Castiel Notification',
            sections: [
                {
                    text: vars.message || 'You have a new notification.',
                    facts: facts.length > 0 ? facts : undefined,
                },
            ],
            potentialAction: vars.actionUrl
                ? [
                    {
                        '@type': 'OpenUri',
                        name: 'View Details',
                        targets: [{ os: 'default', uri: vars.actionUrl }],
                    },
                ]
                : undefined,
        };
    }
    /**
     * Handle delivery errors
     */
    handleError(error) {
        if (error.response) {
            const statusCode = error.response.status;
            const data = error.response.data;
            this.logger.warn(`Teams webhook error: ${statusCode} - ${JSON.stringify(data)}`);
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
                error: data?.error || 'Teams webhook error',
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
                this.logger.warn(`Teams delivery failed with client error, not retrying: ${lastResult.error}`);
                return lastResult;
            }
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                const delay = lastResult.retryAfter
                    ? lastResult.retryAfter * 1000
                    : Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                this.logger.log(`Retrying Teams delivery in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        return lastResult || { success: false, error: 'All retries failed' };
    }
}
//# sourceMappingURL=teams-channel.adapter.js.map