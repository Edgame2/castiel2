import { mapPayloadToAuthUser } from '../middleware/authenticate.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Server-Sent Events (SSE) route for real-time updates
 * Clients connect with: GET /sse?token=<access_token>
 *
 * Optional query parameters:
 * - events: comma-separated list of event types to subscribe to
 * - shardTypeIds: comma-separated list of shard type IDs to filter
 * - shardIds: comma-separated list of shard IDs to filter
 * - conversationIds: comma-separated list of conversation IDs to subscribe to
 */
export async function registerSSERoutes(server, tokenValidationCache, conversationEventSubscriber) {
    server.get('/sse', async (request, reply) => {
        const { token, events, shardTypeIds, shardIds, conversationIds } = request.query;
        if (!token) {
            return reply.status(401).send({
                error: 'MISSING_TOKEN',
                message: 'Token is required in query string',
            });
        }
        // Validate token
        try {
            // Check cache first
            let user = null;
            if (tokenValidationCache) {
                const cached = await tokenValidationCache.getCachedValidation(token);
                if (cached && cached.valid && cached.user) {
                    user = cached.user;
                }
            }
            // If not in cache, validate locally
            if (!user) {
                try {
                    const cacheManager = server.cacheManager;
                    if (cacheManager) {
                        const isBlacklisted = await cacheManager.blacklist.isTokenBlacklisted(token);
                        if (isBlacklisted) {
                            return reply.status(401).send({
                                error: 'INVALID_TOKEN',
                                message: 'Token is blacklisted',
                            });
                        }
                    }
                    const payload = await server.jwt.verify(token);
                    if (!payload || payload.type !== 'access') {
                        return reply.status(401).send({
                            error: 'INVALID_TOKEN',
                            message: 'Token is invalid',
                        });
                    }
                    user = mapPayloadToAuthUser(payload);
                    // Cache the validated token
                    if (tokenValidationCache) {
                        await tokenValidationCache.setCachedValidation(token, { valid: true, user });
                    }
                }
                catch (error) {
                    server.log.error({ error }, 'SSE token verification failed');
                    return reply.status(401).send({
                        error: 'INVALID_TOKEN',
                        message: 'Token validation failed',
                    });
                }
            }
            // Set SSE headers
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': request.headers.origin || '*',
                'Access-Control-Allow-Credentials': 'true',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
            });
            // Generate connection ID
            const connectionId = uuidv4();
            // Parse subscription filters
            const subscription = {};
            if (events) {
                subscription.events = events.split(',').filter(e => e.trim());
            }
            if (shardTypeIds) {
                subscription.shardTypeIds = shardTypeIds.split(',').filter(s => s.trim());
            }
            if (shardIds) {
                subscription.shardIds = shardIds.split(',').filter(s => s.trim());
            }
            // Get the event service from server
            const eventService = server.shardEventService;
            // Register connection with event service if available
            if (eventService) {
                eventService.registerConnection(connectionId, user.tenantId, user.id, reply.raw, subscription);
            }
            // Register connection with conversation event subscriber if available
            if (conversationEventSubscriber) {
                const conversationIdsList = conversationIds
                    ? conversationIds.split(',').filter(id => id.trim())
                    : [];
                conversationEventSubscriber.registerConnection(connectionId, user.tenantId, user.id, reply.raw, conversationIdsList);
            }
            // Send initial connection success event
            reply.raw.write(`data: ${JSON.stringify({
                type: 'connected',
                payload: {
                    connectionId,
                    userId: user.id,
                    tenantId: user.tenantId,
                    subscription,
                    timestamp: new Date().toISOString(),
                }
            })}\n\n`);
            // Keep connection alive with heartbeat every 30 seconds
            // Note: If eventService is active, it handles heartbeats
            let heartbeatInterval = null;
            if (!eventService) {
                heartbeatInterval = setInterval(() => {
                    if (!reply.raw.destroyed) {
                        reply.raw.write(`data: ${JSON.stringify({
                            type: 'heartbeat',
                            payload: { timestamp: new Date().toISOString() }
                        })}\n\n`);
                    }
                    else {
                        if (heartbeatInterval) {
                            clearInterval(heartbeatInterval);
                        }
                    }
                }, 30000);
            }
            // Handle client disconnect
            request.raw.on('close', () => {
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                }
                // Unregister from event service
                if (eventService) {
                    eventService.unregisterConnection(connectionId);
                }
                // Unregister from conversation event subscriber
                if (conversationEventSubscriber) {
                    conversationEventSubscriber.unregisterConnection(connectionId);
                }
                server.log.info({
                    connectionId,
                    userId: user?.id,
                    tenantId: user?.tenantId,
                }, 'SSE client disconnected');
            });
            // Log connection
            server.log.info({
                connectionId,
                userId: user.id,
                tenantId: user.tenantId,
                subscription,
            }, 'SSE client connected');
        }
        catch (error) {
            const errorDetails = {
                error,
                errorMessage: error?.message,
                errorName: error?.name,
                errorStack: error?.stack?.substring(0, 200),
                url: request.url,
                hasToken: !!token,
                tokenLength: token?.length || 0,
            };
            server.log.error(errorDetails, 'SSE authentication failed');
            // Check if headers have already been sent (SSE connection started)
            if (reply.raw.headersSent) {
                // Headers already sent, send error via SSE stream and close
                try {
                    reply.raw.write(`event: error\n`);
                    reply.raw.write(`data: ${JSON.stringify({
                        error: 'AUTH_FAILED',
                        message: error?.message || 'Token validation failed',
                        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
                    })}\n\n`);
                    reply.raw.end();
                }
                catch (writeError) {
                    // Connection may already be closed, just log it
                    server.log.warn({ writeError }, 'Failed to write error to SSE stream');
                }
                return;
            }
            // Headers not sent yet, send normal error response
            return reply.status(401).send({
                error: 'AUTH_FAILED',
                message: error?.message || 'Token validation failed',
                ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
            });
        }
    });
    // Endpoint to update subscription filters for an existing connection
    server.post('/sse/subscribe', async (request, reply) => {
        const auth = request.auth;
        if (!auth?.tenantId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { connectionId, events, shardTypeIds, shardIds } = request.body;
        const eventService = server.shardEventService;
        if (!eventService) {
            return reply.status(503).send({ error: 'Event service not available' });
        }
        eventService.updateSubscription(connectionId, {
            events,
            shardTypeIds,
            shardIds,
        });
        return reply.status(200).send({
            message: 'Subscription updated',
            connectionId,
        });
    });
    // Endpoint to get SSE connection count (admin only)
    server.get('/sse/stats', async (request, reply) => {
        const auth = request.auth;
        if (!auth?.tenantId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const eventService = server.shardEventService;
        if (!eventService) {
            return reply.status(503).send({ error: 'Event service not available' });
        }
        const totalConnections = eventService.getConnectionCount();
        const tenantConnections = eventService.getConnectionsByTenant(auth.tenantId).length;
        return reply.status(200).send({
            total: totalConnections,
            tenant: tenantConnections,
        });
    });
}
//# sourceMappingURL=sse.routes.js.map