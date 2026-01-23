/**
 * Insight Templates Library Service
 * Pre-built and customizable templates for common insight use cases
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface InsightTemplate {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: TemplateCategory;
    type: 'system' | 'community' | 'custom';
    isPublic: boolean;
    promptTemplate: string;
    systemPrompt?: string;
    outputFormat: OutputFormat;
    config: TemplateConfig;
    variables: TemplateVariable[];
    requirements: TemplateRequirements;
    tags: string[];
    usageCount: number;
    rating: number;
    ratingCount: number;
    tenantId?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export type TemplateCategory = 'sales' | 'marketing' | 'customer_success' | 'product' | 'operations' | 'finance' | 'hr' | 'general' | 'custom';
export type OutputFormat = 'text' | 'markdown' | 'bullet_list' | 'numbered_list' | 'table' | 'json' | 'html';
export interface TemplateConfig {
    modelPreference?: 'economy' | 'standard' | 'premium';
    temperature?: number;
    maxTokens?: number;
    contextTemplateId?: string;
    shardTypeIds?: string[];
    maxContextTokens?: number;
    responseLength?: 'brief' | 'standard' | 'detailed';
    includeReferences?: boolean;
    includeSuggestions?: boolean;
}
export interface TemplateVariable {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date' | 'shard_reference';
    required: boolean;
    default?: unknown;
    options?: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
    description?: string;
}
export interface TemplateRequirements {
    minShards?: number;
    shardTypes?: string[];
    features?: string[];
}
export interface TemplateExecution {
    templateId: string;
    variables: Record<string, unknown>;
    tenantId: string;
    userId: string;
}
export declare class InsightTemplatesService {
    private readonly redis;
    private readonly monitoring;
    private readonly TEMPLATES_KEY;
    private readonly USAGE_KEY;
    private systemTemplatesLoaded;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Initialize system templates
     */
    initializeSystemTemplates(): Promise<void>;
    /**
     * Create a custom template
     */
    createTemplate(tenantId: string, userId: string, template: Omit<InsightTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating' | 'ratingCount' | 'tenantId' | 'createdBy'>): Promise<InsightTemplate>;
    /**
     * Update a template
     */
    updateTemplate(templateId: string, tenantId: string, updates: Partial<InsightTemplate>): Promise<InsightTemplate | null>;
    /**
     * Delete a template
     */
    deleteTemplate(templateId: string, tenantId: string): Promise<boolean>;
    /**
     * Get template by ID
     */
    getTemplate(templateId: string, tenantId: string): Promise<InsightTemplate | null>;
    /**
     * Get template by name
     */
    getTemplateByName(name: string, tenantId: string): Promise<InsightTemplate | null>;
    /**
     * List templates
     */
    listTemplates(tenantId: string, options?: {
        category?: TemplateCategory;
        type?: 'system' | 'community' | 'custom';
        search?: string;
    }): Promise<InsightTemplate[]>;
    /**
     * Get templates by category
     */
    getTemplatesByCategory(tenantId: string): Promise<Record<TemplateCategory, InsightTemplate[]>>;
    /**
     * Build the final prompt from a template
     */
    buildPrompt(templateId: string, tenantId: string, variables: Record<string, unknown>, context: string): Promise<string>;
    /**
     * Clone a template for customization
     */
    cloneTemplate(templateId: string, tenantId: string, userId: string, newName: string): Promise<InsightTemplate>;
    /**
     * Rate a template
     */
    rateTemplate(templateId: string, tenantId: string, rating: number): Promise<void>;
    private saveTemplate;
    private recordUsage;
    private getTemplateKey;
}
export declare function createInsightTemplatesService(redis: Redis, monitoring: IMonitoringProvider): InsightTemplatesService;
//# sourceMappingURL=insight-templates.service.d.ts.map