/**
 * Integration Deduplication Service
 * Finds and merges duplicate shards created from integrations
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';

/**
 * Deduplication rule
 */
export interface DeduplicationRule {
  /** Field to match on */
  field: string;
  
  /** Match type */
  matchType: 'exact' | 'fuzzy' | 'soundex' | 'metaphone';
  
  /** Weight for scoring (0-1) */
  weight: number;
  
  /** Minimum similarity threshold (for fuzzy matching) */
  threshold?: number;
}

/**
 * Merge strategy
 */
export type MergeStrategy =
  | 'keep_first'        // Keep first created, discard others
  | 'keep_last'         // Keep last created, discard others
  | 'keep_most_complete' // Keep shard with most non-null fields
  | 'merge_fields'      // Merge all fields (first non-null wins)
  | 'manual';           // Flag for manual review

/**
 * Duplicate match result
 */
export interface DuplicateMatch {
  shardId: string;
  score: number;
  matchedFields: string[];
}

/**
 * Integration Deduplication Service
 */
export class IntegrationDeduplicationService {
  private shardRepository: ShardRepository;
  private monitoring: IMonitoringProvider;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
  }

  /**
   * Find duplicate shards before creation
   */
  async findDuplicates(
    tenantId: string,
    shardTypeId: string,
    data: Record<string, any>,
    rules: DeduplicationRule[]
  ): Promise<string[]> {
    const startTime = Date.now();
    const duplicates: Set<string> = new Set();

    try {
      // Build search query based on rules
      for (const rule of rules) {
        const fieldValue = data[rule.field];
        if (!fieldValue) {
          continue;
        }

        let matches: string[] = [];

        switch (rule.matchType) {
          case 'exact':
            matches = await this.findExactMatches(tenantId, shardTypeId, rule.field, fieldValue);
            break;
          case 'fuzzy':
            matches = await this.findFuzzyMatches(
              tenantId,
              shardTypeId,
              rule.field,
              fieldValue,
              rule.threshold || 0.8
            );
            break;
          case 'soundex':
          case 'metaphone':
            matches = await this.findPhoneticMatches(
              tenantId,
              shardTypeId,
              rule.field,
              fieldValue,
              rule.matchType
            );
            break;
        }

        matches.forEach((id) => duplicates.add(id));
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('integration.deduplication.find.duration', duration, {
        tenantId,
        shardTypeId,
        rulesCount: rules.length,
        duplicatesFound: duplicates.size,
      });

      return Array.from(duplicates);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'findDuplicates',
        tenantId,
        shardTypeId,
      });
      return [];
    }
  }

  /**
   * Find exact field matches
   */
  private async findExactMatches(
    tenantId: string,
    shardTypeId: string,
    field: string,
    value: any
  ): Promise<string[]> {
    // Use list() instead of search() which doesn't exist
    const results = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId,
      },
      limit: 100,
    });

    // Filter by structuredData field value
    const matches = results.shards
      .filter((shard: any) => {
        const fieldValue = (shard.structuredData as Record<string, any>)?.[field];
        return fieldValue === value;
      })
      .map((shard: any) => shard.id);

    return matches;
  }

  /**
   * Find fuzzy matches using string similarity
   */
  private async findFuzzyMatches(
    tenantId: string,
    shardTypeId: string,
    field: string,
    value: string,
    threshold: number
  ): Promise<string[]> {
    // Get all shards of this type
    const results = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId,
      },
      limit: 1000,
    });

    const matches: string[] = [];
    const normalizedValue = this.normalizeString(value);

    for (const shard of results.shards) {
      const fieldValue = shard.structuredData[field];
      if (!fieldValue) {
        continue;
      }

      const normalizedFieldValue = this.normalizeString(String(fieldValue));
      const similarity = this.calculateSimilarity(normalizedValue, normalizedFieldValue);

      if (similarity >= threshold) {
        matches.push(shard.id);
      }
    }

    return matches;
  }

  /**
   * Find phonetic matches (soundex/metaphone)
   */
  private async findPhoneticMatches(
    tenantId: string,
    shardTypeId: string,
    field: string,
    value: string,
    algorithm: 'soundex' | 'metaphone'
  ): Promise<string[]> {
    const phoneticCode = algorithm === 'soundex'
      ? this.soundex(value)
      : this.metaphone(value);

    // Get all shards and compare phonetic codes
    const results = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId,
      },
      limit: 1000,
    });

    const matches: string[] = [];

    for (const shard of results.shards) {
      const fieldValue = (shard.structuredData as Record<string, any>)?.[field];
      if (!fieldValue) {
        continue;
      }

      const fieldPhoneticCode = algorithm === 'soundex'
        ? this.soundex(String(fieldValue))
        : this.metaphone(String(fieldValue));

      if (phoneticCode === fieldPhoneticCode) {
        matches.push(shard.id);
      }
    }

    return matches;
  }

  /**
   * Merge duplicate shards
   */
  async mergeDuplicates(
    tenantId: string,
    shardIds: string[],
    strategy: MergeStrategy
  ): Promise<string> {
    if (shardIds.length < 2) {
      throw new Error('Need at least 2 shards to merge');
    }

    const startTime = Date.now();

    try {
      // Fetch all shards
      const shards = await Promise.all(
        shardIds.map((id) => this.shardRepository.findById(id, tenantId))
      );

      const validShards = shards.filter((s) => s !== null);

      if (validShards.length < 2) {
        throw new Error('Could not fetch all shards');
      }

      let masterShard: any;

      switch (strategy) {
        case 'keep_first':
          masterShard = validShards.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )[0];
          break;

        case 'keep_last':
          masterShard = validShards.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          break;

        case 'keep_most_complete':
          masterShard = validShards.sort((a, b) => {
            const aFields = Object.keys(a.structuredData).filter(
              (k) => a.structuredData[k] != null
            ).length;
            const bFields = Object.keys(b.structuredData).filter(
              (k) => b.structuredData[k] != null
            ).length;
            return bFields - aFields;
          })[0];
          break;

        case 'merge_fields':
          masterShard = await this.mergeShardFields(validShards);
          break;

        default:
          throw new Error(`Unsupported merge strategy: ${strategy}`);
      }

      // Delete duplicate shards (keep master)
      const duplicateIds = shardIds.filter((id) => id !== masterShard!.id);
      for (const id of duplicateIds) {
        await this.shardRepository.delete(id, tenantId);
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('integration.deduplication.merge.completed', {
        tenantId,
        strategy,
        mergedCount: duplicateIds.length,
        masterShardId: masterShard!.id,
        duration,
      });

      return masterShard!.id;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'mergeDuplicates',
        tenantId,
        shardIdsCount: shardIds.length,
        strategy,
      });
      throw error;
    }
  }

  /**
   * Merge fields from multiple shards (first non-null wins)
   */
  private async mergeShardFields(shards: any[]): Promise<any> {
    const merged = { ...shards[0] };
    const mergedData: Record<string, any> = {};

    // Merge structured data
    for (const shard of shards) {
      for (const [key, value] of Object.entries(shard.structuredData)) {
        if (value != null && mergedData[key] == null) {
          mergedData[key] = value;
        }
      }
    }

    merged.structuredData = mergedData;
    return merged;
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) {return len2 === 0 ? 1 : 0;}
    if (len2 === 0) {return 0;}

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - distance / maxLength;
  }

  /**
   * Soundex algorithm for phonetic matching
   */
  private soundex(str: string): string {
    const s = str.toUpperCase().replace(/[^A-Z]/g, '');
    if (!s) {return '';}

    const firstLetter = s[0];
    let code = firstLetter;

    const soundexMap: Record<string, string> = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6',
    };

    let prevCode = soundexMap[firstLetter] || '';

    for (let i = 1; i < s.length && code.length < 4; i++) {
      const char = s[i];
      const charCode = soundexMap[char] || '';

      if (charCode && charCode !== prevCode) {
        code += charCode;
        prevCode = charCode;
      } else if (!charCode) {
        prevCode = '';
      }
    }

    return code.padEnd(4, '0');
  }

  /**
   * Metaphone algorithm for phonetic matching
   */
  private metaphone(str: string): string {
    // Simplified metaphone implementation
    let s = str.toUpperCase().replace(/[^A-Z]/g, '');
    if (!s) {return '';}

    // Apply metaphone rules (simplified)
    s = s.replace(/^KN|^GN|^PN|^AE|^WR/, (m) => m[1]);
    s = s.replace(/X/g, 'KS');
    s = s.replace(/PH/g, 'F');
    s = s.replace(/SCH/g, 'SKH');
    s = s.replace(/[AEIOU]/g, '0');
    s = s.replace(/B/g, 'P');
    s = s.replace(/Z/g, 'S');
    s = s.replace(/M/g, 'N');
    s = s.replace(/K/g, 'C');
    s = s.replace(/G/g, 'K');
    s = s.replace(/D/g, 'T');
    s = s.replace(/0+/g, '0');
    s = s.replace(/(.)\1+/g, '$1');

    return s.substring(0, 4);
  }
}
