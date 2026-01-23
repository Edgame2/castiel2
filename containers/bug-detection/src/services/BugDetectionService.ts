/**
 * Bug Detection Service
 * Handles bug detection scanning
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { BugService } from './BugService';
import {
  BugDetectionScan,
  ScanBugsInput,
  Bug,
  BugType,
  BugSeverity,
  DetectionMethod,
} from '../types/bug.types';

export class BugDetectionService {
  private containerName = 'bug_scans';
  private bugService: BugService;

  constructor(bugService: BugService) {
    this.bugService = bugService;
  }

  /**
   * Scan for bugs
   * Note: This is a placeholder - actual detection would analyze code
   */
  async scanBugs(input: ScanBugsInput): Promise<BugDetectionScan> {
    if (!input.tenantId || !input.target || !input.target.path) {
      throw new BadRequestError('tenantId and target.path are required');
    }

    // Create scan record
    const scan: BugDetectionScan = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      target: input.target,
      detectionMethods: input.detectionMethods || [
        DetectionMethod.STATIC_ANALYSIS,
        DetectionMethod.ANOMALY_DETECTION,
      ],
      status: 'pending',
      results: {
        totalBugs: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        autoFixable: 0,
      },
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(scan, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create bug detection scan');
      }

      // Start scanning (async)
      this.executeScan(resource as BugDetectionScan, input.tenantId, input.userId).catch(
        (error) => {
          console.error('Bug detection scan execution failed:', error);
        }
      );

      return resource as BugDetectionScan;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute bug detection scan (async)
   */
  private async executeScan(
    scan: BugDetectionScan,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.updateStatus(scan.id, tenantId, 'running', {
        startedAt: new Date(),
      });

      // Placeholder: In a real implementation, this would:
      // 1. Load files from target
      // 2. Run static analysis
      // 3. Check for anomalies
      // 4. Use AI for bug prediction
      // 5. Detect regressions
      // 6. Create bug records

      const detectedBugs: Bug[] = [];

      // Simulate bug detection
      const numBugs = Math.floor(Math.random() * 10) + 1; // 1-10 bugs
      for (let i = 0; i < numBugs; i++) {
        const bugTypes = Object.values(BugType);
        const severities = Object.values(BugSeverity);
        const bugType = bugTypes[Math.floor(Math.random() * bugTypes.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];

        const bug = await this.bugService.create({
          tenantId,
          userId,
          title: `Detected ${bugType} bug`,
          description: `Bug detected in ${scan.target.path}`,
          type: bugType,
          severity,
          detectionMethod: scan.detectionMethods?.[0] || DetectionMethod.STATIC_ANALYSIS,
          location: {
            file: scan.target.path,
            line: Math.floor(Math.random() * 100) + 1,
            column: Math.floor(Math.random() * 50) + 1,
            code: `// Bug code snippet`,
          },
          fix: {
            suggested: Math.random() > 0.5,
            autoFixable: Math.random() > 0.7,
            applied: false,
          },
        });

        detectedBugs.push(bug);
      }

      // Calculate summary
      const summary = {
        totalBugs: detectedBugs.length,
        critical: detectedBugs.filter((b) => b.severity === BugSeverity.CRITICAL).length,
        high: detectedBugs.filter((b) => b.severity === BugSeverity.HIGH).length,
        medium: detectedBugs.filter((b) => b.severity === BugSeverity.MEDIUM).length,
        low: detectedBugs.filter((b) => b.severity === BugSeverity.LOW).length,
        info: detectedBugs.filter((b) => b.severity === BugSeverity.INFO).length,
        autoFixable: detectedBugs.filter((b) => b.fix?.autoFixable).length,
      };

      const duration = Date.now() - startTime;

      // Update scan with results
      await this.updateStatus(scan.id, tenantId, 'completed', {
        results: summary,
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      await this.updateStatus(scan.id, tenantId, 'failed', {
        error: error.message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Update scan status
   */
  async updateStatus(
    scanId: string,
    tenantId: string,
    status: BugDetectionScan['status'],
    updates?: {
      results?: BugDetectionScan['results'];
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
    }
  ): Promise<BugDetectionScan> {
    const existing = await this.getById(scanId, tenantId);

    const updated: BugDetectionScan = {
      ...existing,
      status,
      ...updates,
      results: updates?.results || existing.results,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(scanId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update bug detection scan');
      }

      return resource as BugDetectionScan;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Bug detection scan ${scanId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get scan by ID
   */
  async getById(scanId: string, tenantId: string): Promise<BugDetectionScan> {
    if (!scanId || !tenantId) {
      throw new BadRequestError('scanId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(scanId, tenantId).read<BugDetectionScan>();

      if (!resource) {
        throw new NotFoundError(`Bug detection scan ${scanId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Bug detection scan ${scanId} not found`);
      }
      throw error;
    }
  }

  /**
   * List scans
   */
  async list(
    tenantId: string,
    filters?: {
      status?: BugDetectionScan['status'];
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: BugDetectionScan[]; continuationToken?: string }> {
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
        .query<BugDetectionScan>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list bug detection scans: ${error.message}`);
    }
  }
}

