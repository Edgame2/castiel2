import { CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ContentTemplate, CreateTemplateInput, UpdateTemplateInput } from '../../types/content-template.types.js';
export declare class TemplateService {
    private monitoring;
    private container;
    constructor(monitoring: IMonitoringProvider, cosmosClient: CosmosClient);
    /**
     * Create a new template
     */
    createTemplate(tenantId: string, input: CreateTemplateInput, createdBy: string): Promise<ContentTemplate>;
    /**
     * Get a template by ID
     */
    getTemplate(id: string, tenantId: string): Promise<ContentTemplate | null>;
    /**
     * List templates for a tenant (including system templates)
     */
    listTemplates(tenantId: string, options?: {
        category?: string;
        tags?: string[];
        search?: string;
    }): Promise<ContentTemplate[]>;
    /**
     * Update a template
     */
    updateTemplate(id: string, tenantId: string, input: UpdateTemplateInput, updatedBy: string): Promise<ContentTemplate>;
    /**
     * Delete a template
     */
    deleteTemplate(id: string, tenantId: string): Promise<void>;
    /**
     * Extract variables from content (e.g., {{variable}})
     */
    private extractVariables;
    /**
     * Clone a template
     */
    cloneTemplate(id: string, tenantId: string, userId: string): Promise<ContentTemplate>;
    /**
     * Import a template from a file (Mock implementation)
     */
    importTemplate(tenantId: string, userId: string, file: {
        name: string;
        buffer: Buffer;
        type: string;
    }): Promise<ContentTemplate>;
}
//# sourceMappingURL=template.service.d.ts.map