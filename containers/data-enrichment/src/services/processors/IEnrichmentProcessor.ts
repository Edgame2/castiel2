/**
 * Base processor interface
 */
import { EnrichmentProcessorType } from '../../types/enrichment.types';

export interface IEnrichmentProcessor {
  process(text: string, config: Record<string, unknown>): Promise<unknown>;
  getType(): EnrichmentProcessorType;
}
