/**
 * Slack Notification Service
 *
 * Handles sending notification messages to Slack channels using incoming webhooks.
 * Supports Slack Block Kit formatting for rich messages.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */
/**
 * Slack Notification Service
 * Sends Slack notifications when in-app notifications are created
 */
export class SlackNotificationService {
    config;
    monitoring;
    deliveryTracking;
    constructor(config, monitoring, deliveryTracking) {
        this.config = {
            enabled: config.enabled,
            sendForTypes: config.sendForTypes || ['success', 'error', 'warning', 'information', 'alert'],
            skipForLowPriority: config.skipForLowPriority ?? false,
            defaultTimeout: config.defaultTimeout || 10000,
            maxRetries: config.maxRetries || 3,
        };
        this.monitoring = monitoring;
        this.deliveryTracking = deliveryTracking;
    }
    /**
     * Check if Slack message should be sent for this notification
     */
    shouldSendSlack(notification, slackConfig) {
        if (!this.config.enabled) {
            return false;
        }
        if (!slackConfig.webhookUrl) {
            return false;
        }
        // Check notification type
        if (this.config.sendForTypes && !this.config.sendForTypes.includes(notification.type)) {
            return false;
        }
        // Skip low priority if configured
        if (this.config.skipForLowPriority && notification.priority === 'low') {
            return false;
        }
        return true;
    }
    /**
     * Send Slack notification
     * This is called when a notification is created
     */
    async sendSlackNotification(notification, slackConfig) {
        if (!this.shouldSendSlack(notification, slackConfig)) {
            // Record skipped attempt
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'slack',
                        status: 'pending',
                        error: 'Slack notification skipped by configuration',
                    });
                }
                catch (error) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(error, {
                        operation: 'slack_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            return { success: false, error: 'Slack notification skipped' };
        }
        // Check if we should retry
        if (this.deliveryTracking && !this.deliveryTracking.shouldRetry(notification, 'slack')) {
            return { success: false, error: 'Slack notification not ready for retry or max attempts reached' };
        }
        try {
            const payload = this.buildSlackPayload(notification, slackConfig);
            // Record attempt as sent
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'slack',
                        status: 'sent',
                        metadata: {
                            webhookUrl: slackConfig.webhookUrl,
                            channel: slackConfig.channel,
                        },
                    });
                }
                catch (error) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(error, {
                        operation: 'slack_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            const timeout = this.config.defaultTimeout || 10000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(slackConfig.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                // Slack returns 'ok' as plain text for successful webhooks
                const responseText = await response.text();
                if (response.ok && responseText === 'ok') {
                    // Record successful delivery
                    if (this.deliveryTracking) {
                        try {
                            const messageTs = response.headers.get('x-slack-req-id') || undefined;
                            await this.deliveryTracking.recordAttempt(notification, {
                                channel: 'slack',
                                status: 'delivered',
                                metadata: {
                                    webhookUrl: slackConfig.webhookUrl,
                                    channel: slackConfig.channel,
                                    messageTs,
                                    statusCode: response.status,
                                },
                            });
                        }
                        catch (error) {
                            // Don't fail if tracking fails
                            this.monitoring.trackException(error, {
                                operation: 'slack_notification.tracking',
                                notificationId: notification.id,
                            });
                        }
                    }
                    const messageTs = response.headers.get('x-slack-req-id') || undefined;
                    this.monitoring.trackEvent('slack_notification.sent', {
                        notificationId: notification.id,
                        notificationType: notification.type,
                        statusCode: response.status,
                        messageTs,
                    });
                    return { success: true, statusCode: response.status, messageTs };
                }
                else {
                    // Record failed delivery
                    const errorMessage = `HTTP ${response.status}: ${responseText}`;
                    if (this.deliveryTracking) {
                        try {
                            await this.deliveryTracking.recordAttempt(notification, {
                                channel: 'slack',
                                status: 'failed',
                                error: errorMessage,
                                metadata: {
                                    webhookUrl: slackConfig.webhookUrl,
                                    channel: slackConfig.channel,
                                    statusCode: response.status,
                                },
                            });
                        }
                        catch (error) {
                            // Don't fail if tracking fails
                            this.monitoring.trackException(error, {
                                operation: 'slack_notification.tracking',
                                notificationId: notification.id,
                            });
                        }
                    }
                    this.monitoring.trackEvent('slack_notification.failed', {
                        notificationId: notification.id,
                        statusCode: response.status,
                        error: errorMessage,
                    });
                    return { success: false, error: errorMessage, statusCode: response.status };
                }
            }
            catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    const errorMessage = `Request timeout after ${timeout}ms`;
                    if (this.deliveryTracking) {
                        try {
                            await this.deliveryTracking.recordAttempt(notification, {
                                channel: 'slack',
                                status: 'failed',
                                error: errorMessage,
                                metadata: {
                                    webhookUrl: slackConfig.webhookUrl,
                                    channel: slackConfig.channel,
                                },
                            });
                        }
                        catch (error) {
                            // Don't fail if tracking fails
                            this.monitoring.trackException(error, {
                                operation: 'slack_notification.tracking',
                                notificationId: notification.id,
                            });
                        }
                    }
                    return { success: false, error: errorMessage };
                }
                throw fetchError;
            }
        }
        catch (error) {
            // Record failed delivery
            const errorMessage = error.message;
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'slack',
                        status: 'failed',
                        error: errorMessage,
                        metadata: {
                            webhookUrl: slackConfig.webhookUrl,
                            channel: slackConfig.channel,
                        },
                    });
                }
                catch (trackingError) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(trackingError, {
                        operation: 'slack_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            this.monitoring.trackException(error, {
                operation: 'slack_notification.send',
                notificationId: notification.id,
            });
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Build Slack message payload with Block Kit formatting
     */
    buildSlackPayload(notification, slackConfig) {
        const blocks = [];
        // Header block with notification type and name
        const typeEmoji = this.getTypeEmoji(notification.type);
        blocks.push({
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${typeEmoji} ${notification.name}`,
                emoji: true,
            },
        });
        // Content block
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: notification.content,
            },
        });
        // Fields block with metadata
        const fields = [
            {
                type: 'mrkdwn',
                text: `*Type:*\n${notification.type}`,
            },
        ];
        if (notification.priority) {
            fields.push({
                type: 'mrkdwn',
                text: `*Priority:*\n${notification.priority}`,
            });
        }
        if (notification.link) {
            fields.push({
                type: 'mrkdwn',
                text: `*Link:*\n<${notification.link}|View Details>`,
            });
        }
        if (fields.length > 1) {
            blocks.push({
                type: 'section',
                fields,
            });
        }
        // Link button if available
        if (notification.link) {
            blocks.push({
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Details',
                        },
                        url: notification.link,
                        style: this.getButtonStyle(notification.type),
                    },
                ],
            });
        }
        // Divider
        blocks.push({
            type: 'divider',
        });
        // Footer with timestamp
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Created: <!date^${Math.floor(new Date(notification.createdAt).getTime() / 1000)}^{date_short_pretty} at {time_secs}|${notification.createdAt}>`,
                },
            ],
        });
        const payload = {
            text: `${typeEmoji} ${notification.name}: ${notification.content}`, // Fallback text
            blocks,
        };
        // Add optional overrides
        if (slackConfig.channel) {
            payload.channel = slackConfig.channel;
        }
        if (slackConfig.username) {
            payload.username = slackConfig.username;
        }
        if (slackConfig.iconEmoji) {
            payload.icon_emoji = slackConfig.iconEmoji;
        }
        if (slackConfig.iconUrl) {
            payload.icon_url = slackConfig.iconUrl;
        }
        return payload;
    }
    /**
     * Get emoji for notification type
     */
    getTypeEmoji(type) {
        const emojis = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            information: 'ℹ️',
            alert: '🚨',
        };
        return emojis[type] || '📢';
    }
    /**
     * Get button style for notification type
     */
    getButtonStyle(type) {
        if (type === 'error' || type === 'alert') {
            return 'danger';
        }
        if (type === 'success') {
            return 'primary';
        }
        return undefined;
    }
}
//# sourceMappingURL=slack-notification.service.js.map