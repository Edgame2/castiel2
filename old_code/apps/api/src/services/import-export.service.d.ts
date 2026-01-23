/**
 * Import/Export Service
 *
 * Handles shard data import and export operations
 */
import type { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';
import { ExportJob, ImportJob, ImportValidationResult, CreateExportRequest, CreateImportRequest } from '../types/import-export.types.js';
import type { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Import/Export Service
 */
export declare class ImportExportService {
    private readonly redis;
    private readonly shardRepository;
    private readonly server?;
    private readonly jobTTL;
    constructor(redis: Redis, shardRepository: ShardRepository, server?: FastifyInstance | undefined);
    /**
     * Create an export job
     */
    createExportJob(tenantId: string, userId: string, request: CreateExportRequest): Promise<ExportJob>;
    /**
     * Get export job status
     */
    getExportJob(tenantId: string, jobId: string): Promise<ExportJob | null>;
    /**
     * Execute export job
     */
    private executeExport;
    /**
     * Fetch shards for export based on options
     */
    private fetchShardsForExport;
    /**
     * Generate export content in specified format
     */
    private generateExportContent;
    /**
     * Generate JSON export
     */
    private generateJSONExport;
    /**
     * Generate NDJSON export
     */
    private generateNDJSONExport;
    /**
     * Generate CSV export
     */
    private generateCSVExport;
    /**
     * Format a shard for export
     */
    private formatShardForExport;
    /**
     * Infer fields from shard data
     */
    private inferFieldsFromShards;
    /**
     * Create an import job
     */
    createImportJob(tenantId: string, userId: string, request: CreateImportRequest): Promise<ImportJob>;
    /**
     * Get import job status
     */
    getImportJob(tenantId: string, jobId: string): Promise<ImportJob | null>;
    /**
     * Validate import data without creating shards
     */
    validateImport(tenantId: string, request: CreateImportRequest, previewRows?: number): Promise<ImportValidationResult>;
    /**
     * Execute import job
     */
    private executeImport;
    /**
     * Parse import content based on format
     */
    private parseImportContent;
    /**
     * Parse CSV content
     */
    private parseCSV;
    /**
     * Parse a single CSV line
     */
    private parseCSVLine;
    /**
     * Apply column mappings to a row
     */
    private applyColumnMappings;
    /**
     * Apply a transformer to a value
     */
    private applyTransformer;
    private updateExportJob;
    private updateImportJob;
    /**
     * Get export file content
     */
    getExportFileContent(tenantId: string, jobId: string): Promise<string | null>;
    private flattenObject;
    private getNestedValue;
    private escapeCSVValue;
}
//# sourceMappingURL=import-export.service.d.ts.map