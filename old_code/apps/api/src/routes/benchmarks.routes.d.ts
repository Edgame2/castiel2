/**
 * Benchmarks API Routes
 * REST endpoints for benchmarking win rates, closing times, deal sizes, and renewals
 */
import type { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
interface BenchmarksRoutesOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    relationshipService: ShardRelationshipService;
    roleManagementService?: RoleManagementService;
}
/**
 * Register benchmarks routes
 */
export declare function registerBenchmarksRoutes(server: FastifyInstance, options: BenchmarksRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=benchmarks.routes.d.ts.map