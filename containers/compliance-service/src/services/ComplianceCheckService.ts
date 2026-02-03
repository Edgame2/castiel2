/**
 * Compliance Check Service
 * Handles compliance check CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ComplianceCheck,
  CreateComplianceCheckInput,
  UpdateComplianceCheckInput,
  ComplianceStandard,
  ComplianceCheckStatus,
} from '../types/compliance.types';

export class ComplianceCheckService {
  private containerName = 'compliance_checks';

  /**
   * Create compliance check
   */
  async create(input: CreateComplianceCheckInput): Promise<ComplianceCheck> {
    if (!input.tenantId || !input.standard || !input.target) {
      throw new BadRequestError('tenantId, standard, and target are required');
    }

    const check: ComplianceCheck = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      standard: input.standard,
      status: ComplianceCheckStatus.PENDING,
      target: input.target,
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(check, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create compliance check');
      }

      return resource as ComplianceCheck;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Compliance check with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get check by ID
   */
  async getById(checkId: string, tenantId: string): Promise<ComplianceCheck> {
    if (!checkId || !tenantId) {
      throw new BadRequestError('checkId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(checkId, tenantId).read<ComplianceCheck>();

      if (!resource) {
        throw new NotFoundError('Compliance check', checkId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Compliance check', checkId);
      }
      throw error;
    }
  }

  /**
   * Update check
   */
  async update(
    checkId: string,
    tenantId: string,
    input: UpdateComplianceCheckInput
  ): Promise<ComplianceCheck> {
    const existing = await this.getById(checkId, tenantId);

    const updated: ComplianceCheck = {
      ...existing,
      ...input,
      requirements: input.requirements || existing.requirements,
      violations: input.violations || existing.violations,
      summary: input.summary || existing.summary,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(checkId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update compliance check');
      }

      return resource as ComplianceCheck;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Compliance check', checkId);
      }
      throw error;
    }
  }

  /**
   * Delete check
   */
  async delete(checkId: string, tenantId: string): Promise<void> {
    const check = await this.getById(checkId, tenantId);

    // Don't allow deletion of running checks
    if (check.status === ComplianceCheckStatus.CHECKING) {
      throw new BadRequestError('Cannot delete a compliance check that is currently running');
    }

    const container = getContainer(this.containerName);
    await container.item(checkId, tenantId).delete();
  }

  /**
   * List checks
   */
  async list(
    tenantId: string,
    filters?: {
      standard?: ComplianceStandard;
      status?: ComplianceCheckStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: ComplianceCheck[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.standard) {
      query += ' AND c.standard = @standard';
      parameters.push({ name: '@standard', value: filters.standard });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<ComplianceCheck>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list compliance checks: ${error.message}`);
    }
  }
}

