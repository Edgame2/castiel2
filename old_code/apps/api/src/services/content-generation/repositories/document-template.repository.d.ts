/**
 * Document Template Repository
 *
 * Cosmos DB repository for document templates (Content Generation system)
 * Container: document-templates
 * Partition Key: /tenantId
 */
import { CosmosClient } from '@azure/cosmos';
import { DocumentTemplate, CreateTemplateRequest, UpdateTemplateRequest, TemplateFilters, TemplateVersion } from '../types/template.types.js';
export declare class DocumentTemplateRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Create a new document template
     */
    create(tenantId: string, userId: string, input: CreateTemplateRequest): Promise<DocumentTemplate>;
    /**
     * Get template by ID
     */
    getById(id: string, tenantId: string): Promise<DocumentTemplate | null>;
    /**
     * Update template
     */
    update(id: string, tenantId: string, updates: UpdateTemplateRequest): Promise<DocumentTemplate | null>;
    /**
     * Delete template
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * List templates with filters
     */
    list(tenantId: string, filters?: TemplateFilters): Promise<DocumentTemplate[]>;
    /**
     * List active templates (for users)
     */
    listActive(tenantId: string, filters?: {
        documentFormat?: string;
    }): Promise<DocumentTemplate[]>;
    /**
     * Add version to template (max 5 versions)
     */
    addVersion(templateId: string, tenantId: string, version: TemplateVersion): Promise<void>;
    /**
     * Get all versions for a template
     */
    getVersions(templateId: string, tenantId: string): Promise<TemplateVersion[]>;
    /**
     * Rollback to a specific version
     */
    rollbackToVersion(templateId: string, tenantId: string, versionNumber: number): Promise<DocumentTemplate>;
}
//# sourceMappingURL=document-template.repository.d.ts.map