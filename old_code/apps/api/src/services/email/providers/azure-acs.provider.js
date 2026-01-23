// @ts-nocheck - Optional dependency, not used by workers-sync
/**
 * Azure Communication Services Email Provider
 * Uses Azure Communication Services to send emails
 */
/**
 * Azure Communication Services Email Provider
 */
export class AzureACSEmailProvider {
    name = 'azure-acs';
    connectionString;
    fromEmail;
    fromName;
    client = null;
    initialized = false;
    monitoring;
    constructor(config) {
        this.connectionString = config.connectionString;
        this.fromEmail = config.fromEmail;
        this.fromName = config.fromName || 'Castiel';
        this.monitoring = config.monitoring;
        this.initialize();
    }
    async initialize() {
        if (!this.connectionString) {
            if (this.monitoring) {
                this.monitoring.trackEvent('email-provider.azure-acs.disabled', { reason: 'missing-connection-string' });
            }
            return;
        }
        try {
            // Dynamic import to avoid breaking builds when not installed
            const { EmailClient } = await import('@azure/communication-email');
            this.client = new EmailClient(this.connectionString);
            this.initialized = true;
            if (this.monitoring) {
                this.monitoring.trackEvent('email-provider.azure-acs.initialized', { success: true });
            }
        }
        catch (error) {
            if (this.monitoring) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'email-provider.azure-acs.initialize' });
            }
            this.initialized = false;
        }
    }
    isReady() {
        return this.initialized && this.client !== null;
    }
    async send(message) {
        if (!this.isReady()) {
            if (this.monitoring) {
                this.monitoring.trackEvent('email-provider.azure-acs.send-skipped', { reason: 'provider-not-ready' });
            }
            return { success: false, error: 'Provider not initialized' };
        }
        try {
            const toRecipients = Array.isArray(message.to) ? message.to : [message.to];
            const emailMessage = {
                senderAddress: message.from || `${this.fromName} <${this.fromEmail}>`,
                content: {
                    subject: message.subject,
                    plainText: message.text,
                    html: message.html || message.text.replace(/\n/g, '<br>'),
                },
                recipients: {
                    to: toRecipients.map(email => ({ address: email })),
                    cc: message.cc?.map(email => ({ address: email })),
                    bcc: message.bcc?.map(email => ({ address: email })),
                },
                replyTo: message.replyTo ? [{ address: message.replyTo }] : undefined,
                attachments: message.attachments?.map(att => ({
                    name: att.filename,
                    contentType: att.contentType || 'application/octet-stream',
                    contentInBase64: typeof att.content === 'string'
                        ? att.content
                        : att.content.toString('base64'),
                })),
            };
            const poller = await this.client.beginSend(emailMessage);
            const result = await poller.pollUntilDone();
            if (result.status === 'Succeeded') {
                if (this.monitoring) {
                    this.monitoring.trackEvent('email-provider.azure-acs.sent', { recipientCount: toRecipients.length });
                }
                return { success: true, messageId: result.id };
            }
            else {
                if (this.monitoring) {
                    this.monitoring.trackException(new Error(result.error?.message || 'Email failed'), { operation: 'email-provider.azure-acs.send' });
                }
                return { success: false, error: result.error?.message };
            }
        }
        catch (error) {
            if (this.monitoring) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'email-provider.azure-acs.send' });
            }
            return { success: false, error: error.message };
        }
    }
    async sendBatch(messages) {
        // Azure ACS doesn't have native batch support, send sequentially
        return Promise.all(messages.map(msg => this.send(msg)));
    }
}
//# sourceMappingURL=azure-acs.provider.js.map