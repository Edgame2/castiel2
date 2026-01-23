/**
 * Email Template Service
 * Business logic for email template management
 */
import { EmailTemplateRepository } from '../repositories/email-template.repository.js';
import { EmailRenderingService } from './email-rendering.service.js';
import { ResendEmailProvider } from './email/providers/resend.provider.js';
import { AzureACSEmailProvider } from './email/providers/azure-acs.provider.js';
import { ConsoleEmailProvider } from './email/providers/console.provider.js';
/**
 * Email Template Service
 */
export class EmailTemplateService {
    repository;
    renderingService;
    integrationService;
    connectionService;
    monitoring;
    cosmosClient;
    databaseId;
    constructor(cosmosClient, databaseId, integrationService, connectionService, monitoring) {
        this.cosmosClient = cosmosClient;
        this.databaseId = databaseId;
        this.repository = new EmailTemplateRepository(cosmosClient, databaseId);
        this.renderingService = new EmailRenderingService();
        this.integrationService = integrationService;
        this.connectionService = connectionService;
        this.monitoring = monitoring;
    }
    /**
     * Create a new email template
     */
    async createTemplate(data, user) {
        // Validate template data
        this.validateTemplateData(data);
        // Check for duplicate (name + language)
        const existing = await this.repository.findByNameAndLanguage(data.name, data.language, data.tenantId || 'system');
        if (existing) {
            throw new Error(`Template with name '${data.name}' and language '${data.language}' already exists`);
        }
        // Set base template flag
        const isBaseTemplate = data.language === 'en' || data.isBaseTemplate === true;
        // Create template document
        const template = {
            tenantId: data.tenantId || 'system',
            name: data.name,
            language: data.language,
            displayName: data.displayName,
            category: data.category,
            description: data.description,
            subject: data.subject,
            htmlBody: data.htmlBody,
            textBody: data.textBody,
            fromEmail: data.fromEmail,
            fromName: data.fromName,
            replyTo: data.replyTo,
            placeholders: data.placeholders,
            emailProviderId: data.emailProviderId,
            isBaseTemplate,
            fallbackLanguage: 'en',
            createdBy: {
                type: 'super_admin',
                userId: user.id,
                name: user.name || user.email,
            },
            isActive: true,
        };
        return this.repository.create(template);
    }
    /**
     * Update an existing template
     */
    async updateTemplate(id, tenantId, updates, user) {
        // Get existing template
        const template = await this.repository.findById(id, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        // Validate updates
        this.validateTemplateUpdates(updates);
        // Update template
        const updated = await this.repository.update(id, tenantId, {
            ...updates,
            updatedBy: {
                userId: user.id,
                name: user.name || user.email,
            },
        });
        if (!updated) {
            throw new Error('Failed to update template');
        }
        return updated;
    }
    /**
     * Delete a template
     */
    async deleteTemplate(id, tenantId) {
        const template = await this.repository.findById(id, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        // Check if template is in use (optional validation - can be enhanced later)
        // For now, allow deletion
        const deleted = await this.repository.delete(id, tenantId);
        if (!deleted) {
            throw new Error('Failed to delete template');
        }
    }
    /**
     * Get template by ID
     */
    async getTemplate(id, tenantId) {
        const template = await this.repository.findById(id, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        return template;
    }
    /**
     * Get template by name and language with fallback
     */
    async getTemplateByLanguage(name, language, tenantId) {
        // Try requested language
        let template = await this.repository.findByNameAndLanguage(name, language, tenantId);
        // Fallback to English if not found
        if (!template && language !== 'en') {
            template = await this.repository.findByNameAndLanguage(name, 'en', tenantId);
        }
        if (!template) {
            throw new Error(`Template '${name}' not found`);
        }
        return template;
    }
    /**
     * Get all language variants of a template
     */
    async getTemplateLanguages(name, tenantId) {
        return this.repository.getLanguageVariants(name, tenantId);
    }
    /**
     * List templates with filters
     */
    async listTemplates(filters, pagination) {
        return this.repository.list(filters, pagination);
    }
    /**
     * Render template with placeholders
     */
    async renderTemplate(template, placeholders) {
        return this.renderingService.render(template, placeholders);
    }
    /**
     * Send email using template and provider
     * Integrates with the integration system to get email provider credentials
     */
    async sendEmail(params) {
        if (!this.integrationService || !this.connectionService) {
            this.monitoring?.trackEvent('email_template.send_email.missing_dependencies', {
                tenantId: params.tenantId,
                templateId: params.template.id,
            });
            throw new Error('Email sending requires integration services to be configured');
        }
        try {
            // Step 1: Find email provider integration
            const emailIntegration = await this.findEmailProviderIntegration(params.template.emailProviderId, params.tenantId);
            if (!emailIntegration) {
                this.monitoring?.trackEvent('email_template.send_email.no_provider', {
                    tenantId: params.tenantId,
                    templateId: params.template.id,
                    requestedProviderId: params.template.emailProviderId || 'none',
                });
                throw new Error('No email provider integration found. Please configure an email provider integration for your tenant.');
            }
            // Step 2: Get provider document to determine provider type
            const { IntegrationProviderRepository } = await import('../repositories/integration.repository.js');
            const providerRepo = new IntegrationProviderRepository(this.cosmosClient, this.databaseId, 'integration_providers');
            const provider = await providerRepo.findByIdAcrossCategories(emailIntegration.integrationId);
            if (!provider) {
                throw new Error(`Email provider not found: ${emailIntegration.integrationId}`);
            }
            // Step 3: Get connection and credentials
            const connection = await this.connectionService.getConnection(emailIntegration.id, params.tenantId);
            if (!connection || connection.status !== 'active') {
                this.monitoring?.trackEvent('email_template.send_email.no_connection', {
                    tenantId: params.tenantId,
                    integrationId: emailIntegration.id,
                    providerName: provider.provider,
                });
                throw new Error(`Email provider connection not found or inactive for integration: ${emailIntegration.name}`);
            }
            // Step 4: Retrieve credentials
            const credentials = await this.connectionService.getDecryptedCredentials(connection.id, emailIntegration.id);
            if (!credentials) {
                this.monitoring?.trackEvent('email_template.send_email.no_credentials', {
                    tenantId: params.tenantId,
                    integrationId: emailIntegration.id,
                    connectionId: connection.id,
                });
                throw new Error('Failed to retrieve email provider credentials');
            }
            // Step 5: Create email provider instance
            const emailProvider = this.createEmailProvider(provider, credentials, params.template);
            // Step 6: Send email
            const toRecipients = Array.isArray(params.to) ? params.to : [params.to];
            const fromEmail = params.template.fromEmail || emailIntegration.settings?.fromEmail || 'noreply@castiel.ai';
            const fromName = params.template.fromName || emailIntegration.settings?.fromName || 'Castiel';
            const result = await emailProvider.send({
                to: toRecipients,
                subject: params.rendered.subject,
                text: params.rendered.textBody,
                html: params.rendered.htmlBody,
                from: `${fromName} <${fromEmail}>`,
                replyTo: params.template.replyTo,
                cc: params.cc,
                bcc: params.bcc,
            });
            if (result.success) {
                this.monitoring?.trackEvent('email_template.send_email.success', {
                    tenantId: params.tenantId,
                    templateId: params.template.id,
                    templateName: params.template.name,
                    providerName: provider.provider,
                    recipientCount: toRecipients.length,
                    messageId: result.messageId,
                });
            }
            else {
                this.monitoring?.trackEvent('email_template.send_email.failed', {
                    tenantId: params.tenantId,
                    templateId: params.template.id,
                    templateName: params.template.name,
                    providerName: provider.provider,
                    error: result.error,
                });
            }
            return result;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'email_template.send_email',
                tenantId: params.tenantId,
                templateId: params.template.id,
            });
            return {
                success: false,
                error: error.message || 'Failed to send email',
            };
        }
    }
    /**
     * Find email provider integration
     * Priority: 1. Template-specific provider, 2. Tenant default email provider
     */
    async findEmailProviderIntegration(templateProviderId, tenantId) {
        // Priority 1: Template-specific provider
        if (templateProviderId) {
            const integration = await this.integrationService.getIntegration(templateProviderId, tenantId);
            if (integration && integration.status === 'connected') {
                return integration;
            }
        }
        // Priority 2: Find tenant default email provider
        // Look for integrations with category "email" or "communication" that support notifications
        // Get all tenant integrations
        const { integrations } = await this.integrationService.listIntegrations({
            tenantId,
            status: 'connected',
            limit: 100,
        });
        // Find email provider integrations
        const { IntegrationProviderRepository } = await import('../repositories/integration.repository.js');
        const providerRepo = new IntegrationProviderRepository(this.cosmosClient, this.databaseId, 'integration_providers');
        for (const integration of integrations) {
            const provider = await providerRepo.findByIdAcrossCategories(integration.integrationId);
            if (provider &&
                (provider.category === 'email' || provider.category === 'communication') &&
                provider.supportsNotifications === true &&
                provider.status === 'active') {
                return integration;
            }
        }
        return null;
    }
    /**
     * Create email provider instance based on provider type and credentials
     */
    createEmailProvider(provider, credentials, template) {
        const fromEmail = template.fromEmail || 'noreply@castiel.ai';
        const fromName = template.fromName || 'Castiel';
        switch (provider.provider) {
            case 'resend':
                if (credentials.type === 'api_key' && credentials.apiKey) {
                    return new ResendEmailProvider({
                        apiKey: credentials.apiKey,
                        fromEmail,
                        fromName,
                    });
                }
                throw new Error('Resend provider requires API key credentials');
            case 'azure-acs':
                if (credentials.type === 'connection_string' && credentials.connectionString) {
                    return new AzureACSEmailProvider({
                        connectionString: credentials.connectionString,
                        fromEmail,
                        fromName,
                    });
                }
                // Try to get connection string from credentials object
                const connectionString = credentials.connectionString || credentials.value;
                if (connectionString) {
                    return new AzureACSEmailProvider({
                        connectionString,
                        fromEmail,
                        fromName,
                    });
                }
                throw new Error('Azure ACS provider requires connection string credentials');
            case 'console':
            default:
                // Fallback to console provider for development/testing
                this.monitoring?.trackEvent('email_template.send_email.using_console_provider', {
                    providerName: provider.provider,
                    reason: 'provider_not_supported_or_fallback',
                });
                return new ConsoleEmailProvider({
                    fromEmail,
                    fromName,
                });
        }
    }
    /**
     * Test template rendering
     */
    async testTemplate(templateId, tenantId, placeholders) {
        const template = await this.getTemplate(templateId, tenantId);
        return this.renderingService.testTemplate(template, placeholders);
    }
    /**
     * Duplicate template to another language
     */
    async duplicateTemplate(sourceTemplateId, targetLanguage, tenantId, displayName) {
        // Get source template
        const source = await this.getTemplate(sourceTemplateId, tenantId);
        // Check if target language already exists
        const existing = await this.repository.findByNameAndLanguage(source.name, targetLanguage, tenantId);
        if (existing) {
            throw new Error(`Template already exists for language: ${targetLanguage}`);
        }
        // Create duplicate
        const duplicate = {
            ...source,
            language: targetLanguage,
            displayName: displayName || source.displayName,
            isBaseTemplate: targetLanguage === 'en',
            baseTemplateName: source.name,
            createdBy: source.createdBy, // Keep original creator
        };
        return this.repository.create(duplicate);
    }
    /**
     * Validate template data
     */
    validateTemplateData(data) {
        if (!data.name || data.name.trim().length === 0) {
            throw new Error('Template name is required');
        }
        if (!/^[a-z0-9-]+$/.test(data.name)) {
            throw new Error('Template name must contain only lowercase letters, numbers, and hyphens');
        }
        if (!data.language || data.language.length !== 2) {
            throw new Error('Language must be a 2-letter ISO 639-1 code');
        }
        if (!data.subject || data.subject.trim().length === 0) {
            throw new Error('Subject is required');
        }
        if (!data.htmlBody || data.htmlBody.trim().length === 0) {
            throw new Error('HTML body is required');
        }
        if (!data.textBody || data.textBody.trim().length === 0) {
            throw new Error('Text body is required');
        }
        if (!['notifications', 'invitations', 'alerts', 'system'].includes(data.category)) {
            throw new Error(`Invalid category: ${data.category}`);
        }
    }
    /**
     * Validate template updates
     */
    validateTemplateUpdates(updates) {
        if (updates.category && !['notifications', 'invitations', 'alerts', 'system'].includes(updates.category)) {
            throw new Error(`Invalid category: ${updates.category}`);
        }
        if (updates.subject !== undefined && updates.subject.trim().length === 0) {
            throw new Error('Subject cannot be empty');
        }
        if (updates.htmlBody !== undefined && updates.htmlBody.trim().length === 0) {
            throw new Error('HTML body cannot be empty');
        }
        if (updates.textBody !== undefined && updates.textBody.trim().length === 0) {
            throw new Error('Text body cannot be empty');
        }
    }
}
//# sourceMappingURL=email-template.service.js.map