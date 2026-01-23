/**
 * Configuration Service
 * Handles configuration setting management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ConfigurationSetting,
  CreateConfigurationSettingInput,
  UpdateConfigurationSettingInput,
  BulkUpdateConfigurationSettingsInput,
  GetConfigurationValueInput,
  ConfigurationScope,
  ConfigurationValueType,
} from '../types/configuration.types';

export class ConfigurationService {
  private containerName = 'configuration_settings';

  /**
   * Infer value type from value
   */
  private inferValueType(value: any): ConfigurationValueType {
    if (value === null || value === undefined) {
      return ConfigurationValueType.STRING;
    }
    if (typeof value === 'boolean') {
      return ConfigurationValueType.BOOLEAN;
    }
    if (typeof value === 'number') {
      return ConfigurationValueType.NUMBER;
    }
    if (Array.isArray(value)) {
      return ConfigurationValueType.ARRAY;
    }
    if (typeof value === 'object') {
      return ConfigurationValueType.OBJECT;
    }
    return ConfigurationValueType.STRING;
  }

  /**
   * Validate configuration value
   */
  private validateValue(value: any, validation?: ConfigurationSetting['validation']): void {
    if (!validation) {
      return;
    }

    if (validation.required && (value === null || value === undefined || value === '')) {
      throw new BadRequestError('Configuration value is required');
    }

    if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
      throw new BadRequestError(`Configuration value must be at least ${validation.min}`);
    }

    if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
      throw new BadRequestError(`Configuration value must be at most ${validation.max}`);
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new BadRequestError(`Configuration value does not match required pattern`);
      }
    }

    if (validation.enum && !validation.enum.includes(value)) {
      throw new BadRequestError(`Configuration value must be one of: ${validation.enum.join(', ')}`);
    }
  }

  /**
   * Create configuration setting
   */
  async create(input: CreateConfigurationSettingInput): Promise<ConfigurationSetting> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.key || input.key.trim().length === 0) {
      throw new BadRequestError('key is required');
    }

    // Validate value
    this.validateValue(input.value, input.validation);

    const valueType = input.valueType || this.inferValueType(input.value);

    // Check if setting already exists
    const existing = await this.getByKey(
      input.tenantId,
      input.key,
      input.scope,
      input.organizationId,
      input.teamId,
      input.projectId,
      input.environmentId
    ).catch(() => null);

    if (existing) {
      throw new BadRequestError(`Configuration setting with key '${input.key}' already exists for this scope`);
    }

    const setting: ConfigurationSetting = {
      id: uuidv4(),
      tenantId: input.tenantId,
      key: input.key,
      value: input.value,
      valueType,
      scope: input.scope,
      organizationId: input.organizationId,
      teamId: input.teamId,
      projectId: input.projectId,
      environmentId: input.environmentId,
      description: input.description,
      isSecret: input.isSecret || false,
      isEncrypted: input.isSecret || false,
      validation: input.validation,
      defaultValue: input.defaultValue,
      impact: input.impact,
      category: input.category,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(setting, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create configuration setting');
      }

      return resource as ConfigurationSetting;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Configuration setting with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get configuration setting by ID
   */
  async getById(settingId: string, tenantId: string): Promise<ConfigurationSetting> {
    if (!settingId || !tenantId) {
      throw new BadRequestError('settingId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(settingId, tenantId).read<ConfigurationSetting>();

      if (!resource) {
        throw new NotFoundError(`Configuration setting ${settingId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Configuration setting ${settingId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get configuration setting by key
   */
  async getByKey(
    tenantId: string,
    key: string,
    scope?: ConfigurationScope,
    organizationId?: string,
    teamId?: string,
    projectId?: string,
    environmentId?: string
  ): Promise<ConfigurationSetting> {
    if (!tenantId || !key) {
      throw new BadRequestError('tenantId and key are required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.key = @key';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@key', value: key },
    ];

    if (scope) {
      query += ' AND c.scope = @scope';
      parameters.push({ name: '@scope', value: scope });
    }

    if (organizationId) {
      query += ' AND c.organizationId = @organizationId';
      parameters.push({ name: '@organizationId', value: organizationId });
    }

    if (teamId) {
      query += ' AND c.teamId = @teamId';
      parameters.push({ name: '@teamId', value: teamId });
    }

    if (projectId) {
      query += ' AND c.projectId = @projectId';
      parameters.push({ name: '@projectId', value: projectId });
    }

    if (environmentId) {
      query += ' AND c.environmentId = @environmentId';
      parameters.push({ name: '@environmentId', value: environmentId });
    }

    query += ' ORDER BY c.createdAt DESC';

    try {
      const { resources } = await container.items
        .query<ConfigurationSetting>({
          query,
          parameters,
        })
        .fetchNext();

      if (resources.length === 0) {
        throw new NotFoundError(`Configuration setting with key '${key}' not found`);
      }

      // Return the most specific match (most recent)
      return resources[0];
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to get configuration setting: ${error.message}`);
    }
  }

  /**
   * Get configuration value (with fallback hierarchy)
   * Returns the most specific value available, falling back to less specific scopes
   */
  async getValue(input: GetConfigurationValueInput): Promise<any> {
    const { tenantId, key, scope, organizationId, teamId, projectId, environmentId } = input;

    // Try to get value in order of specificity: environment -> project -> team -> organization -> global
    const scopesToTry = [
      { scope: ConfigurationScope.ENVIRONMENT, organizationId, teamId, projectId, environmentId },
      { scope: ConfigurationScope.PROJECT, organizationId, teamId, projectId },
      { scope: ConfigurationScope.TEAM, organizationId, teamId },
      { scope: ConfigurationScope.ORGANIZATION, organizationId },
      { scope: ConfigurationScope.GLOBAL },
    ];

    for (const scopeConfig of scopesToTry) {
      try {
        const setting = await this.getByKey(
          tenantId,
          key,
          scopeConfig.scope,
          scopeConfig.organizationId,
          scopeConfig.teamId,
          scopeConfig.projectId,
          scopeConfig.environmentId
        );
        return setting.value;
      } catch (error) {
        // Continue to next scope
      }
    }

    // If no value found, try to get default value from any scope
    try {
      const container = getContainer(this.containerName);
      const { resources } = await container.items
        .query<ConfigurationSetting>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.key = @key',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@key', value: key },
          ],
        })
        .fetchNext();

      if (resources.length > 0) {
        const setting = resources[0];
        if (setting.defaultValue !== undefined) {
          return setting.defaultValue;
        }
      }
    } catch (error) {
      // Ignore
    }

    throw new NotFoundError(`Configuration value for key '${key}' not found`);
  }

  /**
   * Update configuration setting
   */
  async update(
    settingId: string,
    tenantId: string,
    userId: string,
    input: UpdateConfigurationSettingInput
  ): Promise<ConfigurationSetting> {
    const existing = await this.getById(settingId, tenantId);

    // Validate new value if provided
    if (input.value !== undefined) {
      this.validateValue(input.value, input.validation || existing.validation);
    }

    const valueType = input.valueType || existing.valueType || this.inferValueType(input.value || existing.value);

    const updated: ConfigurationSetting = {
      ...existing,
      ...input,
      value: input.value !== undefined ? input.value : existing.value,
      valueType,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(settingId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update configuration setting');
      }

      return resource as ConfigurationSetting;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Configuration setting ${settingId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete configuration setting
   */
  async delete(settingId: string, tenantId: string): Promise<void> {
    await this.getById(settingId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(settingId, tenantId).delete();
  }

  /**
   * Bulk update configuration settings
   */
  async bulkUpdate(input: BulkUpdateConfigurationSettingsInput): Promise<ConfigurationSetting[]> {
    const results: ConfigurationSetting[] = [];

    for (const settingInput of input.settings) {
      try {
        // Try to get existing setting
        const existing = await this.getByKey(
          input.tenantId,
          settingInput.key,
          settingInput.scope,
          settingInput.organizationId,
          settingInput.teamId,
          settingInput.projectId,
          settingInput.environmentId
        ).catch(() => null);

        if (existing) {
          // Update existing
          const updated = await this.update(
            existing.id,
            input.tenantId,
            input.userId,
            { value: settingInput.value }
          );
          results.push(updated);
        } else {
          // Create new
          const created = await this.create({
            tenantId: input.tenantId,
            userId: input.userId,
            key: settingInput.key,
            value: settingInput.value,
            scope: settingInput.scope || ConfigurationScope.GLOBAL,
            organizationId: settingInput.organizationId,
            teamId: settingInput.teamId,
            projectId: settingInput.projectId,
            environmentId: settingInput.environmentId,
          });
          results.push(created);
        }
      } catch (error: any) {
        // Log error but continue with other settings
        console.error(`Failed to update setting ${settingInput.key}:`, error);
      }
    }

    return results;
  }

  /**
   * List configuration settings
   */
  async list(
    tenantId: string,
    filters?: {
      scope?: ConfigurationScope;
      organizationId?: string;
      teamId?: string;
      projectId?: string;
      environmentId?: string;
      category?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: ConfigurationSetting[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.scope) {
      query += ' AND c.scope = @scope';
      parameters.push({ name: '@scope', value: filters.scope });
    }

    if (filters?.organizationId) {
      query += ' AND c.organizationId = @organizationId';
      parameters.push({ name: '@organizationId', value: filters.organizationId });
    }

    if (filters?.teamId) {
      query += ' AND c.teamId = @teamId';
      parameters.push({ name: '@teamId', value: filters.teamId });
    }

    if (filters?.projectId) {
      query += ' AND c.projectId = @projectId';
      parameters.push({ name: '@projectId', value: filters.projectId });
    }

    if (filters?.environmentId) {
      query += ' AND c.environmentId = @environmentId';
      parameters.push({ name: '@environmentId', value: filters.environmentId });
    }

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    query += ' ORDER BY c.key ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<ConfigurationSetting>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list configuration settings: ${error.message}`);
    }
  }
}

