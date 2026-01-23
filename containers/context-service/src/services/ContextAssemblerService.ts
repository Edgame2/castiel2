/**
 * Context Assembler Service
 * Handles dynamic context assembly with token budgeting and compression
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContextService } from './ContextService';
import {
  ContextAssembly,
  ContextAssemblyRequest,
  AssembleContextInput,
  ContextType,
  ContextScope,
} from '../types/context.types';

export class ContextAssemblerService {
  private containerName = 'context_assemblies';
  private contextService: ContextService;

  constructor(contextService: ContextService) {
    this.contextService = contextService;
  }

  /**
   * Assemble context for a task
   */
  async assemble(
    input: AssembleContextInput,
    tenantId: string,
    userId: string
  ): Promise<ContextAssembly> {
    if (!input.task || !input.scope) {
      throw new BadRequestError('task and scope are required');
    }

    const maxTokens = input.maxTokens || 100000; // Default token budget
    const maxFiles = input.maxFiles || 50;
    const relevanceThreshold = input.relevanceThreshold || 0.3;

    // Get relevant contexts
    const contexts = await this.findRelevantContexts(
      input,
      tenantId,
      maxFiles,
      relevanceThreshold
    );

    // Score and rank contexts
    const scoredContexts = await this.scoreContexts(contexts, input.task, tenantId);

    // Select contexts within token budget
    const selectedContexts = this.selectContexts(
      scoredContexts,
      maxTokens,
      input.compression
    );

    // Create assembly record
    const assembly: ContextAssembly = {
      id: uuidv4(),
      tenantId,
      requestId: uuidv4(), // In a real implementation, this would track the request
      contexts: selectedContexts.map((ctx) => ({
        contextId: ctx.id,
        type: ctx.type,
        path: ctx.path,
        name: ctx.name,
        relevanceScore: ctx.relevanceScore || 0,
        tokenCount: ctx.tokenCount || 0,
        snippet: this.extractSnippet(ctx.content),
      })),
      totalTokens: selectedContexts.reduce((sum, ctx) => sum + (ctx.tokenCount || 0), 0),
      assembledAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour cache
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(assembly, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create context assembly');
      }

      return resource as ContextAssembly;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Find relevant contexts
   */
  private async findRelevantContexts(
    input: AssembleContextInput,
    tenantId: string,
    maxFiles: number,
    relevanceThreshold: number
  ): Promise<any[]> {
    const filters: any = {
      scope: input.scope,
      limit: maxFiles,
    };

    if (input.includeTypes && input.includeTypes.length > 0) {
      // Filter by type if specified
      // In a real implementation, we'd query by type
    }

    if (input.targetPath) {
      filters.path = input.targetPath;
    }

    const { items } = await this.contextService.list(tenantId, filters);

    // Include dependencies if requested
    if (input.includeDependencies) {
      const contextsWithDeps = await Promise.all(
        items.map(async (ctx) => {
          if (ctx.dependencies && ctx.dependencies.length > 0) {
            const deps = await Promise.all(
              ctx.dependencies.map((depId) =>
                this.contextService.getById(depId, tenantId).catch(() => null)
              )
            );
            return [...items, ...deps.filter(Boolean)];
          }
          return items;
        })
      );
      return contextsWithDeps.flat();
    }

    return items;
  }

  /**
   * Score contexts for relevance
   */
  private async scoreContexts(
    contexts: any[],
    task: string,
    tenantId: string
  ): Promise<Array<any & { relevanceScore: number }>> {
    // Placeholder scoring logic
    // In a real implementation, this would use embeddings and semantic similarity
    return contexts.map((ctx) => ({
      ...ctx,
      relevanceScore: this.calculateRelevanceScore(ctx, task),
    }));
  }

  /**
   * Calculate relevance score (placeholder)
   */
  private calculateRelevanceScore(context: any, task: string): number {
    // Placeholder: simple keyword matching
    const taskLower = task.toLowerCase();
    const contextName = (context.name || '').toLowerCase();
    const contextPath = (context.path || '').toLowerCase();

    let score = 0.5; // Base score

    if (contextName.includes(taskLower) || taskLower.includes(contextName)) {
      score += 0.3;
    }

    if (contextPath.includes(taskLower) || taskLower.includes(contextPath)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Select contexts within token budget
   */
  private selectContexts(
    scoredContexts: Array<any & { relevanceScore: number }>,
    maxTokens: number,
    compression?: boolean
  ): any[] {
    // Sort by relevance score (descending)
    const sorted = scoredContexts.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const selected: any[] = [];
    let totalTokens = 0;

    for (const ctx of sorted) {
      const ctxTokens = ctx.tokenCount || 0;
      if (totalTokens + ctxTokens <= maxTokens) {
        selected.push(ctx);
        totalTokens += ctxTokens;
      } else {
        // Try to fit compressed version if compression is enabled
        if (compression && ctxTokens > 0) {
          const compressedTokens = Math.floor(ctxTokens * 0.5); // 50% compression
          if (totalTokens + compressedTokens <= maxTokens) {
            selected.push({
              ...ctx,
              tokenCount: compressedTokens,
              compressed: true,
            });
            totalTokens += compressedTokens;
          }
        }
      }
    }

    return selected;
  }

  /**
   * Extract relevant snippet from content
   */
  private extractSnippet(content?: string, maxLength: number = 500): string | undefined {
    if (!content) return undefined;

    if (content.length <= maxLength) {
      return content;
    }

    // Extract first and last parts
    const start = content.substring(0, maxLength / 2);
    const end = content.substring(content.length - maxLength / 2);
    return `${start}...${end}`;
  }

  /**
   * Get assembly by ID
   */
  async getById(assemblyId: string, tenantId: string): Promise<ContextAssembly> {
    if (!assemblyId || !tenantId) {
      throw new BadRequestError('assemblyId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(assemblyId, tenantId).read<ContextAssembly>();

      if (!resource) {
        throw new NotFoundError(`Context assembly ${assemblyId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Context assembly ${assemblyId} not found`);
      }
      throw error;
    }
  }
}

