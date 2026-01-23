/**
 * Statistical Validator
 * Validates learned parameters using Bootstrap confidence intervals
 */

import { ValidationResult, ValidationCriteria } from '../types/adaptive-learning.types.js';

export class StatisticalValidator {
  private readonly defaultCriteria: ValidationCriteria = {
    minimumSampleSize: 30,
    confidenceLevel: 0.95,
    minimumImprovement: 0.05, // 5%
  };

  /**
   * Validate learned parameters using Bootstrap confidence intervals
   */
  async validateLearnedParameters(
    learnedPerformance: number[],
    defaultPerformance: number[],
    criteria: Partial<ValidationCriteria> = {}
  ): Promise<ValidationResult> {
    const validationCriteria: ValidationCriteria = {
      ...this.defaultCriteria,
      ...criteria,
    };

    // Check 1: Sufficient sample size
    if (learnedPerformance.length < validationCriteria.minimumSampleSize) {
      return {
        validated: false,
        reason: `Insufficient sample size: ${learnedPerformance.length} < ${validationCriteria.minimumSampleSize}`,
        confidence: 0,
        lowerBound: 0,
        upperBound: 0,
        medianImprovement: 0,
        sampleSize: learnedPerformance.length,
        validatedAt: new Date(),
      };
    }

    // Check 2: Bootstrap confidence intervals
    const bootstrapIterations = 1000;
    const improvements: number[] = [];

    for (let i = 0; i < bootstrapIterations; i++) {
      const learnedSample = this.bootstrapSample(learnedPerformance);
      const defaultSample = this.bootstrapSample(defaultPerformance);

      const learnedMean = this.mean(learnedSample);
      const defaultMean = this.mean(defaultSample);

      if (defaultMean === 0) {
        // Avoid division by zero
        improvements.push(0);
      } else {
        improvements.push((learnedMean - defaultMean) / defaultMean);
      }
    }

    // Calculate confidence interval
    improvements.sort((a, b) => a - b);
    const alpha = 1 - validationCriteria.confidenceLevel;
    const lowerIndex = Math.floor((alpha / 2) * improvements.length);
    const upperIndex = Math.floor((1 - alpha / 2) * improvements.length);

    const lowerBound = improvements[lowerIndex] || 0;
    const upperBound = improvements[upperIndex] || 0;
    const medianImprovement = improvements[Math.floor(improvements.length / 2)] || 0;

    // Check 3: Lower bound exceeds minimum improvement
    const validated = lowerBound > validationCriteria.minimumImprovement;

    return {
      validated: validated,
      reason: validated
        ? 'Statistically significant improvement'
        : `Improvement not significant: lower bound ${(lowerBound * 100).toFixed(1)}% < ${(validationCriteria.minimumImprovement * 100).toFixed(1)}%`,
      confidence: validationCriteria.confidenceLevel,
      lowerBound: lowerBound,
      upperBound: upperBound,
      medianImprovement: medianImprovement,
      sampleSize: learnedPerformance.length,
      validatedAt: new Date(),
    };
  }

  /**
   * Bootstrap sampling with replacement
   */
  private bootstrapSample(data: number[]): number[] {
    const sample: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      sample.push(data[randomIndex]);
    }
    return sample;
  }

  /**
   * Calculate mean
   */
  private mean(data: number[]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  /**
   * Validate degradation (for rollback decisions)
   */
  async validateDegradation(
    baselinePerformance: number[],
    currentPerformance: number[],
    threshold: number = 0.05 // 5% degradation threshold
  ): Promise<{ isSignificant: boolean; degradation: number; confidence: number }> {
    if (baselinePerformance.length < 30 || currentPerformance.length < 30) {
      return {
        isSignificant: false,
        degradation: 0,
        confidence: 0,
      };
    }

    const baselineMean = this.mean(baselinePerformance);
    const currentMean = this.mean(currentPerformance);

    if (baselineMean === 0) {
      return {
        isSignificant: false,
        degradation: 0,
        confidence: 0,
      };
    }

    const degradation = (baselineMean - currentMean) / baselineMean;

    // Bootstrap test for significance
    const bootstrapIterations = 1000;
    let significantCount = 0;

    for (let i = 0; i < bootstrapIterations; i++) {
      const baselineSample = this.bootstrapSample(baselinePerformance);
      const currentSample = this.bootstrapSample(currentPerformance);

      const baselineSampleMean = this.mean(baselineSample);
      const currentSampleMean = this.mean(currentSample);

      if (baselineSampleMean === 0) continue;

      const sampleDegradation = (baselineSampleMean - currentSampleMean) / baselineSampleMean;
      if (sampleDegradation > threshold) {
        significantCount++;
      }
    }

    const confidence = significantCount / bootstrapIterations;
    const isSignificant = confidence > 0.95; // 95% confidence

    return {
      isSignificant,
      degradation,
      confidence,
    };
  }
}

/**
 * Singleton instance
 */
export const statisticalValidator = new StatisticalValidator();
