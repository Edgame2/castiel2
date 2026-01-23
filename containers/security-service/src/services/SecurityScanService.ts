/**
 * Security Scan Service
 * Handles security scan CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  SecurityScan,
  CreateSecurityScanInput,
  UpdateSecurityScanInput,
  SecurityScanType,
  SecurityScanStatus,
} from '../types/security.types';

export class SecurityScanService {
  private containerName = 'security_scans';

  /**
   * Create security scan
   */
  async create(input: CreateSecurityScanInput): Promise<SecurityScan> {
    if (!input.tenantId || !input.type || !input.target) {
      throw new BadRequestError('tenantId, type, and target are required');
    }

    const scan: SecurityScan = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: SecurityScanStatus.PENDING,
      target: input.target,
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(scan, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create security scan');
      }

      return resource as SecurityScan;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Security scan with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get scan by ID
   */
  async getById(scanId: string, tenantId: string): Promise<SecurityScan> {
    if (!scanId || !tenantId) {
      throw new BadRequestError('scanId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(scanId, tenantId).read<SecurityScan>();

      if (!resource) {
        throw new NotFoundError(`Security scan ${scanId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Security scan ${scanId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update scan
   */
  async update(
    scanId: string,
    tenantId: string,
    input: UpdateSecurityScanInput
  ): Promise<SecurityScan> {
    const existing = await this.getById(scanId, tenantId);

    const updated: SecurityScan = {
      ...existing,
      ...input,
      findings: input.findings || existing.findings,
      summary: input.summary || existing.summary,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(scanId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update security scan');
      }

      return resource as SecurityScan;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Security scan ${scanId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete scan
   */
  async delete(scanId: string, tenantId: string): Promise<void> {
    const scan = await this.getById(scanId, tenantId);

    // Don't allow deletion of running scans
    if (scan.status === SecurityScanStatus.SCANNING) {
      throw new BadRequestError('Cannot delete a scan that is currently running');
    }

    const container = getContainer(this.containerName);
    await container.item(scanId, tenantId).delete();
  }

  /**
   * List scans
   */
  async list(
    tenantId: string,
    filters?: {
      type?: SecurityScanType;
      status?: SecurityScanStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: SecurityScan[]; continuationToken?: string }> {
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

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<SecurityScan>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list security scans: ${error.message}`);
    }
  }
}

