import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
interface SchemaMigrationRoutesOptions extends FastifyPluginOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
}
/**
 * Register schema migration routes
 */
export declare function schemaMigrationRoutes(server: FastifyInstance, options: SchemaMigrationRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=schema-migration.routes.d.ts.map