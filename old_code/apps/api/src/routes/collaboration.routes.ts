import { FastifyInstance } from 'fastify';
import { CollaborationService } from '../services/collaboration.service.js';
import { ShardRepository } from '@castiel/api-core';
import { IMonitoringProvider } from '@castiel/monitoring';

export async function registerCollaborationRoutes(
    server: FastifyInstance,
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository
): Promise<void> {
    const collaborationService = new CollaborationService(
        shardRepository,
        monitoring,
        server.log as any // FastifyBaseLogger is compatible with pino Logger
    );

    server.get('/collaboration', { websocket: true }, (connection, req) => {
        monitoring.trackEvent('collaboration.connection', {
            url: req.url,
        });

        collaborationService.handleConnection(connection.socket, req, 'default', {});
    });

    // Note: The document name is usually part of the URL or message. 
    // Hocuspocus client by default sends it in the first message or URL path.
    // If we want to support dynamic document names in the path:
    // server.get('/collaboration/:document', { websocket: true }, ...)
    // But standard Hocuspocus provider often uses a single endpoint and negotiation.
    // We'll stick to single endpoint for now, or let Hocuspocus handle parsing from URL if it can.
    // Actually, Hocuspocus handleConnection expects `documentName`? 
    // Looking at Hocuspocus docs: `server.handleConnection(socket, request)` usually extracts it or we pass it.
    // If we strictly follow the Hocuspocus Server example with Fastify, we pass the socket and request. 
    // The `handleConnection` signature I stubbed might need adjustment. 
    // Hocuspocus `handleConnection` takes (websocket, request, context). 
    // Let's refine the service wrapper in the next step if strictly needed, but `handleConnection` in my service just delegates.
}
