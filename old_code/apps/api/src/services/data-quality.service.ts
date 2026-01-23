/**
 * Data Quality Service
 * Validates opportunity data quality before risk evaluation
 * Uses hybrid approach: leverages ShardValidationService for field validation,
 * adds quality scoring, staleness detection, and relationship checking
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardValidationService } from './shard-validation.service.js';
import type { Shard } from '../types/shard.types.js';

export interface DataQualityIssue {
  type: 'missing_field' | 'stale_data' | 'missing_relationship' | 'invalid_value';
  field?: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  days?: number; // For stale_data
  remediation?: string; // Actionable guidance
}

export interface DataQualityReport {
  qualityScore: number; // 0-1
  issues: DataQualityIssue[];
  completeness: number; // 0-1
  staleness: number; // days
  missingRelationships: string[];
  fieldCompleteness: Record<string, boolean>; // Field-level completeness
  relationshipCompleteness: number; // 0-1
  stalenessCategory: 'fresh' | 'recent' | 'aging' | 'stale' | 'critical';
}

export interface QualityGateConfig {
  blockThreshold: number; // Quality score below which to block (default: 0.3)
  warnThreshold: number; // Quality score below which to warn (default: 0.6)
  maxStalenessDays?: number; // Maximum staleness before blocking (default: 180)
  requiredFields?: string[]; // Fields that must be present
  requiredRelationships?: string[]; // Relationships that must exist
}

export interface QualityGateResult {
  shouldProceed: boolean;
  action: 'block' | 'warn' | 'proceed';
  message?: string;
  qualityScore: number;
}

export class DataQualityService {
  constructor(
    private shardValidationService: ShardValidationService,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * Validate opportunity data quality
   */
  async validateOpportunityDataQuality(
    opportunity: Shard,
    relatedShards: Shard[],
    expectedShardTypes: string[] = ['c_account', 'c_contact'],
    qualityGateConfig?: QualityGateConfig
  ): Promise<DataQualityReport> {
    const startTime = Date.now();
    const issues: DataQualityIssue[] = [];
    const fieldCompleteness: Record<string, boolean> = {};
    
    const opportunityData = opportunity.structuredData as any;

    // 1. Field completeness validation using ShardValidationService
    try {
      const validationResult = await this.shardValidationService.validateShardData(
        opportunityData,
        opportunity.shardTypeId,
        opportunity.tenantId,
        { mode: 'lenient' } // Use lenient mode to get all issues
      );

      if (!validationResult.valid && validationResult.errors) {
        for (const error of validationResult.errors) {
          if (error.code === 'REQUIRED') {
            issues.push({
              type: 'missing_field',
              field: error.field,
              severity: 'high',
              message: error.message,
              remediation: `Please provide a value for ${error.field}`,
            });
            fieldCompleteness[error.field] = false;
          } else {
            issues.push({
              type: 'invalid_value',
              field: error.field,
              severity: 'medium',
              message: error.message,
              remediation: `Please correct the value for ${error.field}`,
            });
          }
        }
      }

      // Check required fields from config
      if (qualityGateConfig?.requiredFields) {
        for (const field of qualityGateConfig.requiredFields) {
          if (!opportunityData[field] || opportunityData[field] === '') {
            if (!issues.some(i => i.field === field && i.type === 'missing_field')) {
              issues.push({
                type: 'missing_field',
                field,
                severity: 'high',
                message: `Required field ${field} is missing`,
                remediation: `Please provide a value for ${field}`,
              });
              fieldCompleteness[field] = false;
            }
          } else {
            fieldCompleteness[field] = true;
          }
        }
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'data-quality.validateFields',
        tenantId: opportunity.tenantId,
      });
    }

    // 2. Staleness detection
    const now = new Date();
    const updatedAt = opportunity.updatedAt ? new Date(opportunity.updatedAt) : null;
    const createdAt = opportunity.createdAt ? new Date(opportunity.createdAt) : null;
    
    let staleness = 0;
    let stalenessCategory: 'fresh' | 'recent' | 'aging' | 'stale' | 'critical' = 'fresh';
    
    if (updatedAt) {
      staleness = Math.ceil((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (staleness < 7) {
        stalenessCategory = 'fresh';
      } else if (staleness < 30) {
        stalenessCategory = 'recent';
      } else if (staleness < 90) {
        stalenessCategory = 'aging';
        issues.push({
          type: 'stale_data',
          severity: 'medium',
          message: `Data is ${staleness} days old (aging)`,
          days: staleness,
          remediation: 'Consider refreshing data from source system',
        });
      } else if (staleness < 180) {
        stalenessCategory = 'stale';
        issues.push({
          type: 'stale_data',
          severity: 'high',
          message: `Data is ${staleness} days old (stale)`,
          days: staleness,
          remediation: 'Data should be refreshed before analysis',
        });
      } else {
        stalenessCategory = 'critical';
        issues.push({
          type: 'stale_data',
          severity: 'high',
          message: `Data is ${staleness} days old (critically stale)`,
          days: staleness,
          remediation: 'Data must be refreshed before analysis',
        });
      }
    } else if (createdAt) {
      // Fallback to createdAt if updatedAt not available
      staleness = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      stalenessCategory = staleness < 7 ? 'fresh' : staleness < 30 ? 'recent' : staleness < 90 ? 'aging' : staleness < 180 ? 'stale' : 'critical';
    }

    // 3. Relationship completeness checking
    const missingRelationships: string[] = [];
    const foundShardTypes = new Set(relatedShards.map(s => s.shardTypeId));
    
    for (const expectedType of expectedShardTypes) {
      if (!foundShardTypes.has(expectedType)) {
        missingRelationships.push(expectedType);
        issues.push({
          type: 'missing_relationship',
          severity: 'medium',
          message: `Expected relationship to ${expectedType} not found`,
          remediation: `Link related ${expectedType} shard to this opportunity`,
        });
      }
    }

    // Check required relationships from config
    if (qualityGateConfig?.requiredRelationships) {
      for (const requiredType of qualityGateConfig.requiredRelationships) {
        if (!foundShardTypes.has(requiredType)) {
          if (!missingRelationships.includes(requiredType)) {
            missingRelationships.push(requiredType);
            issues.push({
              type: 'missing_relationship',
              severity: 'high',
              message: `Required relationship to ${requiredType} is missing`,
              remediation: `Link required ${requiredType} shard to this opportunity`,
            });
          }
        }
      }
    }

    // 4. Calculate completeness scores
    const totalFields = Object.keys(fieldCompleteness).length || 1;
    const completeFields = Object.values(fieldCompleteness).filter(Boolean).length;
    const completeness = totalFields > 0 ? completeFields / totalFields : 0.5;

    const totalExpectedRelationships = expectedShardTypes.length + (qualityGateConfig?.requiredRelationships?.length || 0);
    const foundRelationships = expectedShardTypes.filter(t => foundShardTypes.has(t)).length +
      (qualityGateConfig?.requiredRelationships?.filter(t => foundShardTypes.has(t)).length || 0);
    const relationshipCompleteness = totalExpectedRelationships > 0 
      ? foundRelationships / totalExpectedRelationships 
      : 1.0;

    // 5. Calculate overall quality score
    const qualityScore = this.calculateQualityScore(
      completeness,
      relationshipCompleteness,
      staleness,
      issues
    );

    const report: DataQualityReport = {
      qualityScore,
      issues,
      completeness,
      staleness,
      missingRelationships,
      fieldCompleteness,
      relationshipCompleteness,
      stalenessCategory,
    };

    this.monitoring.trackEvent('data-quality.validated', {
      tenantId: opportunity.tenantId,
      opportunityId: opportunity.id,
      qualityScore: Math.round(qualityScore * 100) / 100,
      issueCount: issues.length,
      stalenessCategory,
      durationMs: Date.now() - startTime,
    });

    return report;
  }

  /**
   * Check quality gate and determine if evaluation should proceed
   */
  checkQualityGate(
    report: DataQualityReport,
    config?: QualityGateConfig
  ): QualityGateResult {
    const blockThreshold = config?.blockThreshold ?? 0.3;
    const warnThreshold = config?.warnThreshold ?? 0.6;
    const maxStalenessDays = config?.maxStalenessDays ?? 180;

    // Check for critical issues that should block
    const criticalIssues = report.issues.filter(i => 
      i.severity === 'high' && 
      (i.type === 'stale_data' && (i.days || 0) >= maxStalenessDays) ||
      (i.type === 'missing_field' && config?.requiredFields?.includes(i.field || ''))
    );

    if (criticalIssues.length > 0 || report.qualityScore < blockThreshold) {
      return {
        shouldProceed: false,
        action: 'block',
        message: `Data quality too low (score: ${report.qualityScore.toFixed(2)}). ${criticalIssues.length > 0 ? criticalIssues[0].remediation : 'Please improve data quality before analysis.'}`,
        qualityScore: report.qualityScore,
      };
    }

    if (report.qualityScore < warnThreshold) {
      return {
        shouldProceed: true,
        action: 'warn',
        message: `Data quality concerns (score: ${report.qualityScore.toFixed(2)}). Analysis may be less reliable.`,
        qualityScore: report.qualityScore,
      };
    }

    return {
      shouldProceed: true,
      action: 'proceed',
      qualityScore: report.qualityScore,
    };
  }

  /**
   * Calculate overall quality score (0-1)
   */
  private calculateQualityScore(
    completeness: number,
    relationshipCompleteness: number,
    staleness: number,
    issues: DataQualityIssue[]
  ): number {
    // Weight factors
    const completenessWeight = 0.3;
    const relationshipWeight = 0.2;
    const stalenessWeight = 0.3;
    const issueWeight = 0.2;

    // Staleness score (inverse - fresher is better)
    let stalenessScore = 1.0;
    if (staleness >= 180) {
      stalenessScore = 0.2; // Critical
    } else if (staleness >= 90) {
      stalenessScore = 0.4; // Stale
    } else if (staleness >= 30) {
      stalenessScore = 0.6; // Aging
    } else if (staleness >= 7) {
      stalenessScore = 0.8; // Recent
    } // else fresh = 1.0

    // Issue penalty (reduce score based on issue severity and count)
    const highSeverityCount = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length;
    const lowSeverityCount = issues.filter(i => i.severity === 'low').length;
    
    const issuePenalty = Math.min(
      1.0,
      (highSeverityCount * 0.2 + mediumSeverityCount * 0.1 + lowSeverityCount * 0.05)
    );
    const issueScore = 1.0 - issuePenalty;

    // Weighted average
    const score = 
      completeness * completenessWeight +
      relationshipCompleteness * relationshipWeight +
      stalenessScore * stalenessWeight +
      issueScore * issueWeight;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }
}
