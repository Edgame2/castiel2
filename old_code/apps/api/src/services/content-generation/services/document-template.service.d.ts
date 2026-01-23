/**
 * Document Template Service
 *
 * Business logic layer for document templates (Content Generation system)
 * Handles CRUD operations, version management, status transitions, and placeholder extraction
 */
import { CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { DocumentTemplate, CreateTemplateRequest, UpdateTemplateRequest, TemplateFilters, TemplateVersion, PlaceholderConfiguration } from '../types/template.types.js';
import { ExtractionRequest, ExtractionResult } from '../types/placeholder.types.js';
import { IntegrationService } from '../../integration.service.js';
import { IntegrationConnectionService } from '../../integration-connection.service.js';
export declare class DocumentTemplateService {
    private monitoring;
    private repository;
    private extractionService;
    private config;
    private integrationService?;
    private connectionService?;
    constructor(monitoring: IMonitoringProvider, cosmosClient?: CosmosClient, integrationService?: IntegrationService, connectionService?: IntegrationConnectionService);
    /**
     * Create a new template from a source document
     */
    createTemplate(tenantId: string, userId: string, input: CreateTemplateRequest): Promise<DocumentTemplate>;
    /**
     * Extract placeholders from a source document and update template
     */
    extractPlaceholders(templateId: string, tenantId: string, extractionRequest: ExtractionRequest): Promise<ExtractionResult>;
    /**
     * Get OAuth token for document format
     * Maps document format to integration provider and retrieves OAuth tokens
     */
    private getAuthTokenForFormat;
    /**
     * Validate that source document exists and is accessible
     * Used before generating documents to fail fast if source is missing
     */
    validateSourceDocument(template: DocumentTemplate, tenantId: string): Promise<void>;
    /**
     * Validate Google Drive document exists and is accessible
     */
    private validateGoogleDocument;
    /**
     * Validate Microsoft OneDrive document exists and is accessible
     */
    private validateMicrosoftDocument;
    /**
     * Get template by ID
     */
    getTemplate(id: string, tenantId: string): Promise<DocumentTemplate | null>;
    /**
     * Get template for user (only active templates)
     */
    getTemplateForUser(id: string, tenantId: string): Promise<DocumentTemplate | null>;
    /**
     * Update template
     */
    updateTemplate(id: string, tenantId: string, updates: UpdateTemplateRequest): Promise<DocumentTemplate>;
    /**
     * Delete template
     * Also cancels all pending/processing jobs for this template
     */
    deleteTemplate(id: string, tenantId: string): Promise<void>;
    /**
     * List templates with filters (admin)
     */
    listTemplates(tenantId: string, filters?: TemplateFilters): Promise<DocumentTemplate[]>;
    /**
     * List active templates (for users)
     */
    listActiveTemplates(tenantId: string, filters?: {
        documentFormat?: string;
    }): Promise<DocumentTemplate[]>;
    /**
     * Activate template (draft → active)
     */
    activateTemplate(id: string, tenantId: string): Promise<DocumentTemplate>;
    /**
     * Archive template (active → archived)
     */
    archiveTemplate(id: string, tenantId: string): Promise<DocumentTemplate>;
    /**
     * Update placeholder configurations
     */
    updatePlaceholderConfigs(templateId: string, tenantId: string, configs: PlaceholderConfiguration[]): Promise<DocumentTemplate>;
    /**
     * Update template colors
     */
    updateColors(id: string, tenantId: string, colors: string[]): Promise<DocumentTemplate>;
    /**
     * Create a new version of the template
     */
    createVersion(templateId: string, tenantId: string, userId: string, changes: string): Promise<TemplateVersion>;
    /**
     * Get all versions for a template
     */
    getVersions(templateId: string, tenantId: string): Promise<TemplateVersion[]>;
    /**
     * Rollback to a specific version
     */
    rollbackToVersion(templateId: string, tenantId: string, versionNumber: number): Promise<DocumentTemplate>;
}
//# sourceMappingURL=document-template.service.d.ts.map