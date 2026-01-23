/**
 * Report Service
 * Handles analytics report generation and management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { AnalyticsService } from './AnalyticsService';
import {
  AnalyticsReport,
  CreateAnalyticsReportInput,
  TimeAggregation,
} from '../types/analytics.types';

export class ReportService {
  private reportsContainerName = 'analytics_reports';
  private analyticsService: AnalyticsService;

  constructor(analyticsService: AnalyticsService) {
    this.analyticsService = analyticsService;
  }

  /**
   * Generate analytics report
   */
  async generateReport(input: CreateAnalyticsReportInput): Promise<AnalyticsReport> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.reportName) {
      throw new BadRequestError('reportName is required');
    }

    // Get dashboard metrics for the period
    const metrics = await this.analyticsService.getDashboardMetrics(
      input.tenantId,
      [], // All metrics
      {
        startDate: input.startDate,
        endDate: input.endDate,
      }
    );

    const report: AnalyticsReport = {
      id: uuidv4(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      reportName: input.reportName,
      reportType: input.reportType,
      description: input.description,
      metrics,
      insights: [], // TODO: Generate insights
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      generatedAt: new Date(),
      generatedBy: input.userId,
      schedule: input.schedule,
      exportFormats: input.exportFormats || ['json'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.reportsContainerName);
      const { resource } = await container.items.create(report, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to generate analytics report');
      }

      return resource as AnalyticsReport;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Report with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get report by ID
   */
  async getById(reportId: string, tenantId: string): Promise<AnalyticsReport> {
    if (!reportId || !tenantId) {
      throw new BadRequestError('reportId and tenantId are required');
    }

    try {
      const container = getContainer(this.reportsContainerName);
      const { resource } = await container.item(reportId, tenantId).read<AnalyticsReport>();

      if (!resource) {
        throw new NotFoundError(`Analytics report ${reportId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Analytics report ${reportId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update report
   */
  async update(
    reportId: string,
    tenantId: string,
    input: {
      reportName?: string;
      description?: string;
      schedule?: AnalyticsReport['schedule'];
      exportFormats?: AnalyticsReport['exportFormats'];
    }
  ): Promise<AnalyticsReport> {
    const existing = await this.getById(reportId, tenantId);

    const updated: AnalyticsReport = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.reportsContainerName);
      const { resource } = await container.item(reportId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update analytics report');
      }

      return resource as AnalyticsReport;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Analytics report ${reportId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete report
   */
  async delete(reportId: string, tenantId: string): Promise<void> {
    await this.getById(reportId, tenantId);

    const container = getContainer(this.reportsContainerName);
    await container.item(reportId, tenantId).delete();
  }

  /**
   * List reports
   */
  async list(
    tenantId: string,
    filters?: {
      reportType?: string;
      projectId?: string;
      limit?: number;
    }
  ): Promise<AnalyticsReport[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.reportsContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.reportType) {
      query += ' AND c.reportType = @reportType';
      parameters.push({ name: '@reportType', value: filters.reportType });
    }

    if (filters?.projectId) {
      query += ' AND c.projectId = @projectId';
      parameters.push({ name: '@projectId', value: filters.projectId });
    }

    query += ' ORDER BY c.generatedAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<AnalyticsReport>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list analytics reports: ${error.message}`);
    }
  }
}

