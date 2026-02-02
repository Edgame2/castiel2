/**
 * Data Quality Service
 * Validates data quality for risk evaluations
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface DataQualityScore {
  opportunityId: string;
  tenantId: string;
  completeness: number; // 0-1
  accuracy: number; // 0-1
  timeliness: number; // 0-1
  consistency: number; // 0-1
  overallScore: number; // 0-1
  issues: DataQualityIssue[];
  calculatedAt: Date | string;
}

export interface DataQualityIssue {
  type: 'missing_field' | 'stale_data' | 'inconsistency' | 'invalid_value';
  severity: 'low' | 'medium' | 'high';
  field?: string;
  message: string;
  suggestion?: string;
}

export class DataQualityService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Evaluate data quality for an opportunity
   */
  async evaluateQuality(
    opportunityId: string,
    tenantId: string
  ): Promise<DataQualityScore> {
    try {
      const token = this.getServiceToken(tenantId);
      const opportunity = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      const data = opportunity.structuredData || {};
      const issues: DataQualityIssue[] = [];
      
      // Check completeness
      const requiredFields = ['value', 'stage', 'currency'];
      const missingFields = requiredFields.filter(field => !data[field]);
      const completeness = 1 - (missingFields.length / requiredFields.length);
      
      missingFields.forEach(field => {
        issues.push({
          type: 'missing_field',
          severity: 'high',
          field,
          message: `Required field ${field} is missing`,
          suggestion: `Please provide ${field} for accurate risk evaluation`,
        });
      });

      // Check timeliness
      const lastUpdated = opportunity.updatedAt ? new Date(opportunity.updatedAt) : new Date();
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      const timeliness = daysSinceUpdate < 7 ? 1 : daysSinceUpdate < 30 ? 0.7 : 0.3;
      
      if (daysSinceUpdate > 30) {
        issues.push({
          type: 'stale_data',
          severity: 'medium',
          message: `Data hasn't been updated in ${Math.floor(daysSinceUpdate)} days`,
          suggestion: 'Update opportunity data for accurate risk evaluation',
        });
      }

      // Check consistency
      const consistency = 1.0; // Simplified - would check for logical consistency
      
      // Check accuracy (simplified)
      const accuracy = data.value && data.value > 0 ? 1.0 : 0.5;

      const overallScore = (completeness + accuracy + timeliness + consistency) / 4;

      const score: DataQualityScore = {
        opportunityId,
        tenantId,
        completeness,
        accuracy,
        timeliness,
        consistency,
        overallScore,
        issues,
        calculatedAt: new Date(),
      };

      return score;
    } catch (error: unknown) {
      log.error('Failed to evaluate data quality', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }
}
