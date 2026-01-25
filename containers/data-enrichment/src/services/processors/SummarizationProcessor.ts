/**
 * Summarization Processor
 * Generates summaries of text (short/medium/long)
 */

import { BaseProcessor } from './BaseProcessor';
import { EnrichmentProcessorType, SummarizationResult } from '../../types/enrichment.types';
import { log } from '../../utils/logger';

export class SummarizationProcessor extends BaseProcessor {
  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.SUMMARIZATION;
  }

  async process(text: string, config: Record<string, unknown>): Promise<SummarizationResult> {
    const tenantId = (config.tenantId as string) || '';
    if (!tenantId) {
      throw new Error('tenantId is required for summarization');
    }
    const length = (config.length as 'short' | 'medium' | 'long') || 'medium';
    const maxWords = length === 'short' ? 50 : length === 'medium' ? 150 : 300;

    const prompt = `Summarize the following text in approximately ${maxWords} words. Also extract 3-5 key points. Return JSON with summary, keyPoints[], and wordCount.

Text:
${text}

Return only the JSON object, no additional text.`;

    try {
      const response = await this.callAI(prompt, tenantId, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const result = JSON.parse(response) as SummarizationResult;
      result.length = length;
      return result;
    } catch (error: any) {
      log.error('Summarization failed', error, {
        processor: this.getType(),
        service: 'data-enrichment',
      });
      return {
        summary: '',
        length,
        keyPoints: [],
        wordCount: 0,
      };
    }
  }
}
