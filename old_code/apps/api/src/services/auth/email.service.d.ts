import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Email service configuration
 */
export interface EmailConfig {
    apiKey: string;
    fromEmail: string;
    fromName?: string;
}
/**
 * Email service for sending transactional emails via Resend
 */
export declare class EmailService {
    private resend;
    private fromEmail;
    private fromName;
    private isInitialized;
    private monitoring?;
    constructor(config: EmailConfig, monitoring?: IMonitoringProvider);
    /**
     * Send verification email with token link
     */
    sendVerificationEmail(to: string, verificationToken: string, baseUrl: string): Promise<void>;
    /**
     * Send password reset email with token
     */
    sendPasswordResetEmail(to: string, resetToken: string, baseUrl: string): Promise<void>;
    /**
     * Send welcome email after successful verification
     */
    sendWelcomeEmail(to: string, name: string): Promise<void>;
    /**
     * Send magic link email for passwordless login
     */
    sendMagicLinkEmail(to: string, magicLinkUrl: string, name?: string): Promise<void>;
    /**
     * Check if email service is initialized
     */
    isReady(): boolean;
    /**
     * Send generic email (for MFA codes, etc.)
     */
    sendEmail(options: {
        to: string;
        subject: string;
        text: string;
        html?: string;
    }): Promise<void>;
}
//# sourceMappingURL=email.service.d.ts.map