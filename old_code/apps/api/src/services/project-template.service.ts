// @ts-nocheck
/**
 * Project Template Service
 * Manages template CRUD, instantiation, gallery, and recommendations
 * Super admin manages templates, users instantiate them into projects
 */

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import {
  ProjectTemplate,
  TemplateInstance,
  TemplateCategory,
  TemplateGalleryItem,
  TemplatePreview,
  CreateTemplateInput,
  UpdateTemplateInput,
  InstantiateTemplateInput,
  TemplateUsageStats,
  TemplateQueryParams,
  BatchInstantiateInput,
  BatchInstantiateResult,
} from '../types/project-template.types';
import { ProjectActivity, ProjectActivityType, ActivitySeverity, CreateActivityInput } from '../types/project-activity.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectTemplateService {
  private readonly logger = new Logger(ProjectTemplateService.name);
  private readonly TEMPLATE_CACHE_TTL = 3600; // 1 hour
  private readonly GALLERY_CACHE_TTL = 1800; // 30 minutes
  private readonly STATS_CACHE_TTL = 3600; // 1 hour

  constructor(
    @Inject(CosmosDBService) private cosmosDB: CosmosDBService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  /**
   * Create new template (super admin only)
   */
  async createTemplate(
    tenantId: string,
    input: CreateTemplateInput,
    createdByUserId: string,
  ): Promise<ProjectTemplate> {
    try {
      // Validate input
      if (!input.name || !input.description || !input.category) {
        throw new BadRequestException('name, description, and category are required');
      }

      const template: ProjectTemplate = {
        id: uuidv4(),
        tenantId: input.isPublic ? 'system' : tenantId,
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        linkedShards: input.linkedShards || [],
        aiChatQuestions: input.aiChatQuestions || [],
        projectConfigDefaults: input.projectConfigDefaults,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: createdByUserId,
        updatedBy: createdByUserId,
        isActive: true,
        isPublic: input.isPublic,
        allowedTenants: input.allowedTenants,
        usageCount: 0,
        iconUrl: input.iconUrl,
        overview: input.overview,
        detailedDescription: input.detailedDescription,
        metadata: input.metadata,
      };

      await this.cosmosDB.upsertDocument('project-templates', template, input.isPublic ? 'system' : tenantId);
      await this.cache.delete(`templates:${tenantId}:gallery`);

      this.logger.log(`Created template ${template.id}: ${input.name}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing template (super admin only)
   */
  async updateTemplate(
    templateId: string,
    input: UpdateTemplateInput,
    updatedByUserId: string,
  ): Promise<ProjectTemplate> {
    try {
      const template = await this.cosmosDB.getDocument('project-templates', templateId, 'system');
      if (!template) {
        throw new NotFoundException(`Template ${templateId} not found`);
      }

      // Update fields
      if (input.name) {template.name = input.name;}
      if (input.description) {template.description = input.description;}
      if (input.category) {template.category = input.category;}
      if (input.tags) {template.tags = input.tags;}
      if (input.linkedShards) {template.linkedShards = input.linkedShards;}
      if (input.aiChatQuestions) {template.aiChatQuestions = input.aiChatQuestions;}
      if (input.projectConfigDefaults) {template.projectConfigDefaults = input.projectConfigDefaults;}
      if (input.isPublic !== undefined) {template.isPublic = input.isPublic;}
      if (input.allowedTenants) {template.allowedTenants = input.allowedTenants;}
      if (input.iconUrl) {template.iconUrl = input.iconUrl;}
      if (input.isActive !== undefined) {template.isActive = input.isActive;}
      if (input.metadata) {template.metadata = input.metadata;}

      // Increment version and update timestamps
      template.version++;
      template.updatedAt = new Date();
      template.updatedBy = updatedByUserId;

      const tenantId = template.isPublic ? 'system' : template.tenantId;
      await this.cosmosDB.upsertDocument('project-templates', template, tenantId);

      // Invalidate caches
      await this.cache.delete(`template:${templateId}`);
      await this.cache.delete(`templates:${tenantId}:gallery`);

      this.logger.log(`Updated template ${templateId} to version ${template.version}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ProjectTemplate | null> {
    try {
      const cacheKey = `template:${templateId}`;
      const cached = await this.cache.get<ProjectTemplate>(cacheKey);
      if (cached) {return cached;}

      const template = await this.cosmosDB.getDocument('project-templates', templateId, 'system');
      if (template) {
        await this.cache.set(cacheKey, template, this.TEMPLATE_CACHE_TTL);
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get template: ${error.message}`);
      return null;
    }
  }

  /**
   * Get template gallery with filtering
   */
  async getTemplateGallery(
    tenantId: string,
    params: TemplateQueryParams = {},
  ): Promise<{ items: TemplateGalleryItem[]; total: number }> {
    try {
      const cacheKey = `templates:${tenantId}:gallery:${JSON.stringify(params)}`;
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {return cached;}

      // Build query
      let query = `
        SELECT t.id, t.name, t.overview, t.iconUrl, t.category, t.tags,
               t.averageRating, t.usageCount, t.createdAt
        FROM project_templates t
        WHERE t.isActive = true AND (t.isPublic = true OR t.tenantId = @tenantId
                                     OR ARRAY_CONTAINS(t.allowedTenants, @tenantId))
      `;

      const parameters = [{ name: '@tenantId', value: tenantId }];

      // Apply filters
      if (params.category) {
        query += ` AND t.category = @category`;
        parameters.push({ name: '@category', value: params.category });
      }

      if (params.tags && params.tags.length > 0) {
        const tagChecks = params.tags.map((_, i) => `ARRAY_CONTAINS(t.tags, @tag${i})`).join(' AND ');
        query += ` AND (${tagChecks})`;
        params.tags.forEach((tag, i) => {
          parameters.push({ name: `@tag${i}`, value: tag });
        });
      }

      if (params.searchText) {
        query += ` AND (CONTAINS(t.name, @search) OR CONTAINS(t.description, @search))`;
        parameters.push({ name: '@search', value: params.searchText });
      }

      if (params.difficulty && params.metadata) {
        query += ` AND t.metadata.difficulty = @difficulty`;
        parameters.push({ name: '@difficulty', value: params.difficulty });
      }

      // Apply sorting
      const sortBy = params.sortBy || 'usageCount';
      const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';

      let orderByField = 't.usageCount';
      if (sortBy === 'name') {orderByField = 't.name';}
      if (sortBy === 'rating') {orderByField = 't.averageRating';}
      if (sortBy === 'createdAt') {orderByField = 't.createdAt';}
      if (sortBy === 'trending') {orderByField = 't.usageCount';} // Could be more sophisticated

      query += ` ORDER BY ${orderByField} ${sortDir}`;

      // Get total count first
      const countQuery = query.replace(
        /SELECT t\.id, t\.name.*FROM/,
        'SELECT VALUE COUNT(1) FROM',
      );

      const [countResult] = await this.cosmosDB.queryDocuments<number>(
        'project-templates',
        countQuery,
        parameters,
        'system',
      );

      const total = countResult || 0;

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const templates = await this.cosmosDB.queryDocuments<any>(
        'project-templates',
        query,
        parameters,
        'system',
      );

      const items: TemplateGalleryItem[] = templates.map((t) => ({
        id: t.id,
        name: t.name,
        overview: t.overview,
        iconUrl: t.iconUrl,
        category: t.category,
        tags: t.tags,
        rating: t.averageRating,
        usageCount: t.usageCount,
        isNew: (new Date().getTime() - new Date(t.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000,
        isTrending: t.usageCount > 100,
      }));

      const result = { items, total };
      await this.cache.set(cacheKey, result, this.GALLERY_CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get template gallery: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template preview with full details
   */
  async getTemplatePreview(templateId: string): Promise<TemplatePreview | null> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {return null;}

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        detailedDescription: template.detailedDescription,
        category: template.category,
        tags: template.tags,
        estimatedSetupTime: template.metadata?.estimatedSetupTime,
        difficulty: template.metadata?.difficulty,
        linkedShardsPreview: template.linkedShards.map((s) => ({
          name: s.name,
          type: s.shardQuery.type,
          relationshipType: s.relationshipType,
        })),
        questionsPreview: template.aiChatQuestions.map(
          (q) => q.customQuestion || q.questionId || 'Question',
        ),
        configPreview: template.projectConfigDefaults || {},
        demoProjectUrl: template.demoProjectId ? `/projects/${template.demoProjectId}` : undefined,
        ratings: {
          average: template.averageRating,
          count: template.ratingCount || 0,
          distribution: {}, // Could be expanded
        },
        similarTemplates: [], // Could be computed based on tags/category
      };
    } catch (error) {
      this.logger.error(`Failed to get template preview: ${error.message}`);
      return null;
    }
  }

  /**
   * Instantiate template into new project
   */
  async instantiateTemplate(
    tenantId: string,
    templateId: string,
    input: InstantiateTemplateInput,
    userId: string,
    userDisplayName: string,
  ): Promise<{ projectId: string; templateInstanceId: string }> {
    try {
      // Validate input
      if (!input.projectName) {
        throw new BadRequestException('projectName is required');
      }

      // Get template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new NotFoundException(`Template ${templateId} not found`);
      }

      // Check access
      if (!template.isPublic && template.tenantId !== tenantId) {
        if (!template.allowedTenants?.includes(tenantId)) {
          throw new ForbiddenException('This template is not available for your tenant');
        }
      }

      // Create new project from template
      const projectId = uuidv4();
      const project = {
        id: projectId,
        tenantId,
        name: input.projectName,
        description: input.projectDescription,
        ownerId: input.ownerId || userId,
        ownerDisplayName: userDisplayName,
        linkedShards: input.selectedShardIds || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdFromTemplateId: templateId,
        ...input.configOverrides,
      };

      await this.cosmosDB.upsertDocument('projects', project, tenantId);

      // Create template instance record
      const instanceId = uuidv4();
      const instance: TemplateInstance = {
        id: instanceId,
        tenantId,
        projectId,
        templateId,
        templateName: template.name,
        templateVersion: template.version,
        createdBy: userId,
        createdAt: new Date(),
        customizations: {
          selectedShardIds: input.selectedShardIds,
          selectedQuestionIds: input.selectedQuestionIds,
          additionalShards: input.additionalShards,
          configOverrides: input.configOverrides,
        },
        isSetupComplete: false,
        setupProgress: 0,
        setupChecklist: this.createSetupChecklist(template, input),
      };

      await this.cosmosDB.upsertDocument('project-template-instances', instance, tenantId);

      // Increment usage count
      template.usageCount++;
      await this.cosmosDB.upsertDocument('project-templates', template, template.isPublic ? 'system' : template.tenantId);

      // Invalidate stats cache
      await this.cache.delete(`template-stats:${templateId}`);

      // Log activity
      await this.logActivity(tenantId, projectId, {
        type: ProjectActivityType.TEMPLATE_USED,
        actorUserId: userId,
        actorDisplayName: userDisplayName,
        description: `${userDisplayName} created project from template "${template.name}"`,
        severity: ActivitySeverity.LOW,
        details: {
          templateId,
          templateName: template.name,
        },
      });

      this.logger.log(`Template ${templateId} instantiated into project ${projectId}`);
      return { projectId, templateInstanceId: instanceId };
    } catch (error) {
      this.logger.error(`Failed to instantiate template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch instantiate template into multiple projects
   */
  async batchInstantiateTemplate(
    tenantId: string,
    templateId: string,
    input: BatchInstantiateInput,
    userId: string,
    userDisplayName: string,
  ): Promise<BatchInstantiateResult> {
    try {
      const operationId = uuidv4();
      const projectIds: string[] = [];
      const failures: BatchInstantiateResult['failures'] = [];

      for (let i = 0; i < input.count; i++) {
        try {
          const projectName = input.projectNameTemplate
            .replace('{n}', String(i + 1))
            .replace('{uuid}', uuidv4());

          const ownerId = input.ownerIds ? input.ownerIds[i % input.ownerIds.length] : userId;

          const result = await this.instantiateTemplate(
            tenantId,
            templateId,
            {
              projectName,
              configOverrides: input.configOverrides,
            },
            userId,
            userDisplayName,
          );

          projectIds.push(result.projectId);
        } catch (error) {
          failures.push({
            index: i,
            projectName: input.projectNameTemplate.replace('{n}', String(i + 1)),
            error: error.message,
          });
        }
      }

      const result: BatchInstantiateResult = {
        operationId,
        createdCount: projectIds.length,
        failureCount: failures.length,
        projectIds,
        failures,
        timestamp: new Date(),
      };

      this.logger.log(
        `Batch instantiated ${projectIds.length}/${input.count} projects from template ${templateId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to batch instantiate template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<TemplateUsageStats | null> {
    try {
      const cacheKey = `template-stats:${templateId}`;
      const cached = await this.cache.get<TemplateUsageStats>(cacheKey);
      if (cached) {return cached;}

      const template = await this.getTemplate(templateId);
      if (!template) {return null;}

      // Query instances
      const query = `
        SELECT COUNT(1) as count, i.tenantId
        FROM project_template_instances i
        WHERE i.templateId = @templateId
        GROUP BY i.tenantId
      `;

      const instances = await this.cosmosDB.queryDocuments<any>(
        'project-template-instances',
        query,
        [{ name: '@templateId', value: templateId }],
        '',
      );

      const instantiationsByTenant: Record<string, number> = {};
      let totalInstantiations = 0;

      instances.forEach((inst) => {
        instantiationsByTenant[inst.tenantId] = inst.count;
        totalInstantiations += inst.count;
      });

      const stats: TemplateUsageStats = {
        templateId,
        templateName: template.name,
        totalInstantiations,
        instantiationsByTenant,
        averageRating: template.averageRating,
        isTopRated: (template.averageRating || 0) >= 4.5,
        isTrending: template.usageCount > 50,
        activeInstanceCount: totalInstantiations,
      };

      await this.cache.set(cacheKey, stats, this.STATS_CACHE_TTL);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get template stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Mark setup item as complete
   */
  async completeSetupItem(
    tenantId: string,
    instanceId: string,
    itemId: string,
  ): Promise<void> {
    try {
      const instance = await this.cosmosDB.getDocument(
        'project-template-instances',
        instanceId,
        tenantId,
      );
      if (!instance) {
        throw new NotFoundException(`Template instance ${instanceId} not found`);
      }

      if (instance.setupChecklist) {
        const item = instance.setupChecklist.find((i) => i.id === itemId);
        if (item) {
          item.isCompleted = true;
          item.completedAt = new Date();

          // Calculate progress
          const completedCount = instance.setupChecklist.filter((i) => i.isCompleted).length;
          instance.setupProgress = Math.round((completedCount / instance.setupChecklist.length) * 100);

          if (instance.setupProgress === 100) {
            instance.isSetupComplete = true;
          }

          await this.cosmosDB.upsertDocument('project-template-instances', instance, tenantId);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to complete setup item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete template (soft delete via isActive flag)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.cosmosDB.getDocument('project-templates', templateId, 'system');
      if (!template) {
        throw new NotFoundException(`Template ${templateId} not found`);
      }

      template.isActive = false;
      await this.cosmosDB.upsertDocument(
        'project-templates',
        template,
        template.isPublic ? 'system' : template.tenantId,
      );

      await this.cache.delete(`template:${templateId}`);
      this.logger.log(`Deleted template ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Create setup checklist from template
   */
  private createSetupChecklist(
    template: ProjectTemplate,
    input: InstantiateTemplateInput,
  ): TemplateInstance['setupChecklist'] {
    const checklist = [
      {
        id: 'link-shards',
        title: 'Link Shards',
        description: `Link ${template.linkedShards.length} recommended shards`,
        isCompleted: (input.selectedShardIds?.length || 0) > 0,
      },
      {
        id: 'configure-ai-chat',
        title: 'Configure AI Chat Questions',
        description: `Enable ${template.aiChatQuestions.length} AI chat questions`,
        isCompleted: (input.selectedQuestionIds?.length || 0) > 0,
      },
      {
        id: 'invite-collaborators',
        title: 'Invite Collaborators',
        description: 'Add team members to the project',
        isCompleted: false,
      },
      {
        id: 'customize-settings',
        title: 'Customize Project Settings',
        description: 'Adjust project configuration as needed',
        isCompleted: Object.keys(input.configOverrides || {}).length > 0,
      },
    ];

    return checklist.map((item) => ({
      ...item,
      completedAt: item.isCompleted ? new Date() : undefined,
    }));
  }

  /**
   * Helper: Log activity
   */
  private async logActivity(
    tenantId: string,
    projectId: string,
    input: Partial<CreateActivityInput>,
  ): Promise<void> {
    try {
      const activity: ProjectActivity = {
        id: uuidv4(),
        tenantId,
        projectId,
        type: input.type!,
        actorUserId: input.actorUserId!,
        actorDisplayName: input.actorDisplayName!,
        description: input.description!,
        severity: input.severity!,
        details: input.details || {},
        timestamp: new Date(),
        ttl: 7776000, // 90 days
      };

      await this.cosmosDB.upsertDocument('project-activities', activity, tenantId);
    } catch (error) {
      this.logger.warn(`Failed to log activity: ${error.message}`);
    }
  }
}
