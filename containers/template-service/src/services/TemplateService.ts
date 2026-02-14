/**
 * Template Service
 * Handles template management and rendering
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Template,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  RenderTemplateInput,
  TemplateStatus,
  TemplateType,
  TemplateVariable,
} from '../types/template.types';

export class TemplateService {
  private templateContainerName = 'template_templates';
  private versionContainerName = 'template_versions';

  /**
   * Validate variable interpolation
   */
  private validateVariables(content: string, variables: Record<string, any>, requiredVars?: TemplateVariable[]): void {
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
   * Render template with variable substitution
   */
  private renderTemplate(content: string, variables: Record<string, any>): string {
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
   * Create template
   */
  async create(input: CreateTemplateInput): Promise<Template> {
    if (!input.tenantId || !input.name || !input.content) {
      throw new BadRequestError('tenantId, name, and content are required');
    }

    const template: Template = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      category: input.category,
      content: input.content,
      variables: input.variables || [],
      version: 1,
      status: TemplateStatus.DRAFT,
      isDefault: true,
      tags: input.tags || [],
      metadata: {
        ...input.metadata,
        ...(input.type === TemplateType.EMAIL && {
          subject: input.subject,
          htmlContent: input.htmlContent,
          textContent: input.textContent,
        }),
        ...(input.type === TemplateType.DOCUMENT && {
          format: input.format,
        }),
        ...(input.type === TemplateType.CONTEXT && {
          contextType: input.contextType,
          sections: input.sections,
        }),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = (getContainer as (n: string) => any)(this.templateContainerName);
      const { resource } = await container.items.create(template, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create template');
      }

      // Create initial version
      await this.createVersion(input.tenantId, resource.id, input.userId, {
        content: input.content,
        variables: input.variables,
      });

      return resource as Template;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Template with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getById(templateId: string, tenantId: string): Promise<Template> {
    if (!templateId || !tenantId) {
      throw new BadRequestError('templateId and tenantId are required');
    }

    try {
      const container = (getContainer as (n: string) => any)(this.templateContainerName);
      const { resource } = await container.item(templateId, tenantId).read();

      if (!resource) {
        throw new NotFoundError('Template', templateId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Template', templateId);
      }
      throw error;
    }
  }

  /**
   * Update template
   */
  async update(
    templateId: string,
    tenantId: string,
    userId: string,
    input: UpdateTemplateInput
  ): Promise<Template> {
    const existing = await this.getById(templateId, tenantId);

    // If content changed, create new version
    if (input.content && input.content !== existing.content) {
      await this.createVersion(tenantId, templateId, userId, {
        content: input.content,
        variables: input.variables || existing.variables,
      });

      // Update version number
      const versions = await this.getVersions(tenantId, templateId);
      const nextVersion = versions.length + 1;
      input = { ...input, ...{ version: nextVersion } };
    }

    // Merge metadata
    const updatedMetadata = {
      ...existing.metadata,
      ...input.metadata,
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.htmlContent !== undefined && { htmlContent: input.htmlContent }),
      ...(input.textContent !== undefined && { textContent: input.textContent }),
      ...(input.format !== undefined && { format: input.format }),
      ...(input.contextType !== undefined && { contextType: input.contextType }),
      ...(input.sections !== undefined && { sections: input.sections }),
    };

    const updated: Template = {
      ...existing,
      ...input,
      metadata: updatedMetadata,
      updatedAt: new Date(),
    };

    try {
      const container = (getContainer as (n: string) => any)(this.templateContainerName);
      const { resource } = await container.item(templateId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update template');
      }

      return resource as Template;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Template', templateId);
      }
      throw error;
    }
  }

  /**
   * Delete template
   */
  async delete(templateId: string, tenantId: string): Promise<void> {
    await this.getById(templateId, tenantId);

    const container = (getContainer as (n: string) => any)(this.templateContainerName);
    await container.item(templateId, tenantId).delete();
  }

  /**
   * List templates
   */
  async list(
    tenantId: string,
    filters?: {
      type?: TemplateType;
      category?: string;
      status?: TemplateStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Template[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.templateContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Template>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }
  }

  /**
   * Render template with variables
   */
  async render(input: RenderTemplateInput): Promise<string> {
    const template = await this.getById(input.templateId, input.tenantId);

    // Get specific version if requested
    let content = template.content;
    let variables = template.variables;

    if (input.version) {
      const version = await this.getVersion(input.tenantId, template.id, input.version);
      content = version.content;
      variables = version.variables;
    }

    // Validate variables
    this.validateVariables(content, input.variables, variables);

    // Render template
    return this.renderTemplate(content, input.variables);
  }

  /**
   * Create template version
   */
  async createVersion(
    tenantId: string,
    templateId: string,
    userId: string,
    input: { content: string; variables?: TemplateVariable[]; changelog?: string }
  ): Promise<TemplateVersion> {
    await this.getById(templateId, tenantId);
    const versions = await this.getVersions(tenantId, templateId);
    const nextVersion = versions.length + 1;

    const version: TemplateVersion = {
      id: uuidv4(),
      tenantId,
      templateId,
      version: nextVersion,
      content: input.content,
      variables: input.variables,
      changelog: input.changelog,
      createdAt: new Date(),
      createdBy: userId,
    };

    try {
      const container = (getContainer as (n: string) => any)(this.versionContainerName);
      const { resource } = await container.items.create(version, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create template version');
      }

      return resource as TemplateVersion;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get template version
   */
  async getVersion(tenantId: string, templateId: string, version: number): Promise<TemplateVersion> {
const container = (getContainer as (n: string) => any)(this.versionContainerName);
    const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.templateId = @templateId AND c.version = @version',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@templateId', value: templateId },
          { name: '@version', value: version },
        ],
      })
      .fetchNext();

    if (resources.length === 0) {
      throw new NotFoundError('Template version', String(version));
    }

    return resources[0];
  }

  /**
   * Get all versions for a template
   */
  async getVersions(tenantId: string, templateId: string): Promise<TemplateVersion[]> {
    const container = getContainer(this.versionContainerName) as any;
    const { resources } = await (container.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.templateId = @templateId ORDER BY c.version DESC',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@templateId', value: templateId },
        ],
      })
      .fetchNext());

    return resources;
  }
}

