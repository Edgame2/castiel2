/**
 * Import/Export Service
 *
 * Handles shard data import and export operations
 */
import crypto from 'crypto';
import { ExportFormat, ImportFormat, ExportJobStatus, ImportJobStatus, } from '../types/import-export.types.js';
// Redis keys
const EXPORT_JOB_PREFIX = 'export_jobs:';
const IMPORT_JOB_PREFIX = 'import_jobs:';
/**
 * Import/Export Service
 */
export class ImportExportService {
    redis;
    shardRepository;
    server;
    jobTTL = 7 * 24 * 60 * 60; // 7 days
    constructor(redis, shardRepository, server) {
        this.redis = redis;
        this.shardRepository = shardRepository;
        this.server = server;
    }
    // =====================================
    // EXPORT OPERATIONS
    // =====================================
    /**
     * Create an export job
     */
    async createExportJob(tenantId, userId, request) {
        const id = crypto.randomUUID();
        const job = {
            id,
            tenantId,
            userId,
            options: {
                format: request.format,
                shardTypeId: request.shardTypeId,
                shardIds: request.shardIds,
                ...request.options,
            },
            status: ExportJobStatus.PENDING,
            totalShards: 0,
            processedShards: 0,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.jobTTL * 1000),
        };
        const key = `${EXPORT_JOB_PREFIX}${tenantId}:${id}`;
        await this.redis.setex(key, this.jobTTL, JSON.stringify(job));
        // Start export in background
        this.executeExport(job).catch((error) => {
            this.server?.log.error({ error, jobId: id }, 'Export job failed');
        });
        return job;
    }
    /**
     * Get export job status
     */
    async getExportJob(tenantId, jobId) {
        const key = `${EXPORT_JOB_PREFIX}${tenantId}:${jobId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Execute export job
     */
    async executeExport(job) {
        try {
            // Update status
            job.status = ExportJobStatus.IN_PROGRESS;
            job.startedAt = new Date();
            await this.updateExportJob(job);
            // Fetch shards
            const shards = await this.fetchShardsForExport(job);
            job.totalShards = shards.length;
            // Generate export content
            const content = await this.generateExportContent(shards, job.options);
            job.processedShards = shards.length;
            // Store file (in production, upload to blob storage)
            const fileName = `export-${job.id}.${job.options.format}`;
            const fileKey = `export_files:${job.tenantId}:${job.id}`;
            await this.redis.setex(fileKey, this.jobTTL, content);
            // Update job
            job.status = ExportJobStatus.COMPLETED;
            job.completedAt = new Date();
            job.fileName = fileName;
            job.fileSize = Buffer.byteLength(content, 'utf-8');
            job.fileUrl = `/api/v1/exports/${job.id}/download`;
            await this.updateExportJob(job);
            this.server?.log.info({ jobId: job.id, shards: job.totalShards }, 'Export completed');
        }
        catch (error) {
            job.status = ExportJobStatus.FAILED;
            job.error = error.message;
            job.completedAt = new Date();
            await this.updateExportJob(job);
        }
    }
    /**
     * Fetch shards for export based on options
     */
    async fetchShardsForExport(job) {
        const { options, tenantId } = job;
        const shards = [];
        if (options.shardIds && options.shardIds.length > 0) {
            // Fetch specific shards
            for (const id of options.shardIds) {
                const shard = await this.shardRepository.findById(id, tenantId);
                if (shard) {
                    shards.push(shard);
                }
            }
        }
        else {
            // Fetch by filter
            let continuationToken;
            do {
                const result = await this.shardRepository.list({
                    filter: {
                        tenantId,
                        shardTypeId: options.shardTypeId,
                        status: options.filters?.status?.[0],
                        createdAfter: options.filters?.createdAfter,
                        createdBefore: options.filters?.createdBefore,
                        tags: options.filters?.tags,
                    },
                    limit: 100,
                    continuationToken,
                });
                shards.push(...result.shards);
                continuationToken = result.continuationToken;
            } while (continuationToken);
        }
        return shards;
    }
    /**
     * Generate export content in specified format
     */
    async generateExportContent(shards, options) {
        switch (options.format) {
            case ExportFormat.JSON:
                return this.generateJSONExport(shards, options);
            case ExportFormat.NDJSON:
                return this.generateNDJSONExport(shards, options);
            case ExportFormat.CSV:
                return this.generateCSVExport(shards, options);
            case ExportFormat.EXCEL:
                // For Excel, return JSON and let controller handle XLSX conversion
                return this.generateJSONExport(shards, options);
            default:
                throw new Error(`Unsupported export format: ${options.format}`);
        }
    }
    /**
     * Generate JSON export
     */
    generateJSONExport(shards, options) {
        const exportData = shards.map((shard) => this.formatShardForExport(shard, options));
        return JSON.stringify(exportData, null, 2);
    }
    /**
     * Generate NDJSON export
     */
    generateNDJSONExport(shards, options) {
        return shards
            .map((shard) => JSON.stringify(this.formatShardForExport(shard, options)))
            .join('\n');
    }
    /**
     * Generate CSV export
     */
    generateCSVExport(shards, options) {
        if (shards.length === 0) {
            return '';
        }
        const delimiter = options.csvDelimiter || ',';
        const fields = options.fields || this.inferFieldsFromShards(shards, options);
        // Header row
        const header = fields.join(delimiter);
        // Data rows
        const rows = shards.map((shard) => {
            const formatted = this.formatShardForExport(shard, options);
            return fields
                .map((field) => {
                const value = this.getNestedValue(formatted, field);
                return this.escapeCSVValue(value, delimiter);
            })
                .join(delimiter);
        });
        return [header, ...rows].join('\n');
    }
    /**
     * Format a shard for export
     */
    formatShardForExport(shard, options) {
        const result = {
            id: shard.id,
            shardTypeId: shard.shardTypeId,
            status: shard.status,
            createdAt: shard.createdAt,
            updatedAt: shard.updatedAt,
        };
        if (options.flattenStructuredData && shard.structuredData) {
            Object.assign(result, this.flattenObject(shard.structuredData, 'data'));
        }
        else {
            result.structuredData = shard.structuredData;
        }
        if (options.includeMetadata && shard.metadata) {
            result.metadata = shard.metadata;
        }
        return result;
    }
    /**
     * Infer fields from shard data
     */
    inferFieldsFromShards(shards, options) {
        const fields = new Set(['id', 'shardTypeId', 'status', 'createdAt', 'updatedAt']);
        for (const shard of shards) {
            if (options.flattenStructuredData && shard.structuredData) {
                for (const key of Object.keys(this.flattenObject(shard.structuredData, 'data'))) {
                    fields.add(key);
                }
            }
            else if (shard.structuredData) {
                for (const key of Object.keys(shard.structuredData)) {
                    fields.add(`structuredData.${key}`);
                }
            }
        }
        return Array.from(fields);
    }
    // =====================================
    // IMPORT OPERATIONS
    // =====================================
    /**
     * Create an import job
     */
    async createImportJob(tenantId, userId, request) {
        const id = crypto.randomUUID();
        const job = {
            id,
            tenantId,
            userId,
            options: {
                format: request.format,
                shardTypeId: request.shardTypeId,
                columnMappings: request.columnMappings,
                ...request.options,
            },
            status: ImportJobStatus.PENDING,
            sourceFileName: request.fileName,
            sourceFileSize: Buffer.byteLength(request.fileContent, 'base64'),
            totalRows: 0,
            processedRows: 0,
            successfulRows: 0,
            failedRows: 0,
            createdShardIds: [],
            updatedShardIds: [],
            createdAt: new Date(),
            errors: [],
        };
        // Store file content temporarily
        const fileKey = `import_files:${tenantId}:${id}`;
        await this.redis.setex(fileKey, 3600, request.fileContent); // 1 hour
        const key = `${IMPORT_JOB_PREFIX}${tenantId}:${id}`;
        await this.redis.setex(key, this.jobTTL, JSON.stringify(job));
        // Start import in background
        this.executeImport(job).catch((error) => {
            this.server?.log.error({ error, jobId: id }, 'Import job failed');
        });
        return job;
    }
    /**
     * Get import job status
     */
    async getImportJob(tenantId, jobId) {
        const key = `${IMPORT_JOB_PREFIX}${tenantId}:${jobId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Validate import data without creating shards
     */
    async validateImport(tenantId, request, previewRows = 10) {
        const result = {
            valid: true,
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            errors: [],
            warnings: [],
            preview: [],
        };
        try {
            const content = Buffer.from(request.fileContent, 'base64').toString('utf-8');
            const rows = this.parseImportContent(content, request.format, request.options);
            result.totalRows = rows.length;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowErrors = [];
                // Apply column mappings
                const mappedData = this.applyColumnMappings(row, request.columnMappings);
                // Validate required fields
                for (const mapping of request.columnMappings) {
                    if (mapping.required && !mappedData[mapping.targetField]) {
                        rowErrors.push({
                            row: i + 1,
                            field: mapping.targetField,
                            error: `Required field is missing`,
                        });
                    }
                }
                if (rowErrors.length > 0) {
                    result.invalidRows++;
                    result.errors.push(...rowErrors);
                    result.valid = false;
                }
                else {
                    result.validRows++;
                }
                // Add to preview
                if (i < previewRows) {
                    result.preview.push({
                        row: i + 1,
                        data: mappedData,
                    });
                }
            }
        }
        catch (error) {
            result.valid = false;
            result.errors.push({
                row: 0,
                error: `Failed to parse file: ${error.message}`,
            });
        }
        return result;
    }
    /**
     * Execute import job
     */
    async executeImport(job) {
        try {
            // Update status
            job.status = ImportJobStatus.VALIDATING;
            job.startedAt = new Date();
            await this.updateImportJob(job);
            // Get file content
            const fileKey = `import_files:${job.tenantId}:${job.id}`;
            const fileContent = await this.redis.get(fileKey);
            if (!fileContent) {
                throw new Error('Import file not found');
            }
            const content = Buffer.from(fileContent, 'base64').toString('utf-8');
            const rows = this.parseImportContent(content, job.options.format, job.options);
            job.totalRows = rows.length;
            // Validate first
            const validation = await this.validateImport(job.tenantId, {
                format: job.options.format,
                shardTypeId: job.options.shardTypeId,
                fileContent,
                fileName: job.sourceFileName,
                columnMappings: job.options.columnMappings,
            });
            job.validationResult = validation;
            if (!validation.valid && job.options.onError === 'abort') {
                job.status = ImportJobStatus.FAILED;
                job.error = 'Validation failed';
                await this.updateImportJob(job);
                return;
            }
            // Process import
            job.status = ImportJobStatus.IN_PROGRESS;
            await this.updateImportJob(job);
            const batchSize = job.options.batchSize || 50;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                for (let j = 0; j < batch.length; j++) {
                    const rowIndex = i + j;
                    const row = batch[j];
                    try {
                        const mappedData = this.applyColumnMappings(row, job.options.columnMappings);
                        const input = {
                            tenantId: job.tenantId,
                            userId: job.userId,
                            shardTypeId: job.options.shardTypeId,
                            structuredData: mappedData,
                            source: 'import',
                            sourceDetails: {
                                importJobId: job.id,
                            },
                            acl: [
                                {
                                    userId: job.userId,
                                    permissions: ['read', 'write', 'delete', 'admin'],
                                    grantedBy: job.userId,
                                    grantedAt: new Date(),
                                },
                            ],
                        };
                        const shard = await this.shardRepository.create(input);
                        job.createdShardIds.push(shard.id);
                        job.successfulRows++;
                    }
                    catch (error) {
                        job.failedRows++;
                        job.errors.push({
                            row: rowIndex + 1,
                            error: error.message,
                        });
                        if (job.options.onError === 'abort') {
                            throw error;
                        }
                    }
                    job.processedRows++;
                }
                // Update progress
                await this.updateImportJob(job);
            }
            // Complete
            job.status = job.failedRows > 0
                ? ImportJobStatus.COMPLETED_WITH_ERRORS
                : ImportJobStatus.COMPLETED;
            job.completedAt = new Date();
            await this.updateImportJob(job);
            // Cleanup file
            await this.redis.del(fileKey);
            this.server?.log.info({
                jobId: job.id,
                total: job.totalRows,
                succeeded: job.successfulRows,
                failed: job.failedRows,
            }, 'Import completed');
        }
        catch (error) {
            job.status = ImportJobStatus.FAILED;
            job.error = error.message;
            job.completedAt = new Date();
            await this.updateImportJob(job);
        }
    }
    /**
     * Parse import content based on format
     */
    parseImportContent(content, format, options) {
        switch (format) {
            case ImportFormat.JSON:
                return JSON.parse(content);
            case ImportFormat.NDJSON:
                return content.split('\n').filter(Boolean).map((line) => JSON.parse(line));
            case ImportFormat.CSV:
                return this.parseCSV(content, options);
            default:
                throw new Error(`Unsupported import format: ${format}`);
        }
    }
    /**
     * Parse CSV content
     */
    parseCSV(content, options) {
        const delimiter = options.csvDelimiter || ',';
        const lines = content.split('\n').filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        const headers = this.parseCSVLine(lines[0], delimiter);
        const startRow = options.skipFirstRow ? 1 : 0;
        return lines.slice(startRow).map((line) => {
            const values = this.parseCSVLine(line, delimiter);
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            return row;
        });
    }
    /**
     * Parse a single CSV line
     */
    parseCSVLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    /**
     * Apply column mappings to a row
     */
    applyColumnMappings(row, mappings) {
        const result = {};
        for (const mapping of mappings) {
            let value = row[mapping.sourceColumn];
            if (value === undefined || value === '') {
                value = mapping.defaultValue;
            }
            if (mapping.transformer && value !== undefined) {
                value = this.applyTransformer(value, mapping.transformer);
            }
            if (value !== undefined) {
                result[mapping.targetField] = value;
            }
        }
        return result;
    }
    /**
     * Apply a transformer to a value
     */
    applyTransformer(value, transformer) {
        switch (transformer) {
            case 'toNumber':
                return Number(value) || 0;
            case 'toBoolean':
                return value === 'true' || value === '1' || value === true;
            case 'trim':
                return String(value).trim();
            case 'toLowerCase':
                return String(value).toLowerCase();
            case 'toUpperCase':
                return String(value).toUpperCase();
            case 'parseJSON':
                try {
                    return JSON.parse(value);
                }
                catch {
                    return value;
                }
            case 'toArray':
                return String(value).split(',').map((s) => s.trim());
            default:
                return value;
        }
    }
    // =====================================
    // HELPER METHODS
    // =====================================
    async updateExportJob(job) {
        const key = `${EXPORT_JOB_PREFIX}${job.tenantId}:${job.id}`;
        await this.redis.setex(key, this.jobTTL, JSON.stringify(job));
    }
    async updateImportJob(job) {
        const key = `${IMPORT_JOB_PREFIX}${job.tenantId}:${job.id}`;
        await this.redis.setex(key, this.jobTTL, JSON.stringify(job));
    }
    /**
     * Get export file content
     */
    async getExportFileContent(tenantId, jobId) {
        const fileKey = `export_files:${tenantId}:${jobId}`;
        return this.redis.get(fileKey);
    }
    flattenObject(obj, prefix = '') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(result, this.flattenObject(value, newKey));
            }
            else {
                result[newKey] = value;
            }
        }
        return result;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    escapeCSVValue(value, delimiter) {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}
//# sourceMappingURL=import-export.service.js.map