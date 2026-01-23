/**
 * Resend Email Provider
 * Uses Resend to send emails
 */
import type { IEmailProvider, EmailMessage, SendEmailResult, EmailProviderConfig } from '../email-provider.interface.js';
export interface ResendConfig extends EmailProviderConfig {
    apiKey: string;
}
/**
 * Resend Email Provider
 */
export declare class ResendEmailProvider implements IEmailProvider {
    readonly name = "resend";
    private apiKey;
    private fromEmail;
    private fromName;
    private client;
    private initialized;
    constructor(config: ResendConfig);
    private initialize;
    isReady(): boolean;
    send(message: EmailMessage): Promise<SendEmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]>;
}
//# sourceMappingURL=resend.provider.d.ts.map