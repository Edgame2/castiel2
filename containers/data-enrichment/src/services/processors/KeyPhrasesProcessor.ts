/**
 * Key Phrases Processor
 * Extracts key phrases and topics from text
 */

import { BaseProcessor } from './BaseProcessor.js';
import { EnrichmentProcessorType, KeyPhrasesResult } from '../../types/enrichment.types.js';
import { log } from '../../utils/logger.js';

export class KeyPhrasesProcessor extends BaseProcessor {
  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.KEY_PHRASES;
  }

  async process(text: string, config: Record<string, unknown>): Promise<KeyPhrasesResult> {
    const tenantId = (config.tenantId as string) || '';
    if (!tenantId) {
      throw new Error('tenantId is required for key phrases extraction');
    }

    const prompt = `Extract key phrases and topics from the following text. Return JSON with phrases array (text and score 0-1) and topics array.

Text:
${text}

Return only the JSON object, no additional text.`;

    try {
      const response = await this.callAI(prompt, tenantId, {
        temperature: 0.1,
        maxTokens: 500,
      });

      const result = JSON.parse(response) as KeyPhrasesResult;
      return result;
    } catch (error: any) {
      log.error('Key phrases extraction failed', error, {
        processor: this.getType(),
        service: 'data-enrichment',
      });
      return {
        phrases: [],
        topics: [],
      };
    }
  }
}
