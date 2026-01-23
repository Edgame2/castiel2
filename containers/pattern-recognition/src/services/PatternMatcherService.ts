/**
 * Pattern Matcher Service
 * Handles pattern scanning and matching
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { PatternService } from './PatternService';
import {
  PatternScan,
  PatternMatch,
  ScanPatternsInput,
  PatternType,
  PatternMatchSeverity,
} from '../types/pattern.types';

export class PatternMatcherService {
  private containerName = 'pattern_scans';
  private matchesContainerName = 'pattern_matches';
  private patternService: PatternService;

  constructor(patternService: PatternService) {
    this.patternService = patternService;
  }

  /**
   * Scan for patterns
   * Note: This is a placeholder - actual scanning would analyze code
   */
  async scanPatterns(input: ScanPatternsInput): Promise<PatternScan> {
    if (!input.tenantId || !input.target || !input.target.path) {
      throw new BadRequestError('tenantId and target.path are required');
    }

    // Get patterns to scan for
    const patterns = await this.patternService.getEnabledPatterns(
      input.tenantId,
      input.patternTypes,
      input.target.language
    );

    // Filter to specific patterns if provided
    const patternsToScan = input.patterns
      ? patterns.filter((pattern) => input.patterns!.includes(pattern.id))
      : patterns;

    // Create scan record
    const scan: PatternScan = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      target: input.target,
      patterns: patternsToScan.map((p) => p.id),
      patternTypes: input.patternTypes,
      status: 'pending',
      results: {
        totalMatches: 0,
        designPatterns: 0,
        antiPatterns: 0,
        codeStyle: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
      },
      createdAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(scan, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create pattern scan');
      }

      // Start scanning (async)
      this.executeScan(resource as PatternScan, patternsToScan, input.tenantId).catch(
        (error) => {
          console.error('Pattern scan execution failed:', error);
        }
      );

      return resource as PatternScan;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute pattern scan (async)
   */
  private async executeScan(
    scan: PatternScan,
    patterns: any[],
    tenantId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.updateStatus(scan.id, tenantId, 'running', {
        startedAt: new Date(),
      });

      const matches: PatternMatch[] = [];

      // Scan each pattern
      for (const pattern of patterns) {
        try {
          const patternMatches = await this.matchPattern(pattern, scan, tenantId);
          matches.push(...patternMatches);
        } catch (error: any) {
          console.error(`Pattern matching failed for ${pattern.name}:`, error);
        }
      }

      // Save matches
      const matchesContainer = getContainer(this.matchesContainerName);
      for (const match of matches) {
        await matchesContainer.items.create(match, {
          partitionKey: tenantId,
        });
      }

      // Calculate summary
      const summary = {
        totalMatches: matches.length,
        designPatterns: matches.filter((m) => m.patternType === PatternType.DESIGN_PATTERN && !m.isAntiPattern).length,
        antiPatterns: matches.filter((m) => m.isAntiPattern).length,
        codeStyle: matches.filter((m) => m.patternType === PatternType.CODE_STYLE).length,
        highSeverity: matches.filter((m) => m.severity === PatternMatchSeverity.HIGH).length,
        mediumSeverity: matches.filter((m) => m.severity === PatternMatchSeverity.MEDIUM).length,
        lowSeverity: matches.filter((m) => m.severity === PatternMatchSeverity.LOW).length,
      };

      const duration = Date.now() - startTime;

      // Update scan with results
      await this.updateStatus(scan.id, tenantId, 'completed', {
        results: summary,
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      await this.updateStatus(scan.id, tenantId, 'failed', {
        error: error.message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Match a pattern against target
   */
  private async matchPattern(
    pattern: any,
    scan: PatternScan,
    tenantId: string
  ): Promise<PatternMatch[]> {
    // Placeholder pattern matching logic
    // In a real implementation, this would:
    // 1. Load the target file/directory
    // 2. Parse code (AST, etc.)
    // 3. Apply pattern regex/AST/structure matching
    // 4. Generate matches with locations

    const matches: PatternMatch[] = [];

    // Simulate finding matches
    const numMatches = Math.floor(Math.random() * 5); // 0-4 matches
    const isAntiPattern = pattern.type === PatternType.ANTI_PATTERN;

    for (let i = 0; i < numMatches; i++) {
      const match: PatternMatch = {
        id: uuidv4(),
        tenantId,
        patternId: pattern.id,
        patternName: pattern.name,
        patternType: pattern.type,
        scanId: scan.id,
        location: {
          file: scan.target.path,
          line: Math.floor(Math.random() * 100) + 1,
          column: Math.floor(Math.random() * 50) + 1,
          code: `// Matched code snippet for ${pattern.name}`,
        },
        confidence: 0.7 + Math.random() * 0.3, // 0.7-1.0
        severity: pattern.enforcement?.severity || PatternMatchSeverity.MEDIUM,
        isAntiPattern,
        suggestions: isAntiPattern
          ? [`Consider refactoring to avoid ${pattern.name}`, 'Review code structure']
          : [`Good use of ${pattern.name} pattern`],
        autoFixable: pattern.enforcement?.autoFix || false,
        fixed: false,
        createdAt: new Date(),
      };

      matches.push(match);
    }

    return matches;
  }

  /**
   * Update scan status
   */
  async updateStatus(
    scanId: string,
    tenantId: string,
    status: PatternScan['status'],
    updates?: {
      results?: PatternScan['results'];
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
    }
  ): Promise<PatternScan> {
    const existing = await this.getById(scanId, tenantId);

    const updated: PatternScan = {
      ...existing,
      status,
      ...updates,
      results: updates?.results || existing.results,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(scanId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update pattern scan');
      }

      return resource as PatternScan;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Pattern scan ${scanId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get scan by ID
   */
  async getById(scanId: string, tenantId: string): Promise<PatternScan> {
    if (!scanId || !tenantId) {
      throw new BadRequestError('scanId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(scanId, tenantId).read<PatternScan>();

      if (!resource) {
        throw new NotFoundError(`Pattern scan ${scanId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Pattern scan ${scanId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get matches for a scan
   */
  async getMatches(
    scanId: string,
    tenantId: string,
    filters?: {
      isAntiPattern?: boolean;
      severity?: PatternMatchSeverity;
      patternType?: PatternType;
      limit?: number;
    }
  ): Promise<PatternMatch[]> {
    if (!scanId || !tenantId) {
      throw new BadRequestError('scanId and tenantId are required');
    }

    const container = getContainer(this.matchesContainerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.scanId = @scanId';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@scanId', value: scanId },
    ];

    if (filters?.isAntiPattern !== undefined) {
      query += ' AND c.isAntiPattern = @isAntiPattern';
      parameters.push({ name: '@isAntiPattern', value: filters.isAntiPattern });
    }

    if (filters?.severity) {
      query += ' AND c.severity = @severity';
      parameters.push({ name: '@severity', value: filters.severity });
    }

    if (filters?.patternType) {
      query += ' AND c.patternType = @patternType';
      parameters.push({ name: '@patternType', value: filters.patternType });
    }

    query += ' ORDER BY c.createdAt ASC';

    const limit = filters?.limit || 1000;

    try {
      const { resources } = await container.items
        .query<PatternMatch>({
          query,
          parameters,
        })
        .fetchAll();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to get pattern matches: ${error.message}`);
    }
  }

  /**
   * List scans
   */
  async list(
    tenantId: string,
    filters?: {
      status?: PatternScan['status'];
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: PatternScan[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<PatternScan>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list pattern scans: ${error.message}`);
    }
  }
}

