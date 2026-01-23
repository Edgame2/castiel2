/**
 * Prompt Service
 * Handles prompt template management and rendering
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  PromptTemplate,
  PromptVersion,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  RenderPromptInput,
  PromptStatus,
  PromptVariable,
} from '../types/prompt.types';

export class PromptService {
  private promptContainerName = 'prompt_prompts';
  private versionContainerName = 'prompt_versions';

  /**
   * Validate variable interpolation
   */
  private validateVariables(content: string, variables: Record<string, any>, requiredVars?: PromptVariable[]): void {
    // Extract variables from content ({{variable}} syntax)
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = Array.from(content.matchAll(variableRegex));
    const contentVars = new Set(matches.map((m) => m[1]));

    // Check required variables
    if (requiredVars) {
      for (const varDef of requiredVars) {
        if (varDef.required && !variables[varDef.name]) {
          if (varDef.defaultValue === undefined) {
            throw new BadRequestError(`Required variable '${varDef.name}' is missing`);
          }
        }
      }
    }

    // Check that all variables in content are provided (or have defaults)
    for (const varName of contentVars) {
      if (!variables[varName] && !requiredVars?.find((v) => v.name === varName && v.defaultValue !== undefined)) {
        throw new BadRequestError(`Variable '${varName}' is missing`);
      }
    }
  }

  /**
   * Render prompt with variable substitution
   */
  private renderPrompt(content: string, variables: Record<string, any>): string {
    let rendered = content;

    // Replace {{variable}} with values
    const variableRegex = /\{\{(\w+)\}\}/g;
    rendered = rendered.replace(variableRegex, (match, varName) => {
      const value = variables[varName];
      if (value === undefined || value === null) {
        return match; // Keep original if not provided
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });

    return rendered;
  }

  /**
   * Create prompt template
   */
  async create(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
    if (!input.tenantId || !input.slug || !input.content) {
      throw new BadRequestError('tenantId, slug, and content are required');
    }

    // Check if slug already exists
    const existing = await this.getBySlug(input.tenantId, input.slug, input.organizationId).catch(() => null);
    if (existing) {
      throw new BadRequestError(`Prompt template with slug '${input.slug}' already exists`);
    }

    const prompt: PromptTemplate = {
      id: uuidv4(),
      tenantId: input.tenantId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      content: input.content,
      variables: input.variables || [],
      version: 1,
      status: PromptStatus.DRAFT,
      isDefault: true,
      organizationId: input.organizationId,
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.promptContainerName);
      const { resource } = await container.items.create(prompt, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create prompt template');
      }

      // Create initial version
      await this.createVersion(input.tenantId, resource.id, input.userId, {
        content: input.content,
        variables: input.variables,
      });

      return resource as PromptTemplate;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Prompt template with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get prompt template by ID
   */
  async getById(promptId: string, tenantId: string): Promise<PromptTemplate> {
    if (!promptId || !tenantId) {
      throw new BadRequestError('promptId and tenantId are required');
    }

    try {
      const container = getContainer(this.promptContainerName);
      const { resource } = await container.item(promptId, tenantId).read<PromptTemplate>();

      if (!resource) {
        throw new NotFoundError(`Prompt template ${promptId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Prompt template ${promptId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get prompt template by slug
   */
  async getBySlug(tenantId: string, slug: string, organizationId?: string): Promise<PromptTemplate> {
    if (!tenantId || !slug) {
      throw new BadRequestError('tenantId and slug are required');
    }

    const container = getContainer(this.promptContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.slug = @slug';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@slug', value: slug },
    ];

    // Prefer organization-specific override
    if (organizationId) {
      query += ' ORDER BY c.organizationId DESC';
    } else {
      query += ' AND (c.organizationId = null OR c.organizationId = undefined)';
    }

    try {
      const { resources } = await container.items
        .query<PromptTemplate>({
          query,
          parameters,
        })
        .fetchNext();

      if (resources.length === 0) {
        throw new NotFoundError(`Prompt template with slug '${slug}' not found`);
      }

      // Return organization-specific if available, otherwise default
      const orgSpecific = resources.find((r) => r.organizationId === organizationId);
      return orgSpecific || resources[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to get prompt template: ${error.message}`);
    }
  }

  /**
   * Update prompt template
   */
  async update(
    promptId: string,
    tenantId: string,
    userId: string,
    input: UpdatePromptTemplateInput
  ): Promise<PromptTemplate> {
    const existing = await this.getById(promptId, tenantId);

    // If content changed, create new version
    if (input.content && input.content !== existing.content) {
      await this.createVersion(tenantId, promptId, userId, {
        content: input.content,
        variables: input.variables || existing.variables,
      });

      // Update version number
      const versions = await this.getVersions(tenantId, promptId);
      input = { ...input, ...{ version: versions.length + 1 } };
    }

    const updated: PromptTemplate = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.promptContainerName);
      const { resource } = await container.item(promptId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update prompt template');
      }

      return resource as PromptTemplate;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Prompt template ${promptId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete prompt template
   */
  async delete(promptId: string, tenantId: string): Promise<void> {
    await this.getById(promptId, tenantId);

    const container = getContainer(this.promptContainerName);
    await container.item(promptId, tenantId).delete();
  }

  /**
   * List prompt templates
   */
  async list(
    tenantId: string,
    filters?: {
      category?: string;
      status?: PromptStatus;
      organizationId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: PromptTemplate[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.promptContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.organizationId !== undefined) {
      if (filters.organizationId) {
        query += ' AND c.organizationId = @organizationId';
        parameters.push({ name: '@organizationId', value: filters.organizationId });
      } else {
        query += ' AND (c.organizationId = null OR c.organizationId = undefined)';
      }
    }

    query += ' ORDER BY c.slug ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<PromptTemplate>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list prompt templates: ${error.message}`);
    }
  }

  /**
   * Render prompt with variables
   */
  async render(input: RenderPromptInput): Promise<string> {
    const prompt = await this.getBySlug(input.tenantId, input.slug, input.organizationId);

    // Get specific version if requested
    let content = prompt.content;
    let variables = prompt.variables;

    if (input.version) {
      const version = await this.getVersion(input.tenantId, prompt.id, input.version);
      content = version.content;
      variables = version.variables;
    }

    // Validate variables
    this.validateVariables(content, input.variables, variables);

    // Render prompt
    return this.renderPrompt(content, input.variables);
  }

  /**
   * Create prompt version
   */
  async createVersion(
    tenantId: string,
    promptId: string,
    userId: string,
    input: { content: string; variables?: PromptVariable[]; changelog?: string }
  ): Promise<PromptVersion> {
    const prompt = await this.getById(promptId, tenantId);
    const versions = await this.getVersions(tenantId, promptId);
    const nextVersion = versions.length + 1;

    const version: PromptVersion = {
      id: uuidv4(),
      tenantId,
      promptId,
      version: nextVersion,
      content: input.content,
      variables: input.variables,
      changelog: input.changelog,
      createdAt: new Date(),
      createdBy: userId,
    };

    try {
      const container = getContainer(this.versionContainerName);
      const { resource } = await container.items.create(version, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create prompt version');
      }

      return resource as PromptVersion;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get prompt version
   */
  async getVersion(tenantId: string, promptId: string, version: number): Promise<PromptVersion> {
    const container = getContainer(this.versionContainerName);
    const { resources } = await container.items
      .query<PromptVersion>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.promptId = @promptId AND c.version = @version',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@promptId', value: promptId },
          { name: '@version', value: version },
        ],
      })
      .fetchNext();

    if (resources.length === 0) {
      throw new NotFoundError(`Prompt version ${version} not found`);
    }

    return resources[0];
  }

  /**
   * Get all versions for a prompt
   */
  async getVersions(tenantId: string, promptId: string): Promise<PromptVersion[]> {
    const container = getContainer(this.versionContainerName);
    const { resources } = await container.items
      .query<PromptVersion>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.promptId = @promptId ORDER BY c.version DESC',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@promptId', value: promptId },
        ],
      })
      .fetchNext();

    return resources;
  }
}

