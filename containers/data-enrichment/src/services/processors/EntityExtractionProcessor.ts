/**
 * Entity Extraction Processor
 * Extracts named entities (persons, organizations, locations, dates, etc.) from text
 */

import { BaseProcessor } from './BaseProcessor.js';
import { EnrichmentProcessorType, ExtractedEntity } from '../../types/enrichment.types.js';
import { log } from '../../utils/logger.js';

export class EntityExtractionProcessor extends BaseProcessor {
  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.ENTITY_EXTRACTION;
  }

  async process(text: string, config: Record<string, unknown>): Promise<ExtractedEntity[]> {
    const tenantId = (config.tenantId as string) || '';
    if (!tenantId) {
      throw new Error('tenantId is required for entity extraction');
    }

    const prompt = `Extract named entities from the following text. Return a JSON array of entities with type (person, organization, location, date, product, etc.), text, and confidence (0-1).

Text:
${text}

Return only the JSON array, no additional text.`;

    try {
      const response = await this.callAI(prompt, tenantId, {
        temperature: 0.1,
        maxTokens: 1000,
      });

      if (!response) {
        return [];
      }

      const entities = JSON.parse(response) as ExtractedEntity[];
      return Array.isArray(entities) ? entities : [];
    } catch (error: any) {
      log.error('Entity extraction failed', error, {
        processor: this.getType(),
        service: 'data-enrichment',
      });
      return [];
    }
  }
}
