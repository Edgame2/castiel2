/**
 * Base processor interface
 */
import { EnrichmentProcessorType } from '../../types/enrichment.types.js';

export interface IEnrichmentProcessor {
  process(text: string, config: Record<string, unknown>): Promise<unknown>;
  getType(): EnrichmentProcessorType;
}
