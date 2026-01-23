/**
 * Email Template Service
 * Business logic for email template management
 */
import { CosmosClient } from '@azure/cosmos';
import { EmailTemplateDocument, CreateTemplateInput, UpdateTemplateInput, TemplateFilters, PaginationOptions, PaginatedResult, RenderedTemplate, TemplateTestResult, LanguageVariant, EmailSendParams, EmailSendResult } from '../types/email-template.types.js';
import type { AuthUser } from '../types/auth.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { IntegrationService } from './integration.service.js';
import type { IntegrationConnectionService } from './integration-connection.service.js';
/**
 * Email Template Service
 */
export declare class EmailTemplateService {
    private repository;
    private renderingService;
    private integrationService?;
    private connectionService?;
    private monitoring?;
    private cosmosClient;
    private databaseId;
    constructor(cosmosClient: CosmosClient, databaseId: string, integrationService?: IntegrationService, connectionService?: IntegrationConnectionService, monitoring?: IMonitoringProvider);
    /**
     * Create a new email template
     */
    createTemplate(data: CreateTemplateInput, user: AuthUser): Promise<EmailTemplateDocument>;
    /**
     * Update an existing template
     */
    updateTemplate(id: string, tenantId: string, updates: UpdateTemplateInput, user: AuthUser): Promise<EmailTemplateDocument>;
    /**
     * Delete a template
     */
    deleteTemplate(id: string, tenantId: string): Promise<void>;
    /**
     * Get template by ID
     */
    getTemplate(id: string, tenantId: string): Promise<EmailTemplateDocument>;
    /**
     * Get template by name and language with fallback
     */
    getTemplateByLanguage(name: string, language: string, tenantId: string): Promise<EmailTemplateDocument>;
    /**
     * Get all language variants of a template
     */
    getTemplateLanguages(name: string, tenantId: string): Promise<LanguageVariant[]>;
    /**
     * List templates with filters
     */
    listTemplates(filters: TemplateFilters, pagination: PaginationOptions): Promise<PaginatedResult<EmailTemplateDocument>>;
    /**
     * Render template with placeholders
     */
    renderTemplate(template: EmailTemplateDocument, placeholders: Record<string, any>): Promise<RenderedTemplate>;
    /**
     * Send email using template and provider
     * Integrates with the integration system to get email provider credentials
     */
    sendEmail(params: EmailSendParams): Promise<EmailSendResult>;
    /**
     * Find email provider integration
     * Priority: 1. Template-specific provider, 2. Tenant default email provider
     */
    private findEmailProviderIntegration;
    /**
     * Create email provider instance based on provider type and credentials
     */
    private createEmailProvider;
    /**
     * Test template rendering
     */
    testTemplate(templateId: string, tenantId: string, placeholders: Record<string, any>): Promise<TemplateTestResult>;
    /**
     * Duplicate template to another language
     */
    duplicateTemplate(sourceTemplateId: string, targetLanguage: string, tenantId: string, displayName?: string): Promise<EmailTemplateDocument>;
    /**
     * Validate template data
     */
    private validateTemplateData;
    /**
     * Validate template updates
     */
    private validateTemplateUpdates;
}
//# sourceMappingURL=email-template.service.d.ts.map