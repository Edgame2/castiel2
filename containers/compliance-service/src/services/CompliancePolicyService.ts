/**
 * Compliance Policy Service
 * Handles compliance policy CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  CompliancePolicy,
  CreateCompliancePolicyInput,
  UpdateCompliancePolicyInput,
  ComplianceStandard,
  PolicyType,
} from '../types/compliance.types';

export class CompliancePolicyService {
  private containerName = 'compliance_policies';

  /**
   * Create compliance policy
   */
  async create(input: CreateCompliancePolicyInput): Promise<CompliancePolicy> {
    if (!input.tenantId || !input.name || !input.type || !input.standard || !input.rules) {
      throw new BadRequestError('tenantId, name, type, standard, and rules are required');
    }

    const policy: CompliancePolicy = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      standard: input.standard,
      rules: input.rules.map((rule, index) => ({
        id: uuidv4(),
        ...rule,
      })),
      enabled: input.enabled !== false, // Default to true
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(policy, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create compliance policy');
      }

      return resource as CompliancePolicy;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Compliance policy with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get policy by ID
   */
  async getById(policyId: string, tenantId: string): Promise<CompliancePolicy> {
    if (!policyId || !tenantId) {
      throw new BadRequestError('policyId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(policyId, tenantId).read<CompliancePolicy>();

      if (!resource) {
        throw new NotFoundError(`Compliance policy ${policyId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Compliance policy ${policyId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update policy
   */
  async update(
    policyId: string,
    tenantId: string,
    input: UpdateCompliancePolicyInput
  ): Promise<CompliancePolicy> {
    const existing = await this.getById(policyId, tenantId);

    const updated: CompliancePolicy = {
      ...existing,
      ...input,
      rules: input.rules
        ? input.rules.map((rule) => ({
            id: uuidv4(),
            ...rule,
          }))
        : existing.rules,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(policyId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update compliance policy');
      }

      return resource as CompliancePolicy;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Compliance policy ${policyId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete policy
   */
  async delete(policyId: string, tenantId: string): Promise<void> {
    await this.getById(policyId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(policyId, tenantId).delete();
  }

  /**
   * List policies
   */
  async list(
    tenantId: string,
    filters?: {
      type?: PolicyType;
      standard?: ComplianceStandard;
      enabled?: boolean;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: CompliancePolicy[]; continuationToken?: string }> {
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

    if (filters?.standard) {
      query += ' AND c.standard = @standard';
      parameters.push({ name: '@standard', value: filters.standard });
    }

    if (filters?.enabled !== undefined) {
      query += ' AND c.enabled = @enabled';
      parameters.push({ name: '@enabled', value: filters.enabled });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<CompliancePolicy>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list compliance policies: ${error.message}`);
    }
  }
}

