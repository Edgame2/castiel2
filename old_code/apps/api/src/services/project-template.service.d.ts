/**
 * Project Template Service
 * Manages template CRUD, instantiation, gallery, and recommendations
 * Super admin manages templates, users instantiate them into projects
 */
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { ProjectTemplate, TemplateGalleryItem, TemplatePreview, CreateTemplateInput, UpdateTemplateInput, InstantiateTemplateInput, TemplateUsageStats, TemplateQueryParams, BatchInstantiateInput, BatchInstantiateResult } from '../types/project-template.types';
export declare class ProjectTemplateService {
    private cosmosDB;
    private cache;
    private readonly logger;
    private readonly TEMPLATE_CACHE_TTL;
    private readonly GALLERY_CACHE_TTL;
    private readonly STATS_CACHE_TTL;
    constructor(cosmosDB: CosmosDBService, cache: CacheService);
    /**
     * Create new template (super admin only)
     */
    createTemplate(tenantId: string, input: CreateTemplateInput, createdByUserId: string): Promise<ProjectTemplate>;
    /**
     * Update existing template (super admin only)
     */
    updateTemplate(templateId: string, input: UpdateTemplateInput, updatedByUserId: string): Promise<ProjectTemplate>;
    /**
     * Get template by ID
     */
    getTemplate(templateId: string): Promise<ProjectTemplate | null>;
    /**
     * Get template gallery with filtering
     */
    getTemplateGallery(tenantId: string, params?: TemplateQueryParams): Promise<{
        items: TemplateGalleryItem[];
        total: number;
    }>;
    /**
     * Get template preview with full details
     */
    getTemplatePreview(templateId: string): Promise<TemplatePreview | null>;
    /**
     * Instantiate template into new project
     */
    instantiateTemplate(tenantId: string, templateId: string, input: InstantiateTemplateInput, userId: string, userDisplayName: string): Promise<{
        projectId: string;
        templateInstanceId: string;
    }>;
    /**
     * Batch instantiate template into multiple projects
     */
    batchInstantiateTemplate(tenantId: string, templateId: string, input: BatchInstantiateInput, userId: string, userDisplayName: string): Promise<BatchInstantiateResult>;
    /**
     * Get template usage statistics
     */
    getTemplateStats(templateId: string): Promise<TemplateUsageStats | null>;
    /**
     * Mark setup item as complete
     */
    completeSetupItem(tenantId: string, instanceId: string, itemId: string): Promise<void>;
    /**
     * Delete template (soft delete via isActive flag)
     */
    deleteTemplate(templateId: string): Promise<void>;
    /**
     * Helper: Create setup checklist from template
     */
    private createSetupChecklist;
    /**
     * Helper: Log activity
     */
    private logActivity;
}
//# sourceMappingURL=project-template.service.d.ts.map