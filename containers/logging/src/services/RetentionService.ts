/**
 * Retention Service
 * Manages retention policies and log lifecycle (Cosmos DB only).
 */

import { RetentionPolicy, CreateRetentionPolicyInput, UpdateRetentionPolicyInput } from '../types/policy.types';
import { getConfig } from '../config';
import { log } from '../utils/logger';
import type { CosmosRetentionPoliciesRepository } from '../data/cosmos/retention-policies';

function defaultPolicy(): RetentionPolicy {
  const config = getConfig();
  return {
    id: 'default',
    tenantId: null,
    category: null,
    severity: null,
    retentionDays: config.defaults.retention.default_days,
    archiveAfterDays: null,
    deleteAfterDays: config.defaults.retention.default_days,
    minRetentionDays: config.defaults.retention.min_days,
    maxRetentionDays: config.defaults.retention.max_days,
    immutable: false,
    createdBy: 'system',
    createdAt: new Date(),
    updatedBy: 'system',
    updatedAt: new Date(),
  } as RetentionPolicy;
}

export class RetentionService {
  private cosmosRepo: CosmosRetentionPoliciesRepository;

  constructor(cosmosRepo: CosmosRetentionPoliciesRepository) {
    this.cosmosRepo = cosmosRepo;
  }

  /**
   * Get retention policy for tenant and log type
   */
  async getPolicy(
    tenantId: string | null,
    category?: string,
    severity?: string
  ): Promise<RetentionPolicy | null> {
    try {
      const policy = await this.cosmosRepo.findFirst({
        where: {
          tenantId: tenantId ?? null,
          category: category ?? null,
          severity: severity ?? null,
        },
        orderBy: { tenantId: 'asc' },
      });
      if (!policy) return defaultPolicy();
      return policy;
    } catch (error) {
      log.error('Failed to get retention policy', error, { tenantId, category, severity });
      return null;
    }
  }

  /**
   * Create retention policy
   */
  async createPolicy(
    input: CreateRetentionPolicyInput,
    createdBy: string
  ): Promise<RetentionPolicy> {
    const config = getConfig();
    const minDays = input.minRetentionDays ?? config.defaults.retention.min_days;
    const maxDays = input.maxRetentionDays ?? config.defaults.retention.max_days;
    if (input.retentionDays < minDays || input.retentionDays > maxDays) {
      throw new Error(
        `Retention days must be between ${minDays} and ${maxDays}`
      );
    }

    return this.cosmosRepo.create({
      tenantId: input.tenantId ?? null,
      category: input.category ?? null,
      severity: input.severity ?? null,
      retentionDays: input.retentionDays,
      archiveAfterDays: input.archiveAfterDays ?? null,
      deleteAfterDays: input.deleteAfterDays ?? input.retentionDays,
      minRetentionDays: minDays,
      maxRetentionDays: maxDays,
      immutable: input.immutable ?? false,
      createdBy,
      updatedBy: createdBy,
    });
  }

  /**
   * Update retention policy (tenant-scoped: only if policy.tenantId matches tenantId).
   */
  async updatePolicy(
    id: string,
    input: UpdateRetentionPolicyInput,
    updatedBy: string,
    tenantId: string
  ): Promise<RetentionPolicy> {
    const existing = await this.cosmosRepo.findUnique({ where: { id } });
    if (!existing) throw new Error('Retention policy not found');
    if (existing.tenantId !== tenantId) throw new Error('Retention policy not found');
    if (existing.immutable) throw new Error('Cannot update immutable retention policy');
    if (input.retentionDays !== undefined) {
      if (input.retentionDays < existing.minRetentionDays || input.retentionDays > existing.maxRetentionDays) {
        throw new Error(
          `Retention days must be between ${existing.minRetentionDays} and ${existing.maxRetentionDays}`
        );
      }
    }
    return this.cosmosRepo.update(id, tenantId, {
      retentionDays: input.retentionDays,
      archiveAfterDays: input.archiveAfterDays,
      deleteAfterDays: input.deleteAfterDays,
      immutable: input.immutable,
      updatedBy,
    });
  }

  /**
   * Delete retention policy (tenant-scoped: only if policy.tenantId matches tenantId).
   */
  async deletePolicy(id: string, tenantId: string): Promise<void> {
    const existing = await this.cosmosRepo.findUnique({ where: { id } });
    if (!existing) throw new Error('Retention policy not found');
    if (existing.tenantId !== tenantId) throw new Error('Retention policy not found');
    if (existing.immutable) throw new Error('Cannot delete immutable retention policy');
    await this.cosmosRepo.delete(id, tenantId);
  }

  /**
   * List retention policies
   */
  async listPolicies(tenantId?: string): Promise<RetentionPolicy[]> {
    return this.cosmosRepo.findMany({
      where: tenantId !== undefined ? { tenantId: tenantId ?? null } : undefined,
      orderBy: [
        { tenantId: 'asc' },
        { category: 'asc' },
        { severity: 'asc' },
      ],
    });
  }

  /**
   * Get logs that should be deleted based on retention policies.
   * Cosmos-only: returns [] (log deletion would use storage provider in a future implementation).
   */
  async getLogsToDelete(_tenantId?: string): Promise<{ logId: string; tenantId: string }[]> {
    return [];
  }

  /**
   * Get logs that should be archived.
   * Cosmos-only: returns [] (archiving would use storage provider in a future implementation).
   */
  async getLogsToArchive(_tenantId?: string): Promise<{ logId: string; tenantId: string }[]> {
    return [];
  }
}

