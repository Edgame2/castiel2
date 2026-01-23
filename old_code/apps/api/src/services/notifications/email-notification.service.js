/**
 * Email Notification Service
 *
 * Handles sending email notifications for in-app notifications.
 * Integrates with UnifiedEmailService to send emails when notifications are created.
 */
/**
 * Email Notification Service
 * Sends email notifications when in-app notifications are created
 */
export class EmailNotificationService {
    emailService;
    config;
    monitoring;
    deliveryTracking;
    constructor(emailService, config, monitoring, deliveryTracking) {
        this.emailService = emailService;
        this.config = {
            enabled: config.enabled,
            sendForTypes: config.sendForTypes || ['success', 'error', 'warning', 'information', 'alert'],
            skipForLowPriority: config.skipForLowPriority ?? false,
            baseUrl: config.baseUrl || 'https://app.castiel.ai',
        };
        this.monitoring = monitoring;
        this.deliveryTracking = deliveryTracking;
    }
    /**
     * Check if email should be sent for this notification
     */
    shouldSendEmail(notification) {
        if (!this.config.enabled) {
            return false;
        }
        // Check if email service is ready
        if (!this.emailService.isReady()) {
            this.monitoring.trackEvent('email_notification.skipped', {
                reason: 'email_service_not_ready',
                notificationId: notification.id,
            });
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
     * Send email notification
     * This is called when a notification is created
     */
    async sendEmailNotification(notification, userEmail, userName) {
        if (!this.shouldSendEmail(notification)) {
            // Record skipped attempt
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'email',
                        status: 'pending',
                        error: 'Email notification skipped by configuration',
                    });
                }
                catch (error) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(error, {
                        operation: 'email_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            return { success: false, error: 'Email notification skipped' };
        }
        // Check if we should retry
        if (this.deliveryTracking && !this.deliveryTracking.shouldRetry(notification, 'email')) {
            return { success: false, error: 'Email notification not ready for retry or max attempts reached' };
        }
        try {
            const subject = this.buildEmailSubject(notification);
            const { text, html } = this.buildEmailContent(notification, userName);
            // Record attempt as sent
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'email',
                        status: 'sent',
                        metadata: {
                            recipient: userEmail,
                        },
                    });
                    // Get updated notification with delivery tracking
                    const updated = await this.deliveryTracking.getDeliveryStatus(notification, 'email');
                    if (updated.length > 0 && updated[0].metadata?.messageId) {
                        // Use messageId from tracking if available
                    }
                }
                catch (error) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(error, {
                        operation: 'email_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            const result = await this.emailService.send({
                to: userEmail,
                subject,
                text,
                html,
            });
            if (result.success) {
                // Record successful delivery
                if (this.deliveryTracking) {
                    try {
                        await this.deliveryTracking.recordAttempt(notification, {
                            channel: 'email',
                            status: 'delivered',
                            metadata: {
                                messageId: result.messageId,
                                recipient: userEmail,
                            },
                        });
                    }
                    catch (error) {
                        // Don't fail if tracking fails
                        this.monitoring.trackException(error, {
                            operation: 'email_notification.tracking',
                            notificationId: notification.id,
                        });
                    }
                }
                this.monitoring.trackEvent('email_notification.sent', {
                    notificationId: notification.id,
                    notificationType: notification.type,
                    priority: notification.priority,
                    messageId: result.messageId,
                });
                return { success: true };
            }
            else {
                // Record failed delivery
                if (this.deliveryTracking) {
                    try {
                        await this.deliveryTracking.recordAttempt(notification, {
                            channel: 'email',
                            status: 'failed',
                            error: result.error,
                        });
                    }
                    catch (trackingError) {
                        // Don't fail if tracking fails
                        this.monitoring.trackException(trackingError, {
                            operation: 'email_notification.tracking',
                            notificationId: notification.id,
                        });
                    }
                }
                this.monitoring.trackEvent('email_notification.failed', {
                    notificationId: notification.id,
                    error: result.error,
                });
                return { success: false, error: result.error };
            }
        }
        catch (error) {
            // Record failed delivery
            if (this.deliveryTracking) {
                try {
                    await this.deliveryTracking.recordAttempt(notification, {
                        channel: 'email',
                        status: 'failed',
                        error: error.message,
                    });
                }
                catch (trackingError) {
                    // Don't fail if tracking fails
                    this.monitoring.trackException(trackingError, {
                        operation: 'email_notification.tracking',
                        notificationId: notification.id,
                    });
                }
            }
            this.monitoring.trackException(error, {
                operation: 'email_notification.send',
                notificationId: notification.id,
            });
            return { success: false, error: error.message };
        }
    }
    /**
     * Build email subject from notification
     */
    buildEmailSubject(notification) {
        // Use notification name as subject, or generate from type
        if (notification.name) {
            return notification.name;
        }
        // Fallback to type-based subject
        const typeSubjects = {
            success: 'Success Notification',
            error: 'Error Notification',
            warning: 'Warning Notification',
            information: 'Information',
            alert: 'Alert',
        };
        return typeSubjects[notification.type] || 'Notification';
    }
    /**
     * Build email content (text and HTML) from notification
     */
    buildEmailContent(notification, userName) {
        const greeting = userName ? `Hi ${userName},` : 'Hi,';
        const linkText = notification.link ? 'View Details' : null;
        const linkUrl = notification.link
            ? notification.link.startsWith('http')
                ? notification.link
                : `${this.config.baseUrl}${notification.link}`
            : null;
        // Plain text version
        const text = `
${greeting}

${notification.content}

${linkText && linkUrl ? `\n${linkText}: ${linkUrl}` : ''}

---
This is an automated notification from Castiel.
    `.trim();
        // HTML version
        const typeColors = {
            success: { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', text: '#11998e' },
            error: { bg: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)', text: '#f5576c' },
            warning: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: '#f5576c' },
            information: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: '#4facfe' },
            alert: { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', text: '#fa709a' },
        };
        const colors = typeColors[notification.type] || typeColors.information;
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: ${colors.bg}; padding: 40px; border-radius: 12px; text-align: center;">
      <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">${notification.name || 'Notification'}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">${this.getTypeLabel(notification.type)}</p>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
      <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${colors.text};">
        <p style="font-size: 16px; margin: 0; white-space: pre-wrap;">${this.escapeHtml(notification.content)}</p>
      </div>
      ${linkText && linkUrl
            ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${linkUrl}" style="background: ${colors.bg}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">${linkText}</a>
      </div>
      `
            : ''}
      <p style="font-size: 13px; color: #999; margin-top: 30px; text-align: center;">This is an automated notification from Castiel.</p>
    </div>
  </body>
</html>
    `.trim();
        return { text, html };
    }
    /**
     * Get human-readable label for notification type
     */
    getTypeLabel(type) {
        const labels = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            information: 'Information',
            alert: 'Alert',
        };
        return labels[type] || 'Notification';
    }
    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}
//# sourceMappingURL=email-notification.service.js.map