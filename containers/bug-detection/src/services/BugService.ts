/**
 * Bug Service
 * Handles bug CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Bug,
  CreateBugInput,
  UpdateBugInput,
  BugType,
  BugSeverity,
  BugStatus,
  DetectionMethod,
} from '../types/bug.types';

export class BugService {
  private containerName = 'bug_bugs';

  /**
   * Create bug
   */
  async create(input: CreateBugInput): Promise<Bug> {
    if (!input.tenantId || !input.title || !input.type || !input.location) {
      throw new BadRequestError('tenantId, title, type, and location are required');
    }

    const bug: Bug = {
      id: uuidv4(),
      tenantId: input.tenantId,
      title: input.title,
      description: input.description,
      type: input.type,
      severity: input.severity,
      status: BugStatus.DETECTED,
      detectionMethod: input.detectionMethod,
      location: input.location,
      rootCause: input.rootCause,
      impact: input.impact,
      fix: {
        suggested: false,
        autoFixable: false,
        applied: false,
      },
      regression: {
        isRegression: false,
      },
      metadata: {
        ...input.metadata,
        firstDetected: new Date(),
        lastSeen: new Date(),
        occurrenceCount: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      detectedBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(bug, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create bug');
      }

      return resource as Bug;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Bug with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get bug by ID
   */
  async getById(bugId: string, tenantId: string): Promise<Bug> {
    if (!bugId || !tenantId) {
      throw new BadRequestError('bugId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(bugId, tenantId).read<Bug>();

      if (!resource) {
        throw new NotFoundError(`Bug ${bugId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Bug ${bugId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update bug
   */
  async update(
    bugId: string,
    tenantId: string,
    input: UpdateBugInput
  ): Promise<Bug> {
    const existing = await this.getById(bugId, tenantId);

    const updated: Bug = {
      ...existing,
      ...input,
      rootCause: input.rootCause || existing.rootCause,
      impact: input.impact || existing.impact,
      fix: input.fix
        ? { ...existing.fix, ...input.fix }
        : existing.fix,
      metadata: {
        ...existing.metadata,
        ...input.metadata,
        lastSeen: new Date(),
      },
      updatedAt: new Date(),
    };

    // Update occurrence count if status changed to detected
    if (input.status === BugStatus.DETECTED && existing.status !== BugStatus.DETECTED) {
      updated.metadata = {
        ...updated.metadata,
        occurrenceCount: (existing.metadata?.occurrenceCount || 0) + 1,
        lastSeen: new Date(),
      };
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(bugId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update bug');
      }

      return resource as Bug;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Bug ${bugId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete bug
   */
  async delete(bugId: string, tenantId: string): Promise<void> {
    await this.getById(bugId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(bugId, tenantId).delete();
  }

  /**
   * List bugs
   */
  async list(
    tenantId: string,
    filters?: {
      type?: BugType;
      severity?: BugSeverity;
      status?: BugStatus;
      detectionMethod?: DetectionMethod;
      file?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Bug[]; continuationToken?: string }> {
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

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.detectionMethod) {
      query += ' AND c.detectionMethod = @detectionMethod';
      parameters.push({ name: '@detectionMethod', value: filters.detectionMethod });
    }

    if (filters?.file) {
      query += ' AND c.location.file = @file';
      parameters.push({ name: '@file', value: filters.file });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Bug>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list bugs: ${error.message}`);
    }
  }
}

