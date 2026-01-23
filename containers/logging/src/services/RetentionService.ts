/**
 * Retention Service
 * Manages retention policies and log lifecycle
 * Per ModuleImplementationGuide Section 6: Abstraction Layer
 */

import { PrismaClient } from '.prisma/logging-client';
import { RetentionPolicy, CreateRetentionPolicyInput, UpdateRetentionPolicyInput } from '../types/policy.types';
import { getConfig } from '../config';
import { log } from '../utils/logger';

export class RetentionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get retention policy for organization and log type
   */
  async getPolicy(
    organizationId: string | null,
    category?: string,
    severity?: string
  ): Promise<RetentionPolicy | null> {
    try {
      const policy = await this.prisma.audit_retention_policies.findFirst({
        where: {
          organizationId: organizationId || null,
          category: (category as any) || null,
          severity: (severity as any) || null,
        },
        orderBy: {
          // Prefer org-specific over global
          organizationId: organizationId ? 'asc' : 'desc',
        },
      });

      if (!policy) {
        // Return default policy
        const config = getConfig();
        return {
          id: 'default',
          organizationId: null,
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
        };
      }

      return this.mapToRetentionPolicy(policy);
    } catch (error) {
      log.error('Failed to get retention policy', error, { organizationId, category, severity });
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
    
    // Validate retention days
    const minDays = input.minRetentionDays ?? config.defaults.retention.min_days;
    const maxDays = input.maxRetentionDays ?? config.defaults.retention.max_days;
    
    if (input.retentionDays < minDays || input.retentionDays > maxDays) {
      throw new Error(
        `Retention days must be between ${minDays} and ${maxDays}`
      );
    }

    const policy = await this.prisma.audit_retention_policies.create({
      data: {
        organizationId: input.organizationId || null,
        category: input.category || null,
        severity: input.severity || null,
        retentionDays: input.retentionDays,
        archiveAfterDays: input.archiveAfterDays || null,
        deleteAfterDays: input.deleteAfterDays ?? input.retentionDays,
        minRetentionDays: minDays,
        maxRetentionDays: maxDays,
        immutable: input.immutable ?? false,
        createdBy,
        updatedBy: createdBy,
      },
    });

    return this.mapToRetentionPolicy(policy);
  }

  /**
   * Update retention policy
   */
  async updatePolicy(
    id: string,
    input: UpdateRetentionPolicyInput,
    updatedBy: string
  ): Promise<RetentionPolicy> {
    const existing = await this.prisma.audit_retention_policies.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Retention policy not found');
    }

    if (existing.immutable) {
      throw new Error('Cannot update immutable retention policy');
    }

    const config = getConfig();
    const minDays = existing.minRetentionDays;
    const maxDays = existing.maxRetentionDays;

    if (input.retentionDays !== undefined) {
      if (input.retentionDays < minDays || input.retentionDays > maxDays) {
        throw new Error(
          `Retention days must be between ${minDays} and ${maxDays}`
        );
      }
    }

    const policy = await this.prisma.audit_retention_policies.update({
      where: { id },
      data: {
        retentionDays: input.retentionDays,
        archiveAfterDays: input.archiveAfterDays,
        deleteAfterDays: input.deleteAfterDays,
        immutable: input.immutable,
        updatedBy,
      },
    });

    return this.mapToRetentionPolicy(policy);
  }

  /**
   * Delete retention policy
   */
  async deletePolicy(id: string): Promise<void> {
    const existing = await this.prisma.audit_retention_policies.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Retention policy not found');
    }

    if (existing.immutable) {
      throw new Error('Cannot delete immutable retention policy');
    }

    await this.prisma.audit_retention_policies.delete({
      where: { id },
    });
  }

  /**
   * List retention policies
   */
  async listPolicies(organizationId?: string): Promise<RetentionPolicy[]> {
    const where: any = {};
    if (organizationId !== undefined) {
      where.organizationId = organizationId || null;
    }

    const policies = await this.prisma.audit_retention_policies.findMany({
      where,
      orderBy: [
        { organizationId: 'asc' },
        { category: 'asc' },
        { severity: 'asc' },
      ],
    });

    return policies.map(p => this.mapToRetentionPolicy(p));
  }

  /**
   * Get logs that should be deleted based on retention policies
   */
  async getLogsToDelete(organizationId?: string): Promise<{ logId: string; organizationId: string }[]> {
    const policies = await this.listPolicies(organizationId);
    const logsToDelete: { logId: string; organizationId: string }[] = [];

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.deleteAfterDays);

      const where: any = {
        timestamp: { lt: cutoffDate },
        organizationId: policy.organizationId || undefined,
      };

      if (policy.category) {
        where.category = policy.category;
      }
      if (policy.severity) {
        where.severity = policy.severity;
      }

      const logs = await this.prisma.audit_logs.findMany({
        where,
        select: { id: true, organizationId: true },
        take: 1000, // Process in batches
      });

      logsToDelete.push(...logs.map(l => ({
        logId: l.id,
        organizationId: l.organizationId,
      })));
    }

    return logsToDelete;
  }

  /**
   * Get logs that should be archived
   */
  async getLogsToArchive(organizationId?: string): Promise<{ logId: string; organizationId: string }[]> {
    const policies = await this.listPolicies(organizationId);
    const logsToArchive: { logId: string; organizationId: string }[] = [];

    for (const policy of policies) {
      if (!policy.archiveAfterDays) {
        continue;
      }

      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - policy.archiveAfterDays);
      
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - policy.deleteAfterDays);

      // Archive logs between archive date and delete date
      const where: any = {
        timestamp: {
          gte: archiveDate,
          lt: deleteDate,
        },
        organizationId: policy.organizationId || undefined,
      };

      if (policy.category) {
        where.category = policy.category;
      }
      if (policy.severity) {
        where.severity = policy.severity;
      }

      const logs = await this.prisma.audit_logs.findMany({
        where,
        select: { id: true, organizationId: true },
        take: 1000, // Process in batches
      });

      logsToArchive.push(...logs.map(l => ({
        logId: l.id,
        organizationId: l.organizationId,
      })));
    }

    return logsToArchive;
  }

  /**
   * Map Prisma model to RetentionPolicy type
   */
  private mapToRetentionPolicy(policy: any): RetentionPolicy {
    return {
      id: policy.id,
      organizationId: policy.organizationId,
      category: policy.category,
      severity: policy.severity,
      retentionDays: policy.retentionDays,
      archiveAfterDays: policy.archiveAfterDays,
      deleteAfterDays: policy.deleteAfterDays,
      minRetentionDays: policy.minRetentionDays,
      maxRetentionDays: policy.maxRetentionDays,
      immutable: policy.immutable,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedBy: policy.updatedBy,
      updatedAt: policy.updatedAt,
    };
  }
}

