import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Core Types Seeder Service
 * Seeds system ShardTypes and templates on application startup
 */
export declare class CoreTypesSeederService {
    private shardTypeRepository;
    private shardRepository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardTypeRepository: ShardTypeRepository, shardRepository: ShardRepository);
    /**
     * Seed all core types
     */
    seedAll(): Promise<{
        shardTypes: {
            seeded: number;
            skipped: number;
            errors: number;
        };
        templates: {
            seeded: number;
            skipped: number;
            errors: number;
        };
    }>;
    /**
     * Seed core ShardTypes
     */
    seedCoreShardTypes(): Promise<{
        seeded: number;
        skipped: number;
        errors: number;
        details: Array<{
            name: string;
            status: 'seeded' | 'skipped' | 'error';
            error?: string;
        }>;
    }>;
    /**
     * Seed system context templates
     */
    seedSystemTemplates(): Promise<{
        seeded: number;
        skipped: number;
        errors: number;
        details: Array<{
            name: string;
            status: 'seeded' | 'skipped' | 'error';
            error?: string;
        }>;
    }>;
    /**
     * Create the c_contextTemplate ShardType
     */
    private createContextTemplateShardType;
    /**
     * Seed core types for a specific tenant (copies system types)
     */
    seedForTenant(tenantId: string): Promise<{
        seeded: number;
        skipped: number;
        errors: number;
    }>;
    /**
     * Check if core types are seeded
     */
    checkSeeded(): Promise<{
        allSeeded: boolean;
        missing: string[];
    }>;
}
//# sourceMappingURL=core-types-seeder.service.d.ts.map