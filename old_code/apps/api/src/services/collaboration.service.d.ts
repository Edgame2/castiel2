import { Server } from '@hocuspocus/server';
import { Logger } from 'pino';
import { ShardRepository } from '../repositories/shard.repository.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare class CollaborationService {
    private shardRepository;
    private monitoring;
    private logger;
    server: Server;
    constructor(shardRepository: ShardRepository, monitoring: IMonitoringProvider, logger: Logger);
    handleConnection(connection: any, request: any, documentName: string, payload: any): any;
}
//# sourceMappingURL=collaboration.service.d.ts.map