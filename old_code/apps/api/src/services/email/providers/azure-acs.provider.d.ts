/**
 * Azure Communication Services Email Provider
 * Uses Azure Communication Services to send emails
 */
import type { IEmailProvider, EmailMessage, SendEmailResult, EmailProviderConfig } from '../email-provider.interface.js';
export interface AzureACSConfig extends EmailProviderConfig {
    connectionString: string;
}
/**
 * Azure Communication Services Email Provider
 */
export declare class AzureACSEmailProvider implements IEmailProvider {
    readonly name = "azure-acs";
    private connectionString;
    private fromEmail;
    private fromName;
    private client;
    private initialized;
    constructor(config: AzureACSConfig);
    private initialize;
    isReady(): boolean;
    send(message: EmailMessage): Promise<SendEmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]>;
}
//# sourceMappingURL=azure-acs.provider.d.ts.map