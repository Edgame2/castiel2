/**
 * WebSocket routes for real-time updates
 * Clients connect with: ws://host/ws?token=<access_token>
 */
import { mapPayloadToAuthUser } from '../middleware/authenticate.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Register WebSocket routes
 */
export async function registerWebSocketRoutes(server, tokenValidationCache) {
    server.get('/ws', { websocket: true }, async (connection, request) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
            if (connection?.socket && connection.socket.readyState === 1) { // WebSocket.OPEN
                connection.socket.close(1008, 'Token is required');
            }
            return;
        }
        // Validate token
        let user = null;
        try {
            // Check cache first
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
                            if (connection?.socket && connection.socket.readyState === 1) { // WebSocket.OPEN
                                connection.socket.close(1008, 'Token is blacklisted');
                            }
                            return;
                        }
                    }
                    const payload = await server.jwt.verify(token);
                    if (!payload || payload.type !== 'access') {
                        if (connection?.socket && connection.socket.readyState === 1) { // WebSocket.OPEN
                            connection.socket.close(1008, 'Token is invalid');
                        }
                        return;
                    }
                    user = mapPayloadToAuthUser(payload);
                    // Cache the validated token
                    if (tokenValidationCache) {
                        await tokenValidationCache.setCachedValidation(token, { valid: true, user });
                    }
                }
                catch (error) {
                    server.log.error({ error }, 'WebSocket token verification failed');
                    if (connection?.socket && connection.socket.readyState === 1) { // WebSocket.OPEN
                        try {
                            connection.socket.close(1008, 'Token validation failed');
                        }
                        catch (closeError) {
                            server.log.warn({ closeError }, 'Failed to close WebSocket connection after token validation failure');
                        }
                    }
                    return;
                }
            }
            const connectionId = uuidv4();
            // Send initial connection success message
            if (connection?.socket && connection.socket.readyState === 1) { // WebSocket.OPEN
                try {
                    connection.socket.send(JSON.stringify({
                        type: 'connected',
                        payload: {
                            connectionId,
                            userId: user.id,
                            tenantId: user.tenantId,
                            timestamp: new Date().toISOString(),
                        },
                    }));
                }
                catch (sendError) {
                    server.log.warn({ sendError, connectionId }, 'Failed to send initial connection message');
                }
            }
            else {
                server.log.warn({ connectionId }, 'WebSocket connection not available for sending initial message');
                return;
            }
            // Send heartbeat every 30 seconds
            const heartbeatInterval = setInterval(() => {
                if (connection.socket.readyState === 1) { // WebSocket.OPEN
                    connection.socket.send(JSON.stringify({
                        type: 'heartbeat',
                        payload: { timestamp: new Date().toISOString() },
                    }));
                }
                else {
                    clearInterval(heartbeatInterval);
                }
            }, 30000);
            // Handle incoming messages
            connection.socket.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    server.log.debug({ connectionId, data }, 'WebSocket message received');
                    // Echo back for now (can be extended to handle commands)
                    if (data.type === 'ping') {
                        connection.socket.send(JSON.stringify({
                            type: 'pong',
                            payload: { timestamp: new Date().toISOString() },
                        }));
                    }
                }
                catch (error) {
                    server.log.error({ error, connectionId }, 'Failed to parse WebSocket message');
                }
            });
            // Handle connection close
            connection.socket.on('close', () => {
                clearInterval(heartbeatInterval);
                server.log.info({
                    connectionId,
                    userId: user?.id,
                    tenantId: user?.tenantId,
                }, 'WebSocket client disconnected');
            });
            // Handle errors
            connection.socket.on('error', (error) => {
                server.log.error({ error, connectionId }, 'WebSocket error');
                clearInterval(heartbeatInterval);
            });
            // Log connection
            server.log.info({
                connectionId,
                userId: user.id,
                tenantId: user.tenantId,
            }, 'WebSocket client connected');
        }
        catch (error) {
            server.log.error({ error, hasConnection: !!connection, hasSocket: !!(connection?.socket) }, 'WebSocket authentication failed');
            // Only close the socket if connection and socket exist and socket is still open
            if (connection && connection.socket) {
                try {
                    // Check if socket is in a state that allows closing (OPEN = 1)
                    if (connection.socket.readyState === 1) { // WebSocket.OPEN
                        connection.socket.close(1008, 'Authentication failed');
                    }
                    else {
                        server.log.debug({ readyState: connection.socket.readyState }, 'WebSocket not in OPEN state, skipping close');
                    }
                }
                catch (closeError) {
                    server.log.warn({ closeError }, 'Failed to close WebSocket connection');
                }
            }
            else {
                server.log.debug('WebSocket connection or socket not available, cannot close');
            }
        }
    });
}
//# sourceMappingURL=websocket.routes.js.map