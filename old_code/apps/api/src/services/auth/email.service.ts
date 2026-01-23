import { Resend } from 'resend';
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
export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;
  private isInitialized: boolean = false;
  private monitoring?: IMonitoringProvider;

  constructor(config: EmailConfig, monitoring?: IMonitoringProvider) {
    this.monitoring = monitoring;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'Castiel';
    
    if (config.apiKey) {
      this.resend = new Resend(config.apiKey);
      this.isInitialized = true;
    } else {
      this.monitoring?.trackEvent('email.service.disabled', { reason: 'api-key-not-provided' });
    }
  }

  /**
   * Send verification email with token link
   */
  async sendVerificationEmail(to: string, verificationToken: string, baseUrl: string): Promise<void> {
    if (!this.isInitialized || !this.resend) {
      this.monitoring?.trackEvent('email.service.skipped', { reason: 'not-initialized', email: to });
      return;
    }

    const verificationUrl = `${baseUrl}/auth/verify-email/${verificationToken}`;
    
    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: 'Verify your email address',
        text: `Welcome to Castiel! Please verify your email address by clicking this link: ${verificationUrl}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify your email</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Castiel!</h1>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Thank you for registering. Please verify your email address by clicking the button below:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" 
                     style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Verify Email Address
                  </a>
                </div>
                <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
                  If the button doesn't work, copy and paste this link into your browser:
                  <br>
                  <a href="${verificationUrl}" style="color: #3498db; word-break: break-all;">${verificationUrl}</a>
                </p>
                <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
                  This link will expire in 24 hours.
                </p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                <p style="font-size: 12px; color: #95a5a6;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
      });
      this.monitoring?.trackEvent('email.service.verification-sent', { email: to });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'email.service.send-verification', email: to });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordResetEmail(to: string, resetToken: string, baseUrl: string): Promise<void> {
    if (!this.isInitialized || !this.resend) {
      this.monitoring?.trackEvent('email.service.skipped', { reason: 'not-initialized', type: 'password-reset', email: to });
      return;
    }

    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: 'Reset your password',
        text: `You requested a password reset. Click this link to reset your password: ${resetUrl}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset your password</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h1 style="color: #2c3e50; margin-bottom: 20px;">Password Reset Request</h1>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  We received a request to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
                  If the button doesn't work, copy and paste this link into your browser:
                  <br>
                  <a href="${resetUrl}" style="color: #e74c3c; word-break: break-all;">${resetUrl}</a>
                </p>
                <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
                  This link will expire in 1 hour.
                </p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                <p style="font-size: 12px; color: #95a5a6;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
            </body>
          </html>
        `,
      });
      this.monitoring?.trackEvent('email.service.password-reset-sent', { email: to });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'email.service.send-password-reset', email: to });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    if (!this.isInitialized || !this.resend) {
      this.monitoring?.trackEvent('email.service.skipped', { reason: 'not-initialized', type: 'welcome', email: to });
      return;
    }

    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: 'Welcome to Castiel!',
        text: `Hi ${name}, welcome to Castiel! Your account is now active.`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Castiel</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Castiel, ${name}!</h1>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Your account is now active and ready to use. We're excited to have you on board!
                </p>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  If you have any questions or need assistance, feel free to reach out to our support team.
                </p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                <p style="font-size: 12px; color: #95a5a6;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </body>
          </html>
        `,
      });
      this.monitoring?.trackEvent('email.service.welcome-sent', { email: to });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'email.service.send-welcome', email: to });
      // Don't throw here - welcome email is not critical
    }
  }

  /**
   * Send magic link email for passwordless login
   */
  async sendMagicLinkEmail(to: string, magicLinkUrl: string, name?: string): Promise<void> {
    if (!this.isInitialized || !this.resend) {
      this.monitoring?.trackEvent('email.service.skipped', { reason: 'not-initialized', type: 'magic-link', email: to });
      return;
    }

    const displayName = name || 'there';

    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: 'Sign in to Castiel',
        text: `Hi ${displayName},\n\nClick this link to sign in to Castiel:\n${magicLinkUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this link, you can safely ignore this email.`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Sign in to Castiel</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h1 style="color: #2c3e50; margin-bottom: 20px;">Sign in to Castiel</h1>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Hi ${displayName},
                </p>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Click the button below to sign in to your Castiel account. No password needed!
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${magicLinkUrl}" 
                     style="background-color: #8b5cf6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                    ✨ Sign In Now
                  </a>
                </div>
                <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
                  If the button doesn't work, copy and paste this link into your browser:
                  <br>
                  <a href="${magicLinkUrl}" style="color: #8b5cf6; word-break: break-all;">${magicLinkUrl}</a>
                </p>
                <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">
                  ⏰ This link will expire in <strong>15 minutes</strong>.
                </p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                <p style="font-size: 12px; color: #95a5a6;">
                  If you didn't request this sign-in link, you can safely ignore this email. Your account is still secure.
                </p>
              </div>
            </body>
          </html>
        `,
      });
      this.monitoring?.trackEvent('email.service.magic-link-sent', { email: to });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'email.service.send-magic-link', email: to });
      throw new Error('Failed to send magic link email');
    }
  }

  /**
   * Check if email service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Send generic email (for MFA codes, etc.)
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!this.isInitialized || !this.resend) {
      this.monitoring?.trackEvent('email.service.skipped', { reason: 'not-initialized', type: 'generic', email: options.to });
      return;
    }

    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br>'),
      });
      this.monitoring?.trackEvent('email.service.generic-sent', { email: options.to });
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'email.service.send-generic', email: options.to });
      throw new Error('Failed to send email');
    }
  }
}
