/**
 * Email Service Module
 * Exports all email-related functionality
 */
export type { IEmailProvider, EmailMessage, SendEmailResult, EmailAttachment, EmailProviderConfig, } from './email-provider.interface.js';
export { UnifiedEmailService, type EmailServiceConfig, type EmailProvider, type EmailTemplates, } from './email.service.js';
export { ConsoleEmailProvider } from './providers/console.provider.js';
export { ResendEmailProvider, type ResendConfig } from './providers/resend.provider.js';
export { AzureACSEmailProvider, type AzureACSConfig } from './providers/azure-acs.provider.js';
//# sourceMappingURL=index.d.ts.map