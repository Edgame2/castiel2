/**
 * Option List Service
 * 
 * Business logic for managing reusable dropdown option lists.
 * Implements OptionListProvider interface for field validation integration.
 */

import type { SelectOption } from '@castiel/shared-types';
import { IMonitoringProvider } from '@castiel/monitoring';
import { OptionListRepository } from '../repositories/option-list.repository.js';
import {
  OptionList,
  CreateOptionListInput,
  UpdateOptionListInput,
  OptionListListOptions,
  OptionListListResult,
  parseOptionsRef,
  buildOptionsRef,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  CURRENCY_OPTIONS,
  BUILT_IN_OPTION_LISTS,
} from '../types/option-list.types.js';
import type { OptionListProvider } from './field-validation.service.js';

/**
 * Error codes for option list operations
 */
export enum OptionListErrorCode {
  NOT_FOUND = 'OPTION_LIST_NOT_FOUND',
  NAME_EXISTS = 'OPTION_LIST_NAME_EXISTS',
  SYSTEM_LIST_READONLY = 'SYSTEM_LIST_READONLY',
  INVALID_REF = 'INVALID_OPTIONS_REF',
  VALIDATION_FAILED = 'OPTION_LIST_VALIDATION_FAILED',
}

/**
 * Option List Service Error
 */
export class OptionListError extends Error {
  constructor(
    public code: OptionListErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OptionListError';
  }
}

/**
 * Option List Service
 */
export class OptionListService implements OptionListProvider {
  private repository: OptionListRepository;
  private monitoring: IMonitoringProvider;
  private cache: Map<string, { options: SelectOption[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(repository: OptionListRepository, monitoring: IMonitoringProvider) {
    this.repository = repository;
    this.monitoring = monitoring;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.repository.initialize();
    await this.seedSystemLists();
  }

  /**
   * Seed built-in system option lists
   */
  private async seedSystemLists(): Promise<void> {
    const systemLists = [
      {
        name: BUILT_IN_OPTION_LISTS.PRIORITIES,
        displayName: 'Priorities',
        description: 'Standard priority levels',
        options: PRIORITY_OPTIONS,
      },
      {
        name: BUILT_IN_OPTION_LISTS.STATUSES,
        displayName: 'Statuses',
        description: 'Standard status options',
        options: STATUS_OPTIONS,
      },
      {
        name: BUILT_IN_OPTION_LISTS.CURRENCIES,
        displayName: 'Currencies',
        description: 'Common currencies',
        options: CURRENCY_OPTIONS,
      },
    ];

    for (const listDef of systemLists) {
      const existing = await this.repository.getByName(listDef.name, 'system');
      if (!existing) {
        await this.repository.create({
          tenantId: 'system',
          name: listDef.name,
          displayName: listDef.displayName,
          description: listDef.description,
          options: listDef.options,
          isSystem: true,
          allowTenantOverride: true,
          createdBy: 'system',
        });

        this.monitoring.trackEvent('system-option-list-seeded', {
          name: listDef.name,
        });
      }
    }
  }

  // ============================================================================
  // OptionListProvider Implementation
  // ============================================================================

  /**
   * Get options for a field (implements OptionListProvider)
   * @param optionsRef Reference string in format "scope:name"
   * @param tenantId Tenant ID to resolve tenant-specific lists
   */
  async getOptions(optionsRef: string, tenantId: string): Promise<SelectOption[]> {
    // Check cache
    const cacheKey = `${optionsRef}:${tenantId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.options;
    }

    // Parse reference
    const ref = parseOptionsRef(optionsRef);
    if (!ref) {
      throw new OptionListError(
        OptionListErrorCode.INVALID_REF,
        `Invalid options reference: ${optionsRef}`
      );
    }

    let options: SelectOption[] = [];

    if (ref.scope === 'system') {
      // Get system list
      const systemList = await this.repository.getByName(ref.name, 'system');
      if (systemList) {
        options = systemList.options;
      }
    } else if (ref.scope === 'tenant') {
      // Try tenant-specific first, fall back to system
      const tenantList = await this.repository.getByName(ref.name, tenantId);
      if (tenantList) {
        options = tenantList.options;
      } else {
        // Check for system list with same name
        const systemList = await this.repository.getByName(ref.name, 'system');
        if (systemList && systemList.allowTenantOverride) {
          options = systemList.options;
        }
      }
    }

    // Cache the result
    this.cache.set(cacheKey, {
      options,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return options;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create an option list
   */
  async create(input: CreateOptionListInput): Promise<OptionList> {
    // Validate input
    this.validateOptionListInput(input);

    // Check name uniqueness
    const isUnique = await this.repository.isNameUnique(input.name, input.tenantId);
    if (!isUnique) {
      throw new OptionListError(
        OptionListErrorCode.NAME_EXISTS,
        `Option list with name "${input.name}" already exists`,
        { name: input.name, tenantId: input.tenantId }
      );
    }

    const optionList = await this.repository.create(input);

    // Invalidate cache
    this.invalidateCacheForList(input.tenantId, input.name);

    this.monitoring.trackEvent('option-list-created', {
      id: optionList.id,
      name: input.name,
      tenantId: input.tenantId,
      optionsCount: input.options.length,
    });

    return optionList;
  }

  /**
   * Get an option list by ID
   */
  async getById(id: string, tenantId: string): Promise<OptionList | null> {
    return this.repository.getById(id, tenantId);
  }

  /**
   * Get an option list by name
   */
  async getByName(name: string, tenantId: string): Promise<OptionList | null> {
    return this.repository.getByName(name, tenantId);
  }

  /**
   * Get a system option list by name
   */
  async getSystemByName(name: string): Promise<OptionList | null> {
    return this.repository.getSystemByName(name);
  }

  /**
   * Update an option list
   */
  async update(
    id: string,
    tenantId: string,
    input: UpdateOptionListInput
  ): Promise<OptionList> {
    const existing = await this.repository.getById(id, tenantId);
    if (!existing) {
      throw new OptionListError(
        OptionListErrorCode.NOT_FOUND,
        `Option list not found: ${id}`
      );
    }

    // Don't allow modifying core system list properties
    if (existing.isSystem && existing.tenantId === 'system') {
      // Only allow updating options and displayName for system lists
      const allowedFields = ['options', 'displayName', 'description', 'updatedBy'];
      const inputKeys = Object.keys(input);
      const invalidFields = inputKeys.filter(k => !allowedFields.includes(k));
      if (invalidFields.length > 0) {
        throw new OptionListError(
          OptionListErrorCode.SYSTEM_LIST_READONLY,
          `Cannot modify system list properties: ${invalidFields.join(', ')}`
        );
      }
    }

    // Validate options if provided
    if (input.options) {
      this.validateOptions(input.options);
    }

    const updated = await this.repository.update(id, tenantId, input);
    if (!updated) {
      throw new OptionListError(
        OptionListErrorCode.NOT_FOUND,
        `Option list not found: ${id}`
      );
    }

    // Invalidate cache
    this.invalidateCacheForList(tenantId, existing.name);

    this.monitoring.trackEvent('option-list-updated', {
      id,
      tenantId,
      name: existing.name,
    });

    return updated;
  }

  /**
   * Delete an option list
   */
  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const existing = await this.repository.getById(id, tenantId);
    if (!existing) {
      throw new OptionListError(
        OptionListErrorCode.NOT_FOUND,
        `Option list not found: ${id}`
      );
    }

    if (existing.isSystem) {
      throw new OptionListError(
        OptionListErrorCode.SYSTEM_LIST_READONLY,
        'Cannot delete system option lists'
      );
    }

    await this.repository.delete(id, tenantId, deletedBy);

    // Invalidate cache
    this.invalidateCacheForList(tenantId, existing.name);

    this.monitoring.trackEvent('option-list-deleted', {
      id,
      tenantId,
      name: existing.name,
    });
  }

  /**
   * List option lists
   */
  async list(options: OptionListListOptions): Promise<OptionListListResult> {
    return this.repository.list(options);
  }

  /**
   * Get all available lists for a tenant (system + tenant-specific)
   */
  async getAvailableListsForTenant(tenantId: string): Promise<OptionList[]> {
    const [systemLists, tenantLists] = await Promise.all([
      this.repository.getSystemLists(),
      this.repository.getTenantLists(tenantId),
    ]);

    // Merge: tenant lists override system lists with same name
    const listMap = new Map<string, OptionList>();
    
    for (const list of systemLists) {
      listMap.set(list.name, list);
    }
    
    for (const list of tenantLists) {
      listMap.set(list.name, list);
    }

    return Array.from(listMap.values()).sort((a, b) => 
      a.displayName.localeCompare(b.displayName)
    );
  }

  /**
   * Create a tenant override for a system list
   */
  async createTenantOverride(
    systemListName: string,
    tenantId: string,
    options: SelectOption[],
    createdBy: string
  ): Promise<OptionList> {
    // Get the system list
    const systemList = await this.repository.getByName(systemListName, 'system');
    if (!systemList) {
      throw new OptionListError(
        OptionListErrorCode.NOT_FOUND,
        `System option list not found: ${systemListName}`
      );
    }

    if (!systemList.allowTenantOverride) {
      throw new OptionListError(
        OptionListErrorCode.SYSTEM_LIST_READONLY,
        `System list "${systemListName}" does not allow tenant overrides`
      );
    }

    // Create tenant-specific list
    return this.create({
      tenantId,
      name: systemListName,
      displayName: systemList.displayName,
      description: `Tenant override of ${systemList.displayName}`,
      options,
      isSystem: false,
      allowTenantOverride: false,
      tags: ['override', ...systemList.tags],
      createdBy,
    });
  }

  /**
   * Add options to an existing list
   */
  async addOptions(
    id: string,
    tenantId: string,
    newOptions: SelectOption[],
    updatedBy: string
  ): Promise<OptionList> {
    const existing = await this.repository.getById(id, tenantId);
    if (!existing) {
      throw new OptionListError(
        OptionListErrorCode.NOT_FOUND,
        `Option list not found: ${id}`
      );
    }

    // Validate new options
    this.validateOptions(newOptions);

    // Check for duplicate values
    const existingValues = new Set(existing.options.map(o => o.value));
    const duplicates = newOptions.filter(o => existingValues.has(o.value));
    if (duplicates.length > 0) {
      throw new OptionListError(
        OptionListErrorCode.VALIDATION_FAILED,
        `Duplicate option values: ${duplicates.map(d => d.value).join(', ')}`
      );
    }

    const mergedOptions = [...existing.options, ...newOptions];
    return this.update(id, tenantId, { options: mergedOptions, updatedBy });
  }

  /**
   * Remove options from an existing list
   */
  async removeOptions(
    id: string,
    tenantId: string,
    valuesToRemove: string[],
    updatedBy: string
  ): Promise<OptionList> {
    const existing = await this.repository.getById(id, tenantId);
    if (!existing) {
      throw new OptionListError(
        OptionListErrorCode.NOT_FOUND,
        `Option list not found: ${id}`
      );
    }

    const filteredOptions = existing.options.filter(
      o => !valuesToRemove.includes(o.value)
    );

    return this.update(id, tenantId, { options: filteredOptions, updatedBy });
  }

  // ============================================================================
  // Validation Helpers
  // ============================================================================

  private validateOptionListInput(input: CreateOptionListInput): void {
    // Validate name format (lowercase, alphanumeric with hyphens)
    if (!/^[a-z0-9-]+$/.test(input.name)) {
      throw new OptionListError(
        OptionListErrorCode.VALIDATION_FAILED,
        'Name must be lowercase alphanumeric with hyphens only'
      );
    }

    // Validate options
    this.validateOptions(input.options);
  }

  private validateOptions(options: SelectOption[]): void {
    if (!Array.isArray(options)) {
      throw new OptionListError(
        OptionListErrorCode.VALIDATION_FAILED,
        'Options must be an array'
      );
    }

    if (options.length === 0) {
      throw new OptionListError(
        OptionListErrorCode.VALIDATION_FAILED,
        'Options array cannot be empty'
      );
    }

    // Check for unique values
    const values = options.map(o => o.value);
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== values.length) {
      throw new OptionListError(
        OptionListErrorCode.VALIDATION_FAILED,
        'Option values must be unique'
      );
    }

    // Validate each option
    for (const option of options) {
      if (!option.value || typeof option.value !== 'string') {
        throw new OptionListError(
          OptionListErrorCode.VALIDATION_FAILED,
          'Each option must have a string value'
        );
      }
      if (!option.label || typeof option.label !== 'string') {
        throw new OptionListError(
          OptionListErrorCode.VALIDATION_FAILED,
          'Each option must have a string label'
        );
      }
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private invalidateCacheForList(tenantId: string, name: string): void {
    // Invalidate all cache entries that might contain this list
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(name)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.monitoring.trackEvent('option-list-cache-cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}











