/**
 * Risk AI Validation Service
 * Multi-stage validation pipeline for AI-detected risks
 * Validates schema, catalog, confidence, explanation, and business logic
 */

import type {
  RiskCatalog,
  RiskCategory,
} from '../types/risk-analysis.types.js';
import type { DataQualityReport } from './data-quality.service.js';
import type { Shard } from '../types/shard.types.js';

export interface RiskValidationResult {
  valid: boolean;
  stage: 'schema' | 'catalog' | 'confidence' | 'explanation' | 'business_logic';
  error?: string;
  warnings?: string[];
}

export class RiskAIValidationService {
  /**
   * Stage 1: Schema validation
   * Validates that risk data conforms to expected JSON schema
   */
  validateSchema(riskData: any): RiskValidationResult {
    // Check required fields exist
    if (!riskData || typeof riskData !== 'object') {
      return {
        valid: false,
        stage: 'schema',
        error: 'Risk data must be an object',
      };
    }

    if (typeof riskData.riskId !== 'string' || riskData.riskId.length === 0) {
      return {
        valid: false,
        stage: 'schema',
        error: 'riskId is required and must be a non-empty string',
      };
    }

    if (typeof riskData.confidence !== 'number') {
      return {
        valid: false,
        stage: 'schema',
        error: 'confidence is required and must be a number',
      };
    }

    return {
      valid: true,
      stage: 'schema',
    };
  }

  /**
   * Stage 2: Catalog validation
   * Validates that riskId exists in catalog and categories are valid
   */
  validateCatalog(riskData: any, catalog: RiskCatalog[]): RiskValidationResult {
    const riskDef = catalog.find(
      c => c.riskId === riskData.riskId || 
      c.name.toLowerCase() === riskData.riskName?.toLowerCase()
    );

    if (!riskDef) {
      return {
        valid: false,
        stage: 'catalog',
        error: `Risk ID ${riskData.riskId} not found in active risk catalog`,
      };
    }

    // Validate category if provided
    if (riskData.category) {
      const validCategories: RiskCategory[] = [
        'Commercial', 'Technical', 'Legal', 'Financial', 'Competitive', 'Operational'
      ];
      if (!validCategories.includes(riskData.category)) {
        return {
          valid: false,
          stage: 'catalog',
          error: `Invalid risk category: ${riskData.category}`,
        };
      }

      // Check category matches catalog
      if (riskData.category !== riskDef.category) {
        return {
          valid: false,
          stage: 'catalog',
          error: `Category mismatch: provided ${riskData.category}, catalog has ${riskDef.category}`,
        };
      }
    }

    return {
      valid: true,
      stage: 'catalog',
    };
  }

  /**
   * Stage 3: Confidence validation
   * Validates confidence is properly bounded and calibrated
   */
  validateConfidence(
    riskData: any,
    dataQuality: DataQualityReport
  ): RiskValidationResult {
    const confidence = riskData.confidence;

    // Check bounds
    if (confidence < 0 || confidence > 1) {
      return {
        valid: false,
        stage: 'confidence',
        error: `Confidence must be between 0 and 1, got ${confidence}`,
      };
    }

    // Calibrate confidence based on data quality
    // If data quality is low, confidence should be adjusted downward
    const warnings: string[] = [];
    if (dataQuality.qualityScore < 0.5 && confidence > 0.7) {
      warnings.push('High confidence with low data quality - confidence may be miscalibrated');
    }

    // Check for unrealistic confidence (very high with limited evidence)
    if (confidence > 0.9 && !riskData.explanation && !riskData.evidence) {
      warnings.push('Very high confidence without clear evidence');
    }

    return {
      valid: true,
      stage: 'confidence',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Stage 4: Explanation validation
   * Ensures explanations meet minimum quality standards
   */
  validateExplanation(riskData: any): RiskValidationResult {
    const explanation = riskData.explanation || riskData.explainability || '';

    // Minimum length requirement
    if (typeof explanation !== 'string' || explanation.trim().length < 10) {
      return {
        valid: false,
        stage: 'explanation',
        error: 'Explanation must be at least 10 characters long',
      };
    }

    // Check for specific evidence
    const hasEvidence = 
      (riskData.sourceShards && riskData.sourceShards.length > 0) ||
      (riskData.evidence && Object.keys(riskData.evidence).length > 0);

    if (!hasEvidence) {
      return {
        valid: false,
        stage: 'explanation',
        error: 'Explanation must include evidence or source references',
      };
    }

    // Check logical coherence (basic check for meaningful content)
    if (explanation.length < 50 && !explanation.includes('because') && !explanation.includes('due to')) {
      return {
        valid: false,
        stage: 'explanation',
        error: 'Explanation lacks sufficient detail or reasoning',
      };
    }

    return {
      valid: true,
      stage: 'explanation',
    };
  }

  /**
   * Stage 5: Business logic validation
   * Validates business rules, value ranges, and date logic
   */
  validateBusinessLogic(
    riskData: any,
    opportunity: Shard
  ): RiskValidationResult {
    const opportunityData = opportunity.structuredData as any;
    const warnings: string[] = [];

    // Check if risk makes sense for opportunity stage
    if (riskData.stage && opportunityData.stage) {
      // Some risks may only apply to certain stages
      // This is a placeholder for business-specific logic
    }

    // Check date logic
    if (riskData.detectedAt) {
      const detectedDate = new Date(riskData.detectedAt);
      const now = new Date();
      if (detectedDate > now) {
        return {
          valid: false,
          stage: 'business_logic',
          error: 'Detection date cannot be in the future',
        };
      }
    }

    // Check value ranges if applicable
    if (riskData.impact && (riskData.impact < 0 || riskData.impact > 1)) {
      return {
        valid: false,
        stage: 'business_logic',
        error: 'Impact must be between 0 and 1',
      };
    }

    return {
      valid: true,
      stage: 'business_logic',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Full validation pipeline
   * Runs all stages and returns first failure or success
   */
  validateRisk(
    riskData: any,
    catalog: RiskCatalog[],
    dataQuality: DataQualityReport,
    opportunity: Shard
  ): RiskValidationResult {
    // Stage 1: Schema
    const schemaResult = this.validateSchema(riskData);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    // Stage 2: Catalog
    const catalogResult = this.validateCatalog(riskData, catalog);
    if (!catalogResult.valid) {
      return catalogResult;
    }

    // Stage 3: Confidence
    const confidenceResult = this.validateConfidence(riskData, dataQuality);
    if (!confidenceResult.valid) {
      return confidenceResult;
    }

    // Stage 4: Explanation
    const explanationResult = this.validateExplanation(riskData);
    if (!explanationResult.valid) {
      return explanationResult;
    }

    // Stage 5: Business logic
    const businessLogicResult = this.validateBusinessLogic(riskData, opportunity);
    if (!businessLogicResult.valid) {
      return businessLogicResult;
    }

    // All stages passed - combine warnings from all stages
    const allWarnings = [
      ...(confidenceResult.warnings || []),
      ...(businessLogicResult.warnings || []),
    ];

    return {
      valid: true,
      stage: 'business_logic',
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
  }

  /**
   * Validate array of risks
   */
  validateRiskArray(
    risks: any[],
    catalog: RiskCatalog[],
    dataQuality: DataQualityReport,
    opportunity: Shard
  ): {
    valid: Array<{ risk: any; result: RiskValidationResult }>;
    invalid: Array<{ risk: any; error: string; stage: string }>;
  } {
    const valid: Array<{ risk: any; result: RiskValidationResult }> = [];
    const invalid: Array<{ risk: any; error: string; stage: string }> = [];

    for (const risk of risks) {
      const result = this.validateRisk(risk, catalog, dataQuality, opportunity);
      if (result.valid) {
        valid.push({ risk, result });
      } else {
        invalid.push({
          risk,
          error: result.error || 'Validation failed',
          stage: result.stage,
        });
      }
    }

    return { valid, invalid };
  }
}
