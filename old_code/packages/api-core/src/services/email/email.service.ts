/**
 * Unified Email Service
 * Provides a consistent API for sending emails with multiple provider support
 */

import type {
  IEmailProvider,
  EmailMessage,
  SendEmailResult,
  EmailProviderConfig,
} from './email-provider.interface.js';
import { ConsoleEmailProvider } from './providers/console.provider.js';
import { ResendEmailProvider, type ResendConfig } from './providers/resend.provider.js';
import { AzureACSEmailProvider, type AzureACSConfig } from './providers/azure-acs.provider.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

export type EmailProvider = 'console' | 'resend' | 'azure-acs' | 'custom';

export interface EmailServiceConfig {
  provider: EmailProvider;
  fromEmail: string;
  fromName?: string;
  // Provider-specific settings
  resend?: { apiKey: string };
  azureAcs?: { connectionString: string };
  custom?: IEmailProvider;
}

/**
 * Email Templates
 */
export interface EmailTemplates {
  verification: (data: { verificationUrl: string }) => { subject: string; text: string; html: string };
  passwordReset: (data: { resetUrl: string }) => { subject: string; text: string; html: string };
  welcome: (data: { name: string }) => { subject: string; text: string; html: string };
  invitation: (data: { inviterName: string; tenantName: string; inviteUrl: string }) => { subject: string; text: string; html: string };
  joinRequestApproved: (data: { tenantName: string; loginUrl: string }) => { subject: string; text: string; html: string };
  joinRequestRejected: (data: { tenantName: string }) => { subject: string; text: string; html: string };
  mfaCode: (data: { code: string; expiresIn: string }) => { subject: string; text: string; html: string };
  securityAlert: (data: { alertType: string; details: string; timestamp: string }) => { subject: string; text: string; html: string };
}

/**
 * Default email templates
 */
const defaultTemplates: EmailTemplates = {
  verification: ({ verificationUrl }) => ({
    subject: 'Verify your email address',
    text: `Welcome to Castiel! Please verify your email address by clicking this link: ${verificationUrl}\n\nThis link will expire in 24 hours.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Welcome to Castiel!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Please verify your email address</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 25px;">Thank you for registering. Click the button below to verify your email:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Verify Email Address</a>
            </div>
            <p style="font-size: 13px; color: #666; margin-top: 30px;">Or copy this link: <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a></p>
            <p style="font-size: 13px; color: #999; margin-top: 20px;">This link expires in 24 hours.</p>
          </div>
        </body>
      </html>
    `,
  }),

  passwordReset: ({ resetUrl }) => ({
    subject: 'Reset your password',
    text: `You requested a password reset. Click this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Password Reset</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">We received a request to reset your password</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 25px;">Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            <p style="font-size: 13px; color: #666; margin-top: 30px;">Or copy this link: <a href="${resetUrl}" style="color: #f5576c; word-break: break-all;">${resetUrl}</a></p>
            <p style="font-size: 13px; color: #999; margin-top: 20px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  }),

  welcome: ({ name }) => ({
    subject: 'Welcome to Castiel!',
    text: `Hi ${name}, welcome to Castiel! Your account is now active and ready to use.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Welcome, ${name}!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your account is now active</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">We're excited to have you on board! Your Castiel account is ready to use.</p>
            <p style="font-size: 16px; margin-bottom: 20px;">If you have any questions, our support team is here to help.</p>
          </div>
        </body>
      </html>
    `,
  }),

  invitation: ({ inviterName, tenantName, inviteUrl }) => ({
    subject: `${inviterName} invited you to join ${tenantName}`,
    text: `${inviterName} has invited you to join ${tenantName} on Castiel.\n\nClick this link to accept the invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">You're Invited!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Join ${tenantName} on Castiel</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 25px;"><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Accept Invitation</a>
            </div>
            <p style="font-size: 13px; color: #999; margin-top: 20px;">This invitation expires in 7 days.</p>
          </div>
        </body>
      </html>
    `,
  }),

  joinRequestApproved: ({ tenantName, loginUrl }) => ({
    subject: `Your request to join ${tenantName} has been approved`,
    text: `Good news! Your request to join ${tenantName} has been approved. You can now log in: ${loginUrl}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Request Approved! ✓</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Welcome to ${tenantName}</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 25px;">Your request to join <strong>${tenantName}</strong> has been approved. You can now log in to access your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Log In Now</a>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  joinRequestRejected: ({ tenantName }) => ({
    subject: `Your request to join ${tenantName} was not approved`,
    text: `Unfortunately, your request to join ${tenantName} was not approved at this time. If you believe this is an error, please contact the organization administrator.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #6c757d; padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Request Not Approved</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">${tenantName}</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Unfortunately, your request to join <strong>${tenantName}</strong> was not approved at this time.</p>
            <p style="font-size: 16px; margin-bottom: 20px;">If you believe this is an error, please contact the organization administrator.</p>
          </div>
        </body>
      </html>
    `,
  }),

  mfaCode: ({ code, expiresIn }) => ({
    subject: 'Your verification code',
    text: `Your verification code is: ${code}\n\nThis code expires in ${expiresIn}. If you didn't request this code, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Verification Code</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="font-size: 16px; margin-bottom: 25px;">Your verification code is:</p>
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #999; margin-top: 20px;">This code expires in ${expiresIn}.</p>
          </div>
        </body>
      </html>
    `,
  }),

  securityAlert: ({ alertType, details, timestamp }) => ({
    subject: `Security Alert: ${alertType}`,
    text: `Security Alert: ${alertType}\n\nDetails: ${details}\nTime: ${timestamp}\n\nIf this was you, you can ignore this email. Otherwise, please secure your account immediately.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%); padding: 40px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">⚠️ Security Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">${alertType}</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;"><strong>Details:</strong> ${details}</p>
            <p style="font-size: 14px; color: #666;"><strong>Time:</strong> ${timestamp}</p>
            <p style="font-size: 14px; color: #999; margin-top: 20px;">If this was you, you can ignore this email. Otherwise, please secure your account immediately.</p>
          </div>
        </body>
      </html>
    `,
  }),
};

/**
 * Unified Email Service
 */
export class UnifiedEmailService {
  private provider: IEmailProvider;
  private templates: EmailTemplates;
  private fromEmail: string;
  private fromName: string;
  private monitoring?: IMonitoringProvider;

  constructor(config: EmailServiceConfig, customTemplates?: Partial<EmailTemplates>, monitoring?: IMonitoringProvider) {
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'Castiel';
    this.templates = { ...defaultTemplates, ...customTemplates };
    this.monitoring = monitoring;

    // Initialize provider based on config
    this.provider = this.createProvider(config);
  }

  private createProvider(config: EmailServiceConfig): IEmailProvider {
    const baseConfig: EmailProviderConfig = {
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      monitoring: this.monitoring,
    };

    switch (config.provider) {
      case 'azure-acs':
        if (!config.azureAcs?.connectionString) {
          this.monitoring?.trackEvent('email-service.fallback', {
            provider: 'azure-acs',
            reason: 'missing-connection-string',
            fallbackTo: 'console',
          });
          return new ConsoleEmailProvider(baseConfig);
        }
        return new AzureACSEmailProvider({
          ...baseConfig,
          connectionString: config.azureAcs.connectionString,
        });

      case 'resend':
        if (!config.resend?.apiKey) {
          this.monitoring?.trackEvent('email-service.fallback', {
            provider: 'resend',
            reason: 'missing-api-key',
            fallbackTo: 'console',
          });
          return new ConsoleEmailProvider(baseConfig);
        }
        return new ResendEmailProvider({
          ...baseConfig,
          apiKey: config.resend.apiKey,
        });

      case 'custom':
        if (!config.custom) {
          this.monitoring?.trackEvent('email-service.fallback', {
            provider: 'custom',
            reason: 'missing-custom-provider',
            fallbackTo: 'console',
          });
          return new ConsoleEmailProvider(baseConfig);
        }
        return config.custom;

      case 'console':
      default:
        return new ConsoleEmailProvider(baseConfig);
    }
  }

  /**
   * Check if email service is ready
   */
  isReady(): boolean {
    return this.provider.isReady();
  }

  /**
   * Get the current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Send a raw email message
   */
  async send(message: EmailMessage): Promise<SendEmailResult> {
    return this.provider.send(message);
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, verificationToken: string, baseUrl: string): Promise<SendEmailResult> {
    const verificationUrl = `${baseUrl}/auth/verify-email/${verificationToken}`;
    const template = this.templates.verification({ verificationUrl });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string, baseUrl: string): Promise<SendEmailResult> {
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const template = this.templates.passwordReset({ resetUrl });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<SendEmailResult> {
    const template = this.templates.welcome({ name });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(
    to: string,
    inviterName: string,
    tenantName: string,
    inviteToken: string,
    baseUrl: string
  ): Promise<SendEmailResult> {
    const inviteUrl = `${baseUrl}/invitations/${inviteToken}`;
    const template = this.templates.invitation({ inviterName, tenantName, inviteUrl });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send join request approved email
   */
  async sendJoinRequestApprovedEmail(to: string, tenantName: string, baseUrl: string): Promise<SendEmailResult> {
    const loginUrl = `${baseUrl}/login`;
    const template = this.templates.joinRequestApproved({ tenantName, loginUrl });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send join request rejected email
   */
  async sendJoinRequestRejectedEmail(to: string, tenantName: string): Promise<SendEmailResult> {
    const template = this.templates.joinRequestRejected({ tenantName });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send MFA code email
   */
  async sendMFACodeEmail(to: string, code: string, expiresIn: string = '10 minutes'): Promise<SendEmailResult> {
    const template = this.templates.mfaCode({ code, expiresIn });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlertEmail(
    to: string,
    alertType: string,
    details: string
  ): Promise<SendEmailResult> {
    const timestamp = new Date().toISOString();
    const template = this.templates.securityAlert({ alertType, details, timestamp });
    return this.provider.send({ to, ...template });
  }

  /**
   * Send generic email (backward compatibility)
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const result = await this.provider.send(options);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  }
}

