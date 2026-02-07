/**
 * Utility Service
 * Utility and helper services
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface ImportJob {
  id: string;
  tenantId: string;
  importType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsImported: number;
  errors: string[];
  startedAt?: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  exportType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  fileUrl?: string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
}

export class UtilityService {
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.config = loadConfig();
  }

  /**
   * Create import job
   */
  async createImportJob(tenantId: string, importType: string, data: any): Promise<ImportJob> {
    try {
      const job: ImportJob = {
        id: uuidv4(),
        tenantId,
        importType,
        status: 'pending',
        recordsProcessed: 0,
        recordsImported: 0,
        errors: [],
        createdAt: new Date(),
      };

      const container = getContainer('utility_imports');
      await container.items.create(job, { partitionKey: tenantId } as any);

      // Process import asynchronously
      this.processImportJob(job.id, tenantId, importType, data).catch((error: any) => {
        log.error('Import job processing failed', error, {
          jobId: job.id,
          tenantId,
          service: 'utility-services',
        });
      });

      return job;
    } catch (error: any) {
      log.error('Failed to create import job', error, {
        tenantId,
        importType,
        service: 'utility-services',
      });
      throw error;
    }
  }

  /**
   * Create export job
   */
  async createExportJob(tenantId: string, exportType: string, filters?: any): Promise<ExportJob> {
    try {
      const job: ExportJob = {
        id: uuidv4(),
        tenantId,
        exportType,
        status: 'pending',
        createdAt: new Date(),
      };

      const container = getContainer('utility_exports');
      await container.items.create(job, { partitionKey: tenantId } as any);

      // Process export asynchronously
      this.processExportJob(job.id, tenantId, exportType, filters).catch((error: any) => {
        log.error('Export job processing failed', error, {
          jobId: job.id,
          tenantId,
          service: 'utility-services',
        });
      });

      return job;
    } catch (error: any) {
      log.error('Failed to create export job', error, {
        tenantId,
        exportType,
        service: 'utility-services',
      });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, tenantId: string, jobType: 'import' | 'export'): Promise<ImportJob | ExportJob | null> {
    try {
      const containerName = jobType === 'import' ? 'utility_imports' : 'utility_exports';
      const container = getContainer(containerName);
      const { resource } = await container.item(jobId, tenantId).read();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get job status', error, {
        jobId,
        tenantId,
        jobType,
        service: 'utility-services',
      });
      return null;
    }
  }

  /**
   * Process import job asynchronously
   */
  private async processImportJob(jobId: string, tenantId: string, importType: string, data: any): Promise<void> {
    const container = getContainer('utility_imports');
    
    try {
      // Update job status to processing
      const { resource: job } = await container.item(jobId, tenantId).read();
      if (!job) return;

      await container.item(jobId, tenantId).replace({
        ...job,
        status: 'running',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Process based on import type
      let recordsProcessed = 0;
      let recordsImported = 0;
      const errors: string[] = [];

      if (importType === 'csv' || importType === 'json') {
        const records = Array.isArray(data) ? data : [data];
        recordsProcessed = records.length;

        for (const record of records) {
          try {
            // Import logic would go here - for now just count
            recordsImported++;
          } catch (error: any) {
            errors.push(`Failed to import record: ${error.message}`);
          }
        }
      }

      // Update job with results
      await container.item(jobId, tenantId).replace({
        ...job,
        status: recordsImported > 0 ? 'completed' : 'failed',
        recordsProcessed,
        recordsImported,
        errors,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error: any) {
      log.error('Import job processing error', error, {
        jobId,
        tenantId,
        service: 'utility-services',
      });
      
      // Update job status to failed
      try {
        const { resource: job } = await container.item(jobId, tenantId).read();
        if (job) {
          await container.item(jobId, tenantId).replace({
            ...job,
            status: 'failed',
            errors: [...(job.errors || []), error.message],
            updatedAt: new Date(),
          });
        }
      } catch (updateError) {
        // Ignore update errors
      }
    }
  }

  /**
   * Process export job asynchronously
   */
  private async processExportJob(jobId: string, tenantId: string, exportType: string, filters?: any): Promise<void> {
    const container = getContainer('utility_exports');
    
    try {
      // Update job status to processing
      const { resource: job } = await container.item(jobId, tenantId).read();
      if (!job) return;

      await container.item(jobId, tenantId).replace({
        ...job,
        status: 'processing',
        updatedAt: new Date(),
      });

      // Export logic would go here based on exportType
      // For now, simulate export completion
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

      // Update job with results
      await container.item(jobId, tenantId).replace({
        ...job,
        status: 'completed',
        fileUrl: `/exports/${jobId}.${exportType}`,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error: any) {
      log.error('Export job processing error', error, {
        jobId,
        tenantId,
        service: 'utility-services',
      });
      
      // Update job status to failed
      try {
        const { resource: job } = await container.item(jobId, tenantId).read();
        if (job) {
          await container.item(jobId, tenantId).replace({
            ...job,
            status: 'failed',
            error: error.message,
            updatedAt: new Date(),
          });
        }
      } catch (updateError) {
        // Ignore update errors
      }
    }
  }
}
