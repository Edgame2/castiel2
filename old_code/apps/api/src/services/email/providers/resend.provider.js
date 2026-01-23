/**
 * Resend Email Provider
 * Uses Resend to send emails
 */
/**
 * Resend Email Provider
 */
export class ResendEmailProvider {
    name = 'resend';
    apiKey;
    fromEmail;
    fromName;
    client = null;
    initialized = false;
    monitoring;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.fromEmail = config.fromEmail;
        this.fromName = config.fromName || 'Castiel';
        this.monitoring = config.monitoring;
        this.initialize();
    }
    async initialize() {
        if (!this.apiKey) {
            if (this.monitoring) {
                this.monitoring.trackEvent('email-provider.resend.disabled', { reason: 'missing-api-key' });
            }
            return;
        }
        try {
            // Dynamic import to avoid breaking builds when not installed
            const { Resend } = await import('resend');
            this.client = new Resend(this.apiKey);
            this.initialized = true;
            if (this.monitoring) {
                this.monitoring.trackEvent('email-provider.resend.initialized', { success: true });
            }
        }
        catch (error) {
            if (this.monitoring) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'email-provider.resend.initialize' });
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
                this.monitoring.trackEvent('email-provider.resend.send-skipped', { reason: 'provider-not-ready' });
            }
            return { success: false, error: 'Provider not initialized' };
        }
        try {
            const toRecipients = Array.isArray(message.to) ? message.to : [message.to];
            const result = await this.client.emails.send({
                from: message.from || `${this.fromName} <${this.fromEmail}>`,
                to: toRecipients,
                subject: message.subject,
                text: message.text,
                html: message.html || message.text.replace(/\n/g, '<br>'),
                reply_to: message.replyTo,
                cc: message.cc,
                bcc: message.bcc,
                attachments: message.attachments?.map(att => ({
                    filename: att.filename,
                    content: typeof att.content === 'string'
                        ? Buffer.from(att.content, 'base64')
                        : att.content,
                    content_type: att.contentType,
                })),
            });
            if (result.data) {
                if (this.monitoring) {
                    this.monitoring.trackEvent('email-provider.resend.sent', { recipientCount: toRecipients.length });
                }
                return { success: true, messageId: result.data.id };
            }
            else {
                if (this.monitoring) {
                    this.monitoring.trackException(new Error(result.error?.message || 'Email failed'), { operation: 'email-provider.resend.send' });
                }
                return { success: false, error: result.error?.message };
            }
        }
        catch (error) {
            if (this.monitoring) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'email-provider.resend.send' });
            }
            return { success: false, error: error.message };
        }
    }
    async sendBatch(messages) {
        if (!this.isReady()) {
            return messages.map(() => ({ success: false, error: 'Provider not initialized' }));
        }
        try {
            const batchEmails = messages.map(message => ({
                from: message.from || `${this.fromName} <${this.fromEmail}>`,
                to: Array.isArray(message.to) ? message.to : [message.to],
                subject: message.subject,
                text: message.text,
                html: message.html || message.text.replace(/\n/g, '<br>'),
            }));
            const result = await this.client.batch.send(batchEmails);
            return result.data.map((r) => ({
                success: !!r.id,
                messageId: r.id,
                error: r.error?.message,
            }));
        }
        catch (error) {
            if (this.monitoring) {
                this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'email-provider.resend.sendBatch' });
            }
            return messages.map(() => ({ success: false, error: error.message }));
        }
    }
}
//# sourceMappingURL=resend.provider.js.map