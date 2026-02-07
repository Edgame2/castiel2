/**
 * Classification Processor
 * Classifies text into categories with tags and subcategories
 */

import { BaseProcessor } from './BaseProcessor.js';
import { EnrichmentProcessorType, ClassificationResult } from '../../types/enrichment.types.js';
import { log } from '../../utils/logger.js';

export class ClassificationProcessor extends BaseProcessor {
  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.CLASSIFICATION;
  }

  async process(text: string, config: Record<string, unknown>): Promise<ClassificationResult> {
    const tenantId = (config.tenantId as string) || '';
    if (!tenantId) {
      throw new Error('tenantId is required for classification');
    }
    const categories = (config.categories as string[]) || [
      'Technology',
      'Business',
      'Finance',
      'Healthcare',
      'Education',
      'Legal',
      'Marketing',
      'Other',
    ];

    const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}. Also provide relevant tags and subcategories. Return JSON with category, confidence (0-1), subcategories[], and tags[].

Text:
${text}

Return only the JSON object, no additional text.`;

    try {
      const response = await this.callAI(prompt, tenantId, {
        temperature: 0.1,
        maxTokens: 500,
      });

      const result = JSON.parse(response) as ClassificationResult;
      return result;
    } catch (error: any) {
      log.error('Classification failed', error, {
        processor: this.getType(),
        service: 'data-enrichment',
      });
      return {
        category: 'Other',
        confidence: 0,
        subcategories: [],
        tags: [],
      };
    }
  }
}
