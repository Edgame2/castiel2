/**
 * Unified Email Service
 * Provides a consistent API for sending emails with multiple provider support
 */
import type { IEmailProvider, EmailMessage, SendEmailResult } from './email-provider.interface.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
export type EmailProvider = 'console' | 'resend' | 'azure-acs' | 'custom';
export interface EmailServiceConfig {
    provider: EmailProvider;
    fromEmail: string;
    fromName?: string;
    resend?: {
        apiKey: string;
    };
    azureAcs?: {
        connectionString: string;
    };
    custom?: IEmailProvider;
}
/**
 * Email Templates
 */
export interface EmailTemplates {
    verification: (data: {
        verificationUrl: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    passwordReset: (data: {
        resetUrl: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    welcome: (data: {
        name: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    invitation: (data: {
        inviterName: string;
        tenantName: string;
        inviteUrl: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    joinRequestApproved: (data: {
        tenantName: string;
        loginUrl: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    joinRequestRejected: (data: {
        tenantName: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    mfaCode: (data: {
        code: string;
        expiresIn: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
    securityAlert: (data: {
        alertType: string;
        details: string;
        timestamp: string;
    }) => {
        subject: string;
        text: string;
        html: string;
    };
}
/**
 * Unified Email Service
 */
export declare class UnifiedEmailService {
    private provider;
    private templates;
    private fromEmail;
    private fromName;
    private monitoring?;
    constructor(config: EmailServiceConfig, customTemplates?: Partial<EmailTemplates>, monitoring?: IMonitoringProvider);
    private createProvider;
    /**
     * Check if email service is ready
     */
    isReady(): boolean;
    /**
     * Get the current provider name
     */
    getProviderName(): string;
    /**
     * Send a raw email message
     */
    send(message: EmailMessage): Promise<SendEmailResult>;
    /**
     * Send verification email
     */
    sendVerificationEmail(to: string, verificationToken: string, baseUrl: string): Promise<SendEmailResult>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(to: string, resetToken: string, baseUrl: string): Promise<SendEmailResult>;
    /**
     * Send welcome email
     */
    sendWelcomeEmail(to: string, name: string): Promise<SendEmailResult>;
    /**
     * Send invitation email
     */
    sendInvitationEmail(to: string, inviterName: string, tenantName: string, inviteToken: string, baseUrl: string): Promise<SendEmailResult>;
    /**
     * Send join request approved email
     */
    sendJoinRequestApprovedEmail(to: string, tenantName: string, baseUrl: string): Promise<SendEmailResult>;
    /**
     * Send join request rejected email
     */
    sendJoinRequestRejectedEmail(to: string, tenantName: string): Promise<SendEmailResult>;
    /**
     * Send MFA code email
     */
    sendMFACodeEmail(to: string, code: string, expiresIn?: string): Promise<SendEmailResult>;
    /**
     * Send security alert email
     */
    sendSecurityAlertEmail(to: string, alertType: string, details: string): Promise<SendEmailResult>;
    /**
     * Send generic email (backward compatibility)
     */
    sendEmail(options: {
        to: string;
        subject: string;
        text: string;
        html?: string;
    }): Promise<void>;
}
//# sourceMappingURL=email.service.d.ts.map