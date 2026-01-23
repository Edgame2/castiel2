// @ts-nocheck
/**
 * AI Chat Catalog Service
 * Manages project chat question templates and tenant configurations
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { CosmosDBService } from './cosmos-db.service.js';
import { CacheService } from './cache.service.js';
import type {
  ProjectChatQuestion,
  TenantChatCatalogConfig,
  CreateProjectChatQuestionInput,
  UpdateProjectChatQuestionInput,
  CreateTenantChatCatalogInput,
  UpdateTenantChatCatalogInput,
} from '../types/ai-chat-catalog.types.js';

const CACHE_TTL = 3600; // 1 hour

@Injectable()
export class AIChatCatalogService {
  private logger = new Logger(AIChatCatalogService.name);

  constructor(
    @Inject(CosmosDBService) private cosmosDb: CosmosDBService,
    @Inject(CacheService) private cache: CacheService
  ) {}

  /**
   * Create a new chat question (super admin only)
   */
  async createQuestion(
    input: CreateProjectChatQuestionInput,
    createdBy: string
  ): Promise<ProjectChatQuestion> {
    const now = new Date();
    const question: ProjectChatQuestion = {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question: input.question,
      description: input.description,
      category: input.category,
      estimatedTokens: input.estimatedTokens,
      isActive: input.isActive,
      tags: input.tags || [],
      createdAt: now,
      createdBy,
      updatedAt: now,
      updatedBy: createdBy,
      version: 1,
    };

    try {
      const container = this.cosmosDb.getContainer('ai-chat-catalog');
      await container.items.create(question);

      // Invalidate catalog cache
      await this.cache.delete('ai-catalog:all-questions');

      this.logger.log(`Created chat question ${question.id}`);
      return question;
    } catch (error) {
      this.logger.error('Failed to create chat question', error);
      throw error;
    }
  }

  /**
   * Update a chat question
   */
  async updateQuestion(
    questionId: string,
    input: UpdateProjectChatQuestionInput,
    updatedBy: string
  ): Promise<ProjectChatQuestion> {
    try {
      const container = this.cosmosDb.getContainer('ai-chat-catalog');
      const { resource: current } = await container.item(questionId).read<ProjectChatQuestion>();

      if (!current) {
        throw new Error(`Question ${questionId} not found`);
      }

      const updated: ProjectChatQuestion = {
        ...current,
        ...input,
        version: current.version + 1,
        updatedAt: new Date(),
        updatedBy,
        id: current.id,
        createdAt: current.createdAt,
        createdBy: current.createdBy,
      };

      await container.item(questionId).replace(updated);

      // Invalidate caches
      await this.cache.delete('ai-catalog:all-questions');

      this.logger.log(`Updated chat question ${questionId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update chat question ${questionId}`, error);
      throw error;
    }
  }

  /**
   * Get all active questions
   */
  async getAllQuestions(): Promise<ProjectChatQuestion[]> {
    // Try cache
    const cached = await this.cache.get<ProjectChatQuestion[]>('ai-catalog:all-questions');
    if (cached) {
      return cached;
    }

    try {
      const container = this.cosmosDb.getContainer('ai-chat-catalog');
      const { resources } = await container.items
        .query({
          query: `SELECT * FROM c WHERE c.isActive = true AND NOT IS_DEFINED(c.deprecated) ORDER BY c.category, c.question`,
        })
        .fetchAll();

      const questions = resources as ProjectChatQuestion[];
      await this.cache.set('ai-catalog:all-questions', questions, CACHE_TTL);
      return questions;
    } catch (error) {
      this.logger.error('Failed to get all questions', error);
      return [];
    }
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(category: string): Promise<ProjectChatQuestion[]> {
    const all = await this.getAllQuestions();
    return all.filter((q) => q.category === category);
  }

  /**
   * Delete a question (soft delete by marking deprecated)
   */
  async deleteQuestion(questionId: string, updatedBy: string): Promise<void> {
    await this.updateQuestion(
      questionId,
      {
        deprecated: true,
        isActive: false,
      },
      updatedBy
    );
  }

  /**
   * Get tenant chat catalog configuration
   */
  async getTenantCatalogConfig(tenantId: string): Promise<TenantChatCatalogConfig> {
    // Try cache
    const cacheKey = `tenant-chat-config:${tenantId}`;
    const cached = await this.cache.get<TenantChatCatalogConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const container = this.cosmosDb.getContainer('tenant-configs');
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.configType = @type',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@type', value: 'chat-catalog-config' },
          ],
        })
        .fetchAll();

      if (resources.length > 0) {
        const config = resources[0] as TenantChatCatalogConfig;
        await this.cache.set(cacheKey, config, CACHE_TTL);
        return config;
      }

      // Return default
      return this.getDefaultTenantCatalogConfig(tenantId);
    } catch (error) {
      this.logger.error(`Failed to get tenant chat config for ${tenantId}`, error);
      return this.getDefaultTenantCatalogConfig(tenantId);
    }
  }

  /**
   * Update tenant catalog configuration
   */
  async updateTenantCatalogConfig(
    tenantId: string,
    input: UpdateTenantChatCatalogInput,
    updatedBy: string
  ): Promise<TenantChatCatalogConfig> {
    const current = await this.getTenantCatalogConfig(tenantId);

    const updated: TenantChatCatalogConfig = {
      ...current,
      ...input,
      updatedAt: new Date(),
      updatedBy,
    };

    try {
      const container = this.cosmosDb.getContainer('tenant-configs');
      await container.items.upsert({
        id: `${tenantId}-chat-catalog-config`,
        tenantId,
        configType: 'chat-catalog-config',
        ...updated,
      });

      await this.cache.delete(`tenant-chat-config:${tenantId}`);
      this.logger.log(`Updated tenant chat config for ${tenantId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update tenant chat config for ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Get enabled questions for a tenant
   */
  async getTenantEnabledQuestions(tenantId: string): Promise<ProjectChatQuestion[]> {
    const config = await this.getTenantCatalogConfig(tenantId);
    const allQuestions = await this.getAllQuestions();

    // Filter to enabled questions + custom questions
    const enabled = allQuestions.filter((q) => config.enabledQuestionIds.includes(q.id));
    return [...enabled, ...config.customQuestions];
  }

  /**
   * Create custom question for tenant
   */
  async createCustomQuestion(
    tenantId: string,
    input: CreateProjectChatQuestionInput,
    createdBy: string
  ): Promise<ProjectChatQuestion> {
    const config = await this.getTenantCatalogConfig(tenantId);

    if (config.customQuestions.length >= config.maxCustomQuestions) {
      throw new Error(
        `Tenant custom question limit (${config.maxCustomQuestions}) reached`
      );
    }

    const now = new Date();
    const question: ProjectChatQuestion = {
      id: `custom-${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question: input.question,
      description: input.description,
      category: input.category,
      estimatedTokens: input.estimatedTokens,
      isActive: input.isActive,
      tags: input.tags || [],
      createdAt: now,
      createdBy,
      updatedAt: now,
      updatedBy: createdBy,
      version: 1,
    };

    config.customQuestions.push(question);
    config.updatedAt = now;
    config.updatedBy = createdBy;

    try {
      const container = this.cosmosDb.getContainer('tenant-configs');
      await container.items.upsert({
        id: `${tenantId}-chat-catalog-config`,
        tenantId,
        configType: 'chat-catalog-config',
        ...config,
      });

      await this.cache.delete(`tenant-chat-config:${tenantId}`);
      this.logger.log(`Created custom question for tenant ${tenantId}`);
      return question;
    } catch (error) {
      this.logger.error(`Failed to create custom question for tenant ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Get default tenant catalog configuration
   */
  private getDefaultTenantCatalogConfig(tenantId: string): TenantChatCatalogConfig {
    return {
      tenantId,
      enabledQuestionIds: [], // Will be populated with default questions
      enabledCategories: ['status', 'risks', 'timeline', 'resources'],
      customQuestions: [],
      maxCustomQuestions: 20,
      selectionMode: 'auto',
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }
}
