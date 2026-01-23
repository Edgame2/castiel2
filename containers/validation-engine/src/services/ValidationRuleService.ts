/**
 * Validation Rule Service
 * Handles validation rule CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ValidationRule,
  CreateValidationRuleInput,
  UpdateValidationRuleInput,
  ValidationType,
  ValidationSeverity,
} from '../types/validation.types';

export class ValidationRuleService {
  private containerName = 'validation_rules';

  /**
   * Create validation rule
   */
  async create(input: CreateValidationRuleInput): Promise<ValidationRule> {
    if (!input.tenantId || !input.name || !input.type || !input.ruleDefinition) {
      throw new BadRequestError('tenantId, name, type, and ruleDefinition are required');
    }

    const rule: ValidationRule = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      severity: input.severity,
      enabled: input.enabled !== false, // Default to true
      ruleDefinition: input.ruleDefinition,
      scope: input.scope,
      metadata: {
        ...input.metadata,
        version: input.metadata?.version || '1.0.0',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(rule, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create validation rule');
      }

      return resource as ValidationRule;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Validation rule with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get rule by ID
   */
  async getById(ruleId: string, tenantId: string): Promise<ValidationRule> {
    if (!ruleId || !tenantId) {
      throw new BadRequestError('ruleId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(ruleId, tenantId).read<ValidationRule>();

      if (!resource) {
        throw new NotFoundError(`Validation rule ${ruleId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Validation rule ${ruleId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update rule
   */
  async update(
    ruleId: string,
    tenantId: string,
    input: UpdateValidationRuleInput
  ): Promise<ValidationRule> {
    const existing = await this.getById(ruleId, tenantId);

    const updated: ValidationRule = {
      ...existing,
      ...input,
      ruleDefinition: input.ruleDefinition
        ? { ...existing.ruleDefinition, ...input.ruleDefinition }
        : existing.ruleDefinition,
      scope: input.scope || existing.scope,
      metadata: {
        ...existing.metadata,
        ...input.metadata,
      },
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(ruleId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update validation rule');
      }

      return resource as ValidationRule;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Validation rule ${ruleId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete rule
   */
  async delete(ruleId: string, tenantId: string): Promise<void> {
    await this.getById(ruleId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(ruleId, tenantId).delete();
  }

  /**
   * List rules
   */
  async list(
    tenantId: string,
    filters?: {
      type?: ValidationType;
      severity?: ValidationSeverity;
      enabled?: boolean;
      language?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: ValidationRule[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.severity) {
      query += ' AND c.severity = @severity';
      parameters.push({ name: '@severity', value: filters.severity });
    }

    if (filters?.enabled !== undefined) {
      query += ' AND c.enabled = @enabled';
      parameters.push({ name: '@enabled', value: filters.enabled });
    }

    if (filters?.language) {
      query += ' AND c.ruleDefinition.language = @language';
      parameters.push({ name: '@language', value: filters.language });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<ValidationRule>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list validation rules: ${error.message}`);
    }
  }

  /**
   * Get enabled rules for validation types
   */
  async getEnabledRules(
    tenantId: string,
    validationTypes?: ValidationType[],
    language?: string
  ): Promise<ValidationRule[]> {
    const filters: any = { enabled: true };
    if (validationTypes && validationTypes.length > 0) {
      // Filter by type - need to handle multiple types
      const { items } = await this.list(tenantId, { ...filters, language });
      return items.filter((rule) => validationTypes.includes(rule.type));
    }

    const { items } = await this.list(tenantId, { ...filters, language });
    return items;
  }
}

