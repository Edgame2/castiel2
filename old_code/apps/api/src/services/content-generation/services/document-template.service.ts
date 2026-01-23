// @ts-nocheck - Content generation service, not used by workers
/**
 * Document Template Service
 * 
 * Business logic layer for document templates (Content Generation system)
 * Handles CRUD operations, version management, status transitions, and placeholder extraction
 */

import { CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../../../config/env.js';
import { DocumentTemplateRepository } from '../repositories/document-template.repository.js';
import { PlaceholderExtractionService } from './placeholder-extraction.service.js';
import {
  DocumentTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilters,
  TemplateVersion,
  TemplateStatus,
  PlaceholderDefinition,
  PlaceholderConfiguration,
  DocumentFormat,
} from '../types/template.types.js';
import {
  ExtractionRequest,
  ExtractionResult,
} from '../types/placeholder.types.js';
import { getContentGenerationConfig } from '../config/content-generation.config.js';
import { DocumentAuthToken } from '../extractors/base-extractor.js';
import { IntegrationService } from '../../integration.service.js';
import { IntegrationConnectionService } from '../../integration-connection.service.js';

export class DocumentTemplateService {
  private repository: DocumentTemplateRepository;
  private extractionService: PlaceholderExtractionService;
  private config = getContentGenerationConfig();
  private integrationService?: IntegrationService;
  private connectionService?: IntegrationConnectionService;

  constructor(
    private monitoring: IMonitoringProvider,
    cosmosClient?: CosmosClient,
    integrationService?: IntegrationService,
    connectionService?: IntegrationConnectionService
  ) {
    // Create CosmosClient if not provided
    const client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });

    this.repository = new DocumentTemplateRepository(
      client,
      config.cosmosDb.databaseId,
      this.config.templateContainerName
    );

    this.extractionService = new PlaceholderExtractionService(monitoring);
    this.integrationService = integrationService;
    this.connectionService = connectionService;
  }

  /**
   * Create a new template from a source document
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    input: CreateTemplateRequest
  ): Promise<DocumentTemplate> {
    const startTime = Date.now();

    try {
      // Validate template name length
      if (input.name && input.name.length > this.config.maxTemplateNameLength) {
        throw new Error(
          `Template name length (${input.name.length}) exceeds maximum (${this.config.maxTemplateNameLength} characters)`
        );
      }

      // Validate template description length if provided
      if (input.description && input.description.length > this.config.maxTemplateDescriptionLength) {
        throw new Error(
          `Template description length (${input.description.length}) exceeds maximum (${this.config.maxTemplateDescriptionLength} characters)`
        );
      }

      this.monitoring.trackEvent('content_generation.template.create', {
        tenantId,
        documentFormat: input.documentFormat,
      });

      // Create template with initial state
      const template = await this.repository.create(tenantId, userId, input);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('content_generation.template.created', {
        tenantId,
        templateId: template.id,
        duration,
      });

      return template;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.create',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Extract placeholders from a source document and update template
   */
  async extractPlaceholders(
    templateId: string,
    tenantId: string,
    extractionRequest: ExtractionRequest
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      // Get template
      const template = await this.repository.getById(templateId, tenantId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get OAuth token for document format (if integration services are available)
      let authToken: DocumentAuthToken | undefined;
      if (this.integrationService && this.connectionService && extractionRequest.sourceDocumentId) {
        try {
          authToken = await this.getAuthTokenForFormat(tenantId, extractionRequest.documentFormat);
        } catch (error) {
          this.monitoring.trackEvent('content_generation.placeholder.extraction.auth_failed', {
            tenantId,
            templateId,
            documentFormat: extractionRequest.documentFormat,
            error: (error as Error).message,
          });
          // Continue without auth - will use legacy extraction method
        }
      }

      // Extract placeholders (with auth token if available)
      const result = await this.extractionService.extractPlaceholders(extractionRequest, authToken);

      // Update template with extracted placeholders and colors
      await this.repository.update(templateId, tenantId, {
        placeholders: result.placeholders,
        dominantColors: result.dominantColors.slice(0, this.config.templateMaxColors),
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('content_generation.placeholder.extracted', {
        tenantId,
        templateId,
        placeholderCount: result.placeholders.length,
        duration,
        usedExtractor: authToken ? 'true' : 'false',
      });

      return result;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'placeholder.extraction',
        tenantId,
        templateId,
      });
      throw error;
    }
  }

  /**
   * Get OAuth token for document format
   * Maps document format to integration provider and retrieves OAuth tokens
   */
  private async getAuthTokenForFormat(
    tenantId: string,
    documentFormat: DocumentFormat
  ): Promise<DocumentAuthToken> {
    if (!this.integrationService || !this.connectionService) {
      throw new Error('Integration services not available');
    }

    // Map document format to provider name
    const providerMap: Record<DocumentFormat, string> = {
      google_slides: 'google-workspace',
      google_docs: 'google-workspace',
      word: 'microsoft-365', // or 'dynamics-365' depending on your setup
      powerpoint: 'microsoft-365',
    };

    const providerName = providerMap[documentFormat];
    if (!providerName) {
      throw new Error(`No integration provider mapped for format: ${documentFormat}`);
    }

    // Find integration by provider name
    const integrations = await this.integrationService.listIntegrations({
      tenantId,
      providerName,
      status: 'connected',
      limit: 1,
    });

    if (integrations.integrations.length === 0) {
      throw new Error(
        `No connected ${providerName} integration found for tenant. Please connect the integration first.`
      );
    }

    const integration = integrations.integrations[0];

    // Get connection
    const connection = await this.connectionService.getConnection(integration.id, tenantId);
    if (!connection) {
      throw new Error(`No connection found for integration: ${integration.id}`);
    }

    // Get decrypted credentials
    const credentials = await this.connectionService.getDecryptedCredentials(
      connection.id,
      integration.id
    );

    if (!credentials || credentials.type !== 'oauth2') {
      throw new Error(`OAuth2 credentials not found for integration: ${integration.id}`);
    }

    // Convert to DocumentAuthToken
    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      tenantId,
      userId: connection.userId,
    };
  }

  /**
   * Validate that source document exists and is accessible
   * Used before generating documents to fail fast if source is missing
   */
  async validateSourceDocument(
    template: DocumentTemplate,
    tenantId: string
  ): Promise<void> {
    try {
      // Get tenant-level OAuth token for the document format
      const authToken = await this.getAuthTokenForFormat(tenantId, template.documentFormat);

      // Validate based on format
      if (template.documentFormat === 'google_docs' || template.documentFormat === 'google_slides') {
        await this.validateGoogleDocument(template.sourceDocumentId, authToken, template.documentFormat);
      } else if (template.documentFormat === 'word' || template.documentFormat === 'powerpoint') {
        await this.validateMicrosoftDocument(template.sourceDocumentId, authToken, template.documentFormat);
      } else {
        throw new Error(`Unsupported document format: ${template.documentFormat}`);
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.validate_source',
        templateId: template.id,
        documentFormat: template.documentFormat,
        sourceDocumentId: template.sourceDocumentId,
      });
      throw new Error(
        `Source document validation failed: ${(error as Error).message}. ` +
        `The source document may have been deleted or access may have been revoked.`
      );
    }
  }

  /**
   * Validate Google Drive document exists and is accessible
   */
  private async validateGoogleDocument(
    documentId: string,
    authToken: DocumentAuthToken,
    format: 'google_docs' | 'google_slides'
  ): Promise<void> {
    const { google } = await import('googleapis');
    const { OAuth2Client } = await import('google-auth-library');
    const { config } = await import('../../../config/env.js');

    const clientId = config.googleWorkspace?.clientId || '';
    const clientSecret = config.googleWorkspace?.clientSecret || '';

    if (!clientId || !clientSecret) {
      throw new Error('Google Workspace OAuth credentials not configured');
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: authToken.accessToken,
      refresh_token: authToken.refreshToken,
    });

    const driveClient = google.drive({ version: 'v3', auth: oauth2Client });

    try {
      // Get document metadata
      const file = await driveClient.files.get({
        fileId: documentId,
        fields: 'id,name,mimeType,trashed',
      });

      // Check if document is trashed
      if (file.data.trashed) {
        throw new Error('Source document has been moved to trash');
      }

      // Verify correct mime type
      const expectedMimeTypes: Record<string, string> = {
        google_docs: 'application/vnd.google-apps.document',
        google_slides: 'application/vnd.google-apps.presentation',
      };

      const expectedMimeType = expectedMimeTypes[format];
      if (file.data.mimeType !== expectedMimeType) {
        throw new Error(
          `Document format mismatch. Expected ${expectedMimeType}, got ${file.data.mimeType}`
        );
      }
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('Source document not found. It may have been deleted.');
      }
      if (error.code === 403) {
        throw new Error('Access denied to source document. Permissions may have been revoked.');
      }
      throw error;
    }
  }

  /**
   * Validate Microsoft OneDrive document exists and is accessible
   */
  private async validateMicrosoftDocument(
    documentId: string,
    authToken: DocumentAuthToken,
    format: 'word' | 'powerpoint'
  ): Promise<void> {
    const axios = (await import('axios')).default;
    const graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';

    try {
      // Get document metadata
      const response = await axios.get(
        `${graphApiBaseUrl}/me/drive/items/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken.accessToken}`,
          },
        }
      );

      const item = response.data;

      // Verify correct file type
      const expectedExtensions: Record<string, string> = {
        word: '.docx',
        powerpoint: '.pptx',
      };

      const expectedExtension = expectedExtensions[format];
      if (!item.name?.endsWith(expectedExtension)) {
        throw new Error(
          `Document format mismatch. Expected ${expectedExtension}, got ${item.name}`
        );
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Source document not found. It may have been deleted.');
      }
      if (error.response?.status === 403) {
        throw new Error('Access denied to source document. Permissions may have been revoked.');
      }
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string, tenantId: string): Promise<DocumentTemplate | null> {
    try {
      return await this.repository.getById(id, tenantId);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.get',
        tenantId,
        templateId: id,
      });
      throw error;
    }
  }

  /**
   * Get template for user (only active templates)
   */
  async getTemplateForUser(
    id: string,
    tenantId: string
  ): Promise<DocumentTemplate | null> {
    const template = await this.getTemplate(id, tenantId);
    
    // Only return active templates for users
    if (template && template.status === 'active') {
      return template;
    }

    return null;
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    tenantId: string,
    updates: UpdateTemplateRequest
  ): Promise<DocumentTemplate> {
    const startTime = Date.now();

    try {
      // Validate template name length if provided
      if (updates.name && updates.name.length > this.config.maxTemplateNameLength) {
        throw new Error(
          `Template name length (${updates.name.length}) exceeds maximum (${this.config.maxTemplateNameLength} characters)`
        );
      }

      // Validate template description length if provided
      if (updates.description && updates.description.length > this.config.maxTemplateDescriptionLength) {
        throw new Error(
          `Template description length (${updates.description.length}) exceeds maximum (${this.config.maxTemplateDescriptionLength} characters)`
        );
      }

      const template = await this.repository.update(id, tenantId, updates);
      if (!template) {
        throw new Error('Template not found');
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('content_generation.template.updated', {
        tenantId,
        templateId: id,
        duration,
      });

      return template;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.update',
        tenantId,
        templateId: id,
      });
      throw error;
    }
  }

  /**
   * Delete template
   * Also cancels all pending/processing jobs for this template
   */
  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    try {
      // Cancel all pending/processing jobs for this template
      // Import GenerationJobRepository dynamically to avoid circular dependency
      const { GenerationJobRepository } = await import('../../../repositories/generation-job.repository.js');
      const jobRepository = new GenerationJobRepository();
      
      try {
        const cancelledCount = await jobRepository.cancelJobsForTemplate(id, tenantId);
        if (cancelledCount > 0) {
          this.monitoring.trackEvent('content_generation.template.jobs_cancelled', {
            tenantId,
            templateId: id,
            cancelledCount,
          });
        }
      } catch (jobError) {
        // Log but don't fail template deletion if job cancellation fails
        this.monitoring.trackException(jobError as Error, {
          operation: 'template.delete.cancel_jobs',
          tenantId,
          templateId: id,
        });
      }

      const success = await this.repository.delete(id, tenantId);
      if (!success) {
        throw new Error('Template not found');
      }

      this.monitoring.trackEvent('content_generation.template.deleted', {
        tenantId,
        templateId: id,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.delete',
        tenantId,
        templateId: id,
      });
      throw error;
    }
  }

  /**
   * List templates with filters (admin)
   */
  async listTemplates(
    tenantId: string,
    filters?: TemplateFilters
  ): Promise<DocumentTemplate[]> {
    try {
      return await this.repository.list(tenantId, filters);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.list',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * List active templates (for users)
   */
  async listActiveTemplates(
    tenantId: string,
    filters?: { documentFormat?: string }
  ): Promise<DocumentTemplate[]> {
    try {
      return await this.repository.listActive(tenantId, filters);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.listActive',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Activate template (draft → active)
   */
  async activateTemplate(
    id: string,
    tenantId: string
  ): Promise<DocumentTemplate> {
    try {
      const template = await this.getTemplate(id, tenantId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.status !== 'draft') {
        throw new Error(`Cannot activate template with status: ${template.status}`);
      }

      // Validate that all placeholders have configurations
      const unconfiguredPlaceholders = template.placeholders.filter(
        placeholder => !template.placeholderConfigs.find(
          config => config.placeholderName === placeholder.name
        )
      );

      if (unconfiguredPlaceholders.length > 0) {
        throw new Error(
          `Cannot activate template: ${unconfiguredPlaceholders.length} placeholders are not configured`
        );
      }

      return await this.updateTemplate(id, tenantId, { status: 'active' });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.activate',
        tenantId,
        templateId: id,
      });
      throw error;
    }
  }

  /**
   * Archive template (active → archived)
   */
  async archiveTemplate(
    id: string,
    tenantId: string
  ): Promise<DocumentTemplate> {
    try {
      const template = await this.getTemplate(id, tenantId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.status !== 'active') {
        throw new Error(`Cannot archive template with status: ${template.status}`);
      }

      return await this.updateTemplate(id, tenantId, { status: 'archived' });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.archive',
        tenantId,
        templateId: id,
      });
      throw error;
    }
  }

  /**
   * Update placeholder configurations
   */
  async updatePlaceholderConfigs(
    templateId: string,
    tenantId: string,
    configs: PlaceholderConfiguration[]
  ): Promise<DocumentTemplate> {
    try {
      const template = await this.getTemplate(templateId, tenantId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate that all configs reference existing placeholders
      const placeholderNames = new Set(template.placeholders.map(p => p.name));
      const invalidConfigs = configs.filter(
        config => !placeholderNames.has(config.placeholderName)
      );

      if (invalidConfigs.length > 0) {
        throw new Error(
          `Invalid placeholder configurations: ${invalidConfigs.map(c => c.placeholderName).join(', ')}`
        );
      }

      // Validate that all required fields are present
      for (const config of configs) {
        if (!config.description || config.description.trim().length === 0) {
          throw new Error(
            `Placeholder ${config.placeholderName} must have a description`
          );
        }
      }

      return await this.updateTemplate(templateId, tenantId, {
        placeholderConfigs: configs,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.updatePlaceholderConfigs',
        tenantId,
        templateId,
      });
      throw error;
    }
  }

  /**
   * Update template colors
   */
  async updateColors(
    id: string,
    tenantId: string,
    colors: string[]
  ): Promise<DocumentTemplate> {
    try {
      if (colors.length > this.config.templateMaxColors) {
        throw new Error(
          `Maximum ${this.config.templateMaxColors} colors allowed, got ${colors.length}`
        );
      }

      return await this.updateTemplate(id, tenantId, { dominantColors: colors });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.updateColors',
        tenantId,
        templateId: id,
      });
      throw error;
    }
  }

  /**
   * Create a new version of the template
   */
  async createVersion(
    templateId: string,
    tenantId: string,
    userId: string,
    changes: string
  ): Promise<TemplateVersion> {
    try {
      const template = await this.getTemplate(templateId, tenantId);
      if (!template) {
        throw new Error('Template not found');
      }

      const version: TemplateVersion = {
        versionNumber: template.currentVersion,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        changes,
        snapshot: {
          placeholders: template.placeholders,
          dominantColors: template.dominantColors,
        },
      };

      await this.repository.addVersion(templateId, tenantId, version);

      this.monitoring.trackEvent('content_generation.template.version.created', {
        tenantId,
        templateId,
        versionNumber: version.versionNumber,
      });

      return version;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.createVersion',
        tenantId,
        templateId,
      });
      throw error;
    }
  }

  /**
   * Get all versions for a template
   */
  async getVersions(
    templateId: string,
    tenantId: string
  ): Promise<TemplateVersion[]> {
    try {
      return await this.repository.getVersions(templateId, tenantId);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.getVersions',
        tenantId,
        templateId,
      });
      throw error;
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    templateId: string,
    tenantId: string,
    versionNumber: number
  ): Promise<DocumentTemplate> {
    try {
      const template = await this.repository.rollbackToVersion(
        templateId,
        tenantId,
        versionNumber
      );

      this.monitoring.trackEvent('content_generation.template.rollback', {
        tenantId,
        templateId,
        versionNumber,
      });

      return template;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'template.rollback',
        tenantId,
        templateId,
        versionNumber,
      });
      throw error;
    }
  }
}

