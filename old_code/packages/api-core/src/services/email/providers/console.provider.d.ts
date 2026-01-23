/**
 * Console Email Provider
 * Logs emails to console instead of sending them
 * Useful for development and testing
 */
import type { IEmailProvider, EmailMessage, SendEmailResult, EmailProviderConfig } from '../email-provider.interface.js';
/**
 * Console Email Provider - logs emails to console
 */
export declare class ConsoleEmailProvider implements IEmailProvider {
    readonly name = "console";
    private fromEmail;
    private fromName;
    constructor(config: EmailProviderConfig);
    isReady(): boolean;
    send(message: EmailMessage): Promise<SendEmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]>;
}
//# sourceMappingURL=console.provider.d.ts.map