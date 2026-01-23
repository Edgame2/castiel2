/**
 * Email Notification Service
 *
 * Handles sending email notifications for in-app notifications.
 * Integrates with UnifiedEmailService to send emails when notifications are created.
 */
import { UnifiedEmailService } from '../email/email.service.js';
import { Notification, NotificationType } from '../../types/notification.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { DeliveryTrackingService } from './delivery-tracking.service.js';
export interface EmailNotificationConfig {
    enabled: boolean;
    sendForTypes?: NotificationType[];
    skipForLowPriority?: boolean;
    baseUrl?: string;
}
/**
 * Email Notification Service
 * Sends email notifications when in-app notifications are created
 */
export declare class EmailNotificationService {
    private emailService;
    private config;
    private monitoring;
    private deliveryTracking?;
    constructor(emailService: UnifiedEmailService, config: EmailNotificationConfig, monitoring: IMonitoringProvider, deliveryTracking?: DeliveryTrackingService);
    /**
     * Check if email should be sent for this notification
     */
    private shouldSendEmail;
    /**
     * Send email notification
     * This is called when a notification is created
     */
    sendEmailNotification(notification: Notification, userEmail: string, userName?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Build email subject from notification
     */
    private buildEmailSubject;
    /**
     * Build email content (text and HTML) from notification
     */
    private buildEmailContent;
    /**
     * Get human-readable label for notification type
     */
    private getTypeLabel;
    /**
     * Escape HTML for safe rendering
     */
    private escapeHtml;
}
//# sourceMappingURL=email-notification.service.d.ts.map