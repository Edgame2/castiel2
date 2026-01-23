// @ts-nocheck - Optional dependency, not used by workers-sync
/**
 * Push Notification Service
 *
 * Handles sending web push notifications to user devices.
 * Supports Web Push API with VAPID authentication.
 * Integrates with DeliveryTrackingService for delivery tracking and retry logic.
 */
/**
 * Push Notification Service
 * Sends push notifications when in-app notifications are created
 */
export class PushNotificationService {
    config;
    monitoring;
    deliveryTracking;
    webPush; // Lazy-loaded web-push library
    constructor(config, monitoring, deliveryTracking) {
        this.config = {
            enabled: config.enabled,
            sendForTypes: config.sendForTypes || ['success', 'error', 'warning', 'information', 'alert'],
            skipForLowPriority: config.skipForLowPriority ?? false,
            vapidPublicKey: config.vapidPublicKey,
            vapidPrivateKey: config.vapidPrivateKey,
            vapidSubject: config.vapidSubject || 'mailto:notifications@castiel.ai',
        };
        this.monitoring = monitoring;
        this.deliveryTracking = deliveryTracking;
    }
    /**
     * Initialize web-push library (lazy load)
     */
    async getWebPush() {
        if (this.webPush) {
            return this.webPush;
        }
        try {
            // Dynamic import to avoid requiring web-push as a hard dependency
            // Note: web-push must be installed: pnpm add web-push
            // web-push may not be installed, handled gracefully
            try {
                const webPushModule = await import('web-push');
                this.webPush = (webPushModule.default || webPushModule);
            }
            catch (error) {
                throw new Error('web-push module not installed. Install with: pnpm add web-push');
            }
            // Set VAPID details if available
            if (this.config.vapidPublicKey && this.config.vapidPrivateKey) {
                this.webPush.setVapidDetails(this.config.vapidSubject || 'mailto:notifications@castiel.ai', this.config.vapidPublicKey, this.config.vapidPrivateKey);
            }
            return this.webPush;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'push_notification.init',
                error: 'web-push library not available',
            });
            throw new Error('web-push library not available. Install with: pnpm add web-push');
        }
    }
    /**
     * Check if push should be sent for this notification
     */
    shouldSendPush(notification, pushConfig) {
        if (!this.config.enabled) {
            return false;
        }
        if (!pushConfig.devices || pushConfig.devices.length === 0) {
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
        // Check if VAPID keys are configured
        if (!this.config.vapidPublicKey || !this.config.vapidPrivateKey) {
            this.monitoring.trackEvent('push_notification.skipped', {
                reason: 'vapid_keys_not_configured',
                notificationId: notification.id,
            });
            return false;
        }
        return true;
    }
    /**
     * Send push notification to user's devices
     */
    async sendPushNotification(notification, pushConfig) {
        if (!this.shouldSendPush(notification, pushConfig)) {
            // Record skipped attempt
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'push',
                        status: 'pending',
                        error: 'Push notification skipped by configuration',
                    });
                }
                catch (error) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(error, {
                        operation: 'push_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            return { success: false, error: 'Push notification skipped', sentCount: 0, failedCount: 0 };
        }
        // Check if we should retry
        if (this.deliveryTracking && !this.deliveryTracking.shouldRetry(notification, 'push')) {
            return { success: false, error: 'Push notification not ready for retry or max attempts reached', sentCount: 0, failedCount: 0 };
        }
        try {
            const webPush = await this.getWebPush();
            const payload = this.buildPushPayload(notification);
            let sentCount = 0;
            let failedCount = 0;
            const errors = [];
            // Record attempt as sent
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'push',
                        status: 'sent',
                        metadata: {
                            deviceCount: pushConfig.devices.length,
                        },
                    });
                }
                catch (error) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(error, {
                        operation: 'push_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            // Send to all devices
            const sendPromises = pushConfig.devices.map(async (device) => {
                try {
                    const subscription = {
                        endpoint: device.endpoint,
                        keys: {
                            p256dh: device.keys.p256dh,
                            auth: device.keys.auth,
                        },
                    };
                    await webPush.sendNotification(subscription, JSON.stringify(payload), {
                        TTL: 3600, // 1 hour TTL
                        urgency: notification.priority === 'high' ? 'high' : 'normal',
                    });
                    sentCount++;
                    return { success: true, device };
                }
                catch (error) {
                    failedCount++;
                    const errorMessage = error.message || String(error);
                    errors.push(`Device ${device.endpoint.substring(0, 20)}...: ${errorMessage}`);
                    // Handle specific error cases
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Subscription expired or invalid - should be removed
                        this.monitoring.trackEvent('push_notification.subscription_invalid', {
                            notificationId: notification.id,
                            deviceEndpoint: device.endpoint.substring(0, 50),
                            statusCode: error.statusCode,
                        });
                    }
                    return { success: false, device, error: errorMessage };
                }
            });
            await Promise.allSettled(sendPromises);
            if (sentCount > 0) {
                // Record successful delivery
                if (this.deliveryTracking) {
                    try {
                        await this.deliveryTracking.recordAttempt(notification, {
                            channel: 'push',
                            status: 'delivered',
                            metadata: {
                                sentCount,
                                failedCount,
                                deviceCount: pushConfig.devices.length,
                            },
                        });
                    }
                    catch (error) {
                        // Don't fail if tracking fails
                        this.monitoring.trackException(error, {
                            operation: 'push_notification.tracking',
                            notificationId: notification.id,
                        });
                    }
                }
                this.monitoring.trackEvent('push_notification.sent', {
                    notificationId: notification.id,
                    notificationType: notification.type,
                    sentCount,
                    failedCount,
                });
            }
            if (failedCount > 0 && sentCount === 0) {
                // All devices failed
                const errorMessage = `All push notifications failed: ${errors.join('; ')}`;
                if (this.deliveryTracking) {
                    try {
                        await this.deliveryTracking.recordAttempt(notification, {
                            channel: 'push',
                            status: 'failed',
                            error: errorMessage,
                            metadata: {
                                sentCount: 0,
                                failedCount,
                                deviceCount: pushConfig.devices.length,
                            },
                        });
                    }
                    catch (error) {
                        // Don't fail if tracking fails
                        this.monitoring.trackException(error, {
                            operation: 'push_notification.tracking',
                            notificationId: notification.id,
                        });
                    }
                }
                this.monitoring.trackEvent('push_notification.failed', {
                    notificationId: notification.id,
                    error: errorMessage,
                });
                return { success: false, error: errorMessage, sentCount: 0, failedCount };
            }
            // Partial success (some devices succeeded, some failed)
            if (failedCount > 0) {
                this.monitoring.trackEvent('push_notification.partial_success', {
                    notificationId: notification.id,
                    sentCount,
                    failedCount,
                    errorSummary: errors.slice(0, 3).join('; '), // Log first 3 errors as string
                });
            }
            return { success: true, sentCount, failedCount };
        }
        catch (error) {
            // Record failed delivery
            const errorMessage = error.message;
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'push',
                        status: 'failed',
                        error: errorMessage,
                        metadata: {
                            deviceCount: pushConfig.devices.length,
                        },
                    });
                }
                catch (trackingError) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(trackingError, {
                        operation: 'push_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            this.monitoring.trackException(error, {
                operation: 'push_notification.send',
                notificationId: notification.id,
            });
            return { success: false, error: errorMessage, sentCount: 0, failedCount: pushConfig.devices.length };
        }
    }
    /**
     * Build push notification payload
     */
    buildPushPayload(notification) {
        const payload = {
            title: notification.name,
            body: notification.content,
            data: {
                notificationId: notification.id,
                type: notification.type,
                link: notification.link,
                metadata: notification.metadata,
            },
            tag: `notification-${notification.id}`, // Group notifications by ID
        };
        // Add icon based on notification type
        const icons = {
            success: '/icons/notification-success.png',
            error: '/icons/notification-error.png',
            warning: '/icons/notification-warning.png',
            information: '/icons/notification-info.png',
            alert: '/icons/notification-alert.png',
        };
        payload.icon = icons[notification.type] || '/icons/notification-default.png';
        // Add action button if link is available
        if (notification.link) {
            payload.actions = [
                {
                    action: 'open',
                    title: 'View',
                },
            ];
        }
        // Require interaction for high priority
        if (notification.priority === 'high') {
            payload.requireInteraction = true;
        }
        // Silent for low priority
        if (notification.priority === 'low') {
            payload.silent = true;
        }
        return payload;
    }
    /**
     * Get VAPID public key (for frontend subscription)
     */
    getVapidPublicKey() {
        return this.config.vapidPublicKey;
    }
}
//# sourceMappingURL=push-notification.service.js.map