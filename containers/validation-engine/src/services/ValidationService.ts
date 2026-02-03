/**
 * Validation Service
 * Handles validation execution
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ValidationRuleService } from './ValidationRuleService';
import {
  ValidationRun,
  ValidationResult,
  RunValidationInput,
  ValidationType,
  ValidationStatus,
  ValidationSeverity,
} from '../types/validation.types';

export class ValidationService {
  private containerName = 'validation_runs';
  private resultsContainerName = 'validation_results';
  private ruleService: ValidationRuleService;

  constructor(ruleService: ValidationRuleService) {
    this.ruleService = ruleService;
  }

  /**
   * Run validation
   * Note: This is a placeholder - actual validation would analyze code
   */
  async runValidation(input: RunValidationInput): Promise<ValidationRun> {
    if (!input.tenantId || !input.target || !input.target.path) {
      throw new BadRequestError('tenantId and target.path are required');
    }

    // Get rules to apply
    const rules = await this.ruleService.getEnabledRules(
      input.tenantId,
      input.validationTypes,
      input.target.language
    );

    // Filter to specific rules if provided
    const rulesToApply = input.rules
      ? rules.filter((rule) => input.rules!.includes(rule.id))
      : rules;

    // Create validation run
    const validationRun: ValidationRun = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      target: input.target,
      validationTypes: input.validationTypes,
      rules: rulesToApply.map((r) => r.id),
      status: ValidationStatus.PENDING,
      results: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: 0,
        warnings: 0,
        info: 0,
      },
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(validationRun, {
        partitionKey: input.tenantId,
      } as any);

      if (!resource) {
        throw new Error('Failed to create validation run');
      }

      // Start validation (async)
      this.executeValidation(resource as ValidationRun, rulesToApply, input.tenantId).catch(
        (error) => {
          console.error('Validation execution failed:', error);
        }
      );

      return resource as ValidationRun;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute validation (async)
   */
  private async executeValidation(
    validationRun: ValidationRun,
    rules: any[],
    tenantId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.updateStatus(validationRun.id, tenantId, ValidationStatus.RUNNING, {
        startedAt: new Date(),
      });

      const results: ValidationResult[] = [];

      // Execute each rule
      for (const rule of rules) {
        try {
          const result = await this.executeRule(rule, validationRun, tenantId);
          results.push(result);
        } catch (error: any) {
          // Create error result
          const errorResult: ValidationResult = {
            id: uuidv4(),
            tenantId,
            validationId: validationRun.id,
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            severity: rule.severity,
            status: 'failed',
            message: `Rule execution failed: ${error.message}`,
            details: { error: error.message },
            createdAt: new Date(),
          };
          results.push(errorResult);
        }
      }

      // Save results
      const resultsContainer = getContainer(this.resultsContainerName);
      for (const result of results) {
        await (resultsContainer.items as any).create(result, {
          partitionKey: tenantId,
        } as any);
      }

      // Calculate summary
      const summary = {
        total: results.length,
        passed: results.filter((r) => r.status === 'passed').length,
        failed: results.filter((r) => r.status === 'failed').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        errors: results.filter((r) => r.severity === ValidationSeverity.ERROR && r.status === 'failed').length,
        warnings: results.filter((r) => r.severity === ValidationSeverity.WARNING && r.status === 'failed').length,
        info: results.filter((r) => r.severity === ValidationSeverity.INFO && r.status === 'failed').length,
      };

      const duration = Date.now() - startTime;

      // Update validation run with results
      await this.updateStatus(validationRun.id, tenantId, ValidationStatus.COMPLETED, {
        results: summary,
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      await this.updateStatus(validationRun.id, tenantId, ValidationStatus.FAILED, {
        error: error.message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Execute a single rule
   */
  private async executeRule(
    rule: any,
    validationRun: ValidationRun,
    tenantId: string
  ): Promise<ValidationResult> {
    // Placeholder validation logic
    // In a real implementation, this would:
    // 1. Load the target file/directory
    // 2. Parse code (AST, etc.)
    // 3. Apply rule pattern/condition/check
    // 4. Generate results

    // For now, simulate validation
    const passed = Math.random() > 0.3; // 70% pass rate for demo

    const result: ValidationResult = {
      id: uuidv4(),
      tenantId,
      validationId: validationRun.id,
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      severity: rule.severity,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `Validation passed: ${rule.name}`
        : `Validation failed: ${rule.name} - Rule violation detected`,
      location: {
        file: validationRun.target.path,
        line: passed ? undefined : Math.floor(Math.random() * 100) + 1,
      },
      details: {
        ruleType: rule.type,
        ruleDefinition: rule.ruleDefinition,
      },
      suggestions: passed
        ? []
        : [`Review ${rule.name} rule`, `Check ${validationRun.target.path}`],
      createdAt: new Date(),
    };

    return result;
  }

  /**
   * Update validation run status
   */
  async updateStatus(
    validationId: string,
    tenantId: string,
    status: ValidationStatus,
    updates?: {
      results?: ValidationRun['results'];
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
    }
  ): Promise<ValidationRun> {
    const existing = await this.getById(validationId, tenantId);

    const updated: ValidationRun = {
      ...existing,
      status,
      ...updates,
      results: updates?.results || existing.results,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(validationId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update validation run');
      }

      return resource as ValidationRun;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Validation run', validationId);
      }
      throw error;
    }
  }

  /**
   * Get validation run by ID
   */
  async getById(validationId: string, tenantId: string): Promise<ValidationRun> {
    if (!validationId || !tenantId) {
      throw new BadRequestError('validationId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(validationId, tenantId).read<ValidationRun>();

      if (!resource) {
        throw new NotFoundError('Validation run', validationId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Validation run', validationId);
      }
      throw error;
    }
  }

  /**
   * Get validation results for a run
   */
  async getResults(
    validationId: string,
    tenantId: string,
    filters?: {
      status?: 'passed' | 'failed' | 'skipped';
      severity?: ValidationSeverity;
      limit?: number;
    }
  ): Promise<ValidationResult[]> {
    if (!validationId || !tenantId) {
      throw new BadRequestError('validationId and tenantId are required');
    }

    const container = getContainer(this.resultsContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.validationId = @validationId';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@validationId', value: validationId },
    ];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.severity) {
      query += ' AND c.severity = @severity';
      parameters.push({ name: '@severity', value: filters.severity });
    }

    query += ' ORDER BY c.createdAt ASC';

    const limit = filters?.limit || 1000;

    try {
      const { resources } = await container.items
        .query<ValidationResult>({
          query,
          parameters,
        })
        .fetchAll();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to get validation results: ${error.message}`);
    }
  }

  /**
   * List validation runs
   */
  async list(
    tenantId: string,
    filters?: {
      status?: ValidationStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: ValidationRun[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<ValidationRun>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list validation runs: ${error.message}`);
    }
  }
}

