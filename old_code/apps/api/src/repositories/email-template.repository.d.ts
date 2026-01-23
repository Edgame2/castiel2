/**
 * Email Template Repository
 * Handles all Cosmos DB operations for email templates
 */
import { CosmosClient } from '@azure/cosmos';
import { EmailTemplateDocument, TemplateFilters, PaginationOptions, PaginatedResult, LanguageVariant } from '../types/email-template.types.js';
/**
 * Email Template Repository
 */
export declare class EmailTemplateRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Create email template
     */
    create(template: Omit<EmailTemplateDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplateDocument>;
    /**
     * Update email template
     */
    update(id: string, tenantId: string, updates: Partial<Omit<EmailTemplateDocument, 'id' | 'tenantId' | 'name' | 'language' | 'createdAt' | 'createdBy'>>): Promise<EmailTemplateDocument | null>;
    /**
     * Delete email template
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Find template by ID
     */
    findById(id: string, tenantId: string): Promise<EmailTemplateDocument | null>;
    /**
     * Find template by name and language
     */
    findByNameAndLanguage(name: string, language: string, tenantId: string): Promise<EmailTemplateDocument | null>;
    /**
     * Find all language variants of a template
     */
    findByName(name: string, tenantId: string): Promise<EmailTemplateDocument[]>;
    /**
     * List templates with filters and pagination
     */
    list(filters: TemplateFilters, pagination: PaginationOptions): Promise<PaginatedResult<EmailTemplateDocument>>;
    /**
     * Get all language variants of a template
     */
    getLanguageVariants(name: string, tenantId: string): Promise<LanguageVariant[]>;
    /**
     * Check if template exists
     */
    exists(name: string, language: string, tenantId: string): Promise<boolean>;
}
//# sourceMappingURL=email-template.repository.d.ts.map