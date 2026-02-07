/**
 * Sentiment Analysis Processor
 * Analyzes sentiment (positive/negative/neutral/mixed) of text
 */

import { BaseProcessor } from './BaseProcessor.js';
import { EnrichmentProcessorType, SentimentAnalysisResult } from '../../types/enrichment.types.js';
import { log } from '../../utils/logger.js';

export class SentimentAnalysisProcessor extends BaseProcessor {
  getType(): EnrichmentProcessorType {
    return EnrichmentProcessorType.SENTIMENT_ANALYSIS;
  }

  async process(text: string, config: Record<string, unknown>): Promise<SentimentAnalysisResult> {
    const tenantId = (config.tenantId as string) || '';
    if (!tenantId) {
      throw new Error('tenantId is required for sentiment analysis');
    }

    const prompt = `Analyze the sentiment of the following text. Return JSON with sentiment (positive/negative/neutral/mixed), score (-1 to 1), and confidence (0-1).

Text:
${text}

Return only the JSON object, no additional text.`;

    try {
      const response = await this.callAI(prompt, tenantId, {
        temperature: 0.1,
        maxTokens: 300,
      });

      const result = JSON.parse(response) as SentimentAnalysisResult;
      return result;
    } catch (error: any) {
      log.error('Sentiment analysis failed', error, {
        processor: this.getType(),
        service: 'data-enrichment',
      });
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
      };
    }
  }
}
