/**
 * Email Service
 * 
 * Handles email sending via SendGrid, SMTP, or AWS SES.
 * Provides email templates for authentication events.
 */

import { getDatabaseClient } from '@coder/shared';
import { getConfig } from '../config';

// Simple logger for email service
const log = {
  debug: (message: string, meta?: any) => console.debug(`[EmailService] ${message}`, meta || ''),
  info: (message: string, meta?: any) => console.info(`[EmailService] ${message}`, meta || ''),
  warn: (message: string, error?: any, meta?: any) => {
    console.warn(`[EmailService] ${message}`, error || '', meta || '');
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(`[EmailService] ${message}`, error || '', meta || '');
  },
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  userId?: string;
  organizationId?: string;
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined;
}

export class EmailService {
  private provider: 'sendgrid' | 'smtp' | 'ses';
  private enabled: boolean;
  private fromAddress: string;
  private fromName: string;
  private appUrl: string;

  constructor() {
    const config = getConfig();
    const emailConfig = config.notification.providers.email || {};
    
    // Get provider from config
    const providerEnv = (emailConfig.provider || 'smtp').toLowerCase();
    this.provider = providerEnv === 'sendgrid' ? 'sendgrid' : 
                    providerEnv === 'ses' ? 'ses' : 'smtp';
    
    this.enabled = emailConfig.enabled !== false; // Default enabled
    this.fromAddress = emailConfig.from_address || 'noreply@coder.ide';
    this.fromName = emailConfig.from_name || 'Coder IDE';
    this.appUrl = config.app?.url || 'http://localhost:3000';
  }

  /**
   * Send email using configured provider
   */
  async sendEmail(options: SendEmailOptions): Promise<string | null> {
    if (!this.enabled) {
      log.debug('Email service disabled, skipping email', { to: options.to, subject: options.subject });
      return null;
    }

    try {
      const from = options.from || `${this.fromName} <${this.fromAddress}>`;
      
      let messageId: string | null = null;

      switch (this.provider) {
        case 'sendgrid':
          messageId = await this.sendViaSendGrid({
            ...options,
            from,
          });
          break;
        case 'smtp':
          messageId = await this.sendViaSMTP({
            ...options,
            from,
          });
          break;
        case 'ses':
          messageId = await this.sendViaSES({
            ...options,
            from,
          });
          break;
      }

      log.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        provider: this.provider,
        messageId,
        service: 'notification-manager',
      });

      return messageId;
    } catch (error: any) {
      log.error('Failed to send email', error, {
        to: options.to,
        subject: options.subject,
        provider: this.provider,
        service: 'notification-manager',
      });
      // Don't throw - email failures shouldn't break the notification flow
      return null;
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(options: SendEmailOptions & { from: string }): Promise<string> {
    try {
      const sgMail = await import('@sendgrid/mail');
      
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY environment variable is required');
      }
      
      sgMail.default.setApiKey(apiKey);
      
      const msg = {
        to: options.to,
        from: options.from,
        subject: options.subject,
        html: options.html || '',
        text: options.text || options.html?.replace(/<[^>]*>/g, '') || '',
      };
      
      const [response] = await sgMail.default.send(msg);
      const messageId = response.headers['x-message-id'] || `sg-${Date.now()}`;
      
      return messageId;
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('@sendgrid/mail package is not installed. Run: npm install @sendgrid/mail');
      }
      throw error;
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSMTP(options: SendEmailOptions & { from: string }): Promise<string> {
    try {
      const nodemailer = await import('nodemailer');
      
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
      const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;

      if (!smtpHost) {
        throw new Error('SMTP_HOST environment variable is required');
      }

      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: smtpUser && smtpPassword ? {
          user: smtpUser,
          pass: smtpPassword,
        } : undefined,
      });

      const info = await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html || '',
        text: options.text || options.html?.replace(/<[^>]*>/g, '') || '',
      });

      return info.messageId || `smtp-${Date.now()}`;
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('nodemailer package is not installed. Run: npm install nodemailer');
      }
      throw error;
    }
  }

  /**
   * Send email via AWS SES
   */
  private async sendViaSES(options: SendEmailOptions & { from: string }): Promise<string> {
    try {
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
      
      const region = process.env.AWS_SES_REGION || 'us-east-1';
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      
      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required');
      }
      
      const client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      
      // Extract email from "Name <email>" format
      const fromEmail = options.from.match(/<(.+)>/)?.[1] || options.from;
      
      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: options.html || '',
              Charset: 'UTF-8',
            },
            Text: {
              Data: options.text || options.html?.replace(/<[^>]*>/g, '') || '',
              Charset: 'UTF-8',
            },
          },
        },
      });
      
      const response = await client.send(command);
      return response.MessageId || `ses-${Date.now()}`;
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('@aws-sdk/client-ses package is not installed. Run: npm install @aws-sdk/client-ses');
      }
      throw error;
    }
  }

  /**
   * Render email template with data
   */
  renderTemplate(templateName: string, data: EmailTemplateData): { html: string; text: string } {
    const templates = this.getTemplates();
    const template = templates[templateName];
    
    if (!template) {
      log.warn('Email template not found', { templateName, service: 'notification-manager' });
      return {
        html: `<p>${data.message || 'Notification'}</p>`,
        text: data.message || 'Notification',
      };
    }

    // Simple string replacement
    let html = template.html;
    let text = template.text;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(placeholder, String(value || ''));
      text = text.replace(placeholder, String(value || ''));
    }

    return { html, text };
  }

  /**
   * Get email templates
   */
  private getTemplates(): Record<string, { html: string; text: string }> {
    return {
      'welcome': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to Coder IDE!</h1>
                </div>
                <div class="content">
                  <p>Hi {{firstName}},</p>
                  <p>Welcome to Coder IDE! We're excited to have you on board.</p>
                  <p>Your account has been successfully created. You can now start using all the features of Coder IDE.</p>
                  <p style="text-align: center;">
                    <a href="{{appUrl}}" class="button">Get Started</a>
                  </p>
                  <p>If you have any questions, feel free to reach out to our support team.</p>
                  <p>Best regards,<br>The Coder IDE Team</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE. If you didn't create this account, please ignore this email.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Welcome to Coder IDE!

Hi {{firstName}},

Welcome to Coder IDE! We're excited to have you on board.

Your account has been successfully created. You can now start using all the features of Coder IDE.

Get started: {{appUrl}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The Coder IDE Team

---
This email was sent by Coder IDE. If you didn't create this account, please ignore this email.
        `,
      },
      'password-reset': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>You requested to reset your password for your Coder IDE account.</p>
                  <p style="text-align: center;">
                    <a href="{{resetUrl}}" class="button">Reset Password</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #4F46E5;">{{resetUrl}}</p>
                  <div class="warning">
                    <p><strong>This link will expire in {{expiresIn}}.</strong></p>
                    <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                  </div>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE. For security reasons, please do not share this link with anyone.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Password Reset Request

Hi,

You requested to reset your password for your Coder IDE account.

Click the link below to reset your password:
{{resetUrl}}

This link will expire in {{expiresIn}}.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

---
This email was sent by Coder IDE. For security reasons, please do not share this link with anyone.
        `,
      },
      'password-reset-success': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Password Reset Successful</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>Your password has been successfully reset.</p>
                  <p>If you did not make this change, please contact our support team immediately.</p>
                  <p>Best regards,<br>The Coder IDE Team</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Password Reset Successful

Hi,

Your password has been successfully reset.

If you did not make this change, please contact our support team immediately.

Best regards,
The Coder IDE Team

---
This email was sent by Coder IDE.
        `,
      },
      'email-verification': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Verify Your Email Address</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>Please verify your email address by clicking the link below:</p>
                  <p style="text-align: center;">
                    <a href="{{verificationUrl}}" class="button">Verify Email</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #4F46E5;">{{verificationUrl}}</p>
                  <p>This link will expire in {{expiresIn}}.</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE. If you didn't request this verification, please ignore this email.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Verify Your Email Address

Hi,

Please verify your email address by clicking the link below:
{{verificationUrl}}

This link will expire in {{expiresIn}}.

---
This email was sent by Coder IDE. If you didn't request this verification, please ignore this email.
        `,
      },
      'email-verified': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Email Verified</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>Your email address has been successfully verified!</p>
                  <p>You can now use all features of Coder IDE.</p>
                  <p>Best regards,<br>The Coder IDE Team</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Email Verified

Hi,

Your email address has been successfully verified!

You can now use all features of Coder IDE.

Best regards,
The Coder IDE Team

---
This email was sent by Coder IDE.
        `,
      },
      'password-changed': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Password Changed</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>Your password has been successfully changed.</p>
                  <div class="warning">
                    <p><strong>Security Notice:</strong></p>
                    <p>If you did not make this change, please contact our support team immediately.</p>
                  </div>
                  <p>Best regards,<br>The Coder IDE Team</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Password Changed

Hi,

Your password has been successfully changed.

Security Notice:
If you did not make this change, please contact our support team immediately.

Best regards,
The Coder IDE Team

---
This email was sent by Coder IDE.
        `,
      },
      'provider-linked': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Account Linked</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>Your {{provider}} account has been successfully linked to your Coder IDE account.</p>
                  <p>You can now sign in using {{provider}}.</p>
                  <p>Best regards,<br>The Coder IDE Team</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Account Linked

Hi,

Your {{provider}} account has been successfully linked to your Coder IDE account.

You can now sign in using {{provider}}.

Best regards,
The Coder IDE Team

---
This email was sent by Coder IDE.
        `,
      },
      'provider-unlinked': {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Account Unlinked</h1>
                </div>
                <div class="content">
                  <p>Hi,</p>
                  <p>Your {{provider}} account has been unlinked from your Coder IDE account.</p>
                  <div class="warning">
                    <p><strong>Security Notice:</strong></p>
                    <p>If you did not unlink this account, please contact our support team immediately.</p>
                  </div>
                  <p>Best regards,<br>The Coder IDE Team</p>
                </div>
                <div class="footer">
                  <p>This email was sent by Coder IDE.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Account Unlinked

Hi,

Your {{provider}} account has been unlinked from your Coder IDE account.

Security Notice:
If you did not unlink this account, please contact our support team immediately.

Best regards,
The Coder IDE Team

---
This email was sent by Coder IDE.
        `,
      },
    };
  }

  /**
   * Get user email from database
   */
  async getUserEmail(userId: string): Promise<string | null> {
    try {
      const db = getDatabaseClient();
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || null;
    } catch (error: any) {
      log.error('Failed to get user email', error, { userId, service: 'notification-manager' });
      return null;
    }
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

