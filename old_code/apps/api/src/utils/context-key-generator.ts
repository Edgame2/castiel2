/**
 * Context Key Generator
 * Generates hierarchical context keys for adaptive learning
 * Phase 1: Simple concatenation
 * Phase 2: Significant dimensions only (learned)
 */

import { Context } from '../types/adaptive-learning.types.js';

export class ContextKeyGenerator {
  /**
   * Phase 1: Simple concatenation of all context dimensions
   */
  generateSimple(context: Context): string {
    const parts: string[] = [];

    if (context.industry) {
      parts.push(context.industry);
    }
    if (context.dealSize) {
      parts.push(context.dealSize);
    } else if (context.dealValue !== undefined) {
      parts.push(this.bucketizeDealSize(context.dealValue));
    }
    if (context.stage) {
      parts.push(context.stage);
    }

    return parts.join(':') || 'all';
  }

  /**
   * Phase 2: Optimized context key using only significant dimensions
   * (To be implemented when we learn which dimensions matter)
   */
  async generateOptimized(
    context: Context,
    tenantId: string,
    significantDimensions?: string[]
  ): Promise<string> {
    // If no significant dimensions provided, fall back to simple
    if (!significantDimensions || significantDimensions.length === 0) {
      return this.generateSimple(context);
    }

    const keyParts: string[] = [];

    if (significantDimensions.includes('industry') && context.industry) {
      keyParts.push(context.industry);
    }
    if (significantDimensions.includes('dealSize')) {
      if (context.dealSize) {
        keyParts.push(context.dealSize);
      } else if (context.dealValue !== undefined) {
        keyParts.push(this.bucketizeDealSize(context.dealValue));
      }
    }
    if (significantDimensions.includes('stage') && context.stage) {
      keyParts.push(context.stage);
    }

    return keyParts.join(':') || 'all';
  }

  /**
   * Bucketize deal value into size categories
   */
  private bucketizeDealSize(dealValue: number): string {
    if (dealValue < 50000) return 'small';
    if (dealValue < 500000) return 'medium';
    return 'large';
  }

  /**
   * Generate context key for recommendations service
   */
  generateForRecommendations(context: Context): string {
    const parts: string[] = [];

    if (context.itemType) {
      parts.push(context.itemType);
    }
    if (context.userRole) {
      parts.push(context.userRole);
    }

    return parts.join(':') || 'all';
  }

  /**
   * Generate context key for risk evaluation service
   */
  generateForRisk(context: Context): string {
    return this.generateSimple(context);
  }

  /**
   * Generate context key for forecasting service
   */
  generateForForecast(context: Context): string {
    return this.generateSimple(context);
  }
}

/**
 * Singleton instance
 */
export const contextKeyGenerator = new ContextKeyGenerator();
