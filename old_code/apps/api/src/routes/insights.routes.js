/**
 * AI Insights API Routes
 * REST endpoints for insight generation, conversations, and configuration
 */
import { getModelById } from '../types/ai-provider.types.js';
/**
 * Register AI Insights routes
 */
export async function insightsRoutes(fastify, options) {
    const { insightService, conversationService, contextTemplateService, entityResolutionService, contextAwareQueryParserService, conversationRealtimeService, multimodalAssetService, authenticate: passedAuthenticate, tokenValidationCache, prefix: optionsPrefix } = options;
    // Track active streaming requests for stop functionality
    // Map: messageId -> { conversationId, reply, abortController }
    const activeStreams = new Map();
    // Get authentication decorator - prefer passed one, then try from fastify instance or parent
    let authDecorator = passedAuthenticate || fastify.authenticate;
    // If not found, try to get from parent server
    if (!authDecorator && fastify.parent) {
        authDecorator = (fastify.parent)?.authenticate;
    }
    // If still not found, try to create from tokenValidationCache
    if (!authDecorator) {
        const cache = tokenValidationCache ||
            fastify.tokenValidationCache ||
            (fastify.parent)?.tokenValidationCache;
        if (cache) {
            const { authenticate: createAuthenticate } = await import('../middleware/authenticate.js');
            authDecorator = createAuthenticate(cache);
        }
    }
    if (!authDecorator) {
        fastify.log.error('❌ AI Insights routes not registered - authentication decorator missing');
        fastify.log.error({ decorators: Object.keys(fastify).filter(k => !k.startsWith('_') && k !== 'log').slice(0, 10) }, 'Available decorators');
        fastify.log.error({ decorators: fastify.parent ? Object.keys(fastify.parent).filter(k => !k.startsWith('_') && k !== 'log').slice(0, 10) : 'No parent' }, 'Parent server decorators');
        throw new Error('AI Insights routes cannot be registered without authentication decorator');
    }
    // In Fastify, when using server.register(plugin, { prefix: '/api/v1' }), 
    // the prefix is automatically applied to all routes in the plugin.
    // We don't need to manually prepend it - Fastify does it automatically.
    // The prefix variable here is only for logging/debugging purposes.
    const prefix = optionsPrefix || fastify.prefix || '/api/v1'; // Default to expected prefix
    fastify.log.info(`✅ AI Insights routes: Authentication decorator found, registering routes (prefix will be applied automatically: "/api/v1")...`);
    // Get rate limiter from server if available
    const rateLimiter = fastify.rateLimiter || (fastify.parent)?.rateLimiter;
    // Import rate limit middleware functions
    const { createAIInsightsChatRateLimitMiddleware, createAIInsightsChatTenantRateLimitMiddleware, createAIInsightsGenerateRateLimitMiddleware, createAIInsightsGenerateTenantRateLimitMiddleware, createAIInsightsQuickRateLimitMiddleware, createAIInsightsQuickTenantRateLimitMiddleware, } = await import('../middleware/rate-limit.middleware.js');
    // Create rate limit middlewares if rate limiter is available
    const chatUserRateLimit = rateLimiter ? createAIInsightsChatRateLimitMiddleware(rateLimiter) : undefined;
    const chatTenantRateLimit = rateLimiter ? createAIInsightsChatTenantRateLimitMiddleware(rateLimiter) : undefined;
    const generateUserRateLimit = rateLimiter ? createAIInsightsGenerateRateLimitMiddleware(rateLimiter) : undefined;
    const generateTenantRateLimit = rateLimiter ? createAIInsightsGenerateTenantRateLimitMiddleware(rateLimiter) : undefined;
    const quickUserRateLimit = rateLimiter ? createAIInsightsQuickRateLimitMiddleware(rateLimiter) : undefined;
    const quickTenantRateLimit = rateLimiter ? createAIInsightsQuickTenantRateLimitMiddleware(rateLimiter) : undefined;
    // Build preHandler arrays for rate limiting (user + tenant)
    const chatRateLimitHandlers = [authDecorator];
    if (chatUserRateLimit) {
        chatRateLimitHandlers.push(chatUserRateLimit);
    }
    if (chatTenantRateLimit) {
        chatRateLimitHandlers.push(chatTenantRateLimit);
    }
    const generateRateLimitHandlers = [authDecorator];
    if (generateUserRateLimit) {
        generateRateLimitHandlers.push(generateUserRateLimit);
    }
    if (generateTenantRateLimit) {
        generateRateLimitHandlers.push(generateTenantRateLimit);
    }
    const quickRateLimitHandlers = [authDecorator];
    if (quickUserRateLimit) {
        quickRateLimitHandlers.push(quickUserRateLimit);
    }
    if (quickTenantRateLimit) {
        quickRateLimitHandlers.push(quickTenantRateLimit);
    }
    // ============================================
    // Chat API
    // ============================================
    /**
     * Send message and get streaming AI response
     * POST /insights/chat
     * Note: Fastify automatically prepends the prefix '/api/v1' from server.register()
     */
    const chatRoutePath = '/insights/chat';
    fastify.log.info(`Registering route: POST ${chatRoutePath} (will be available at /api/v1${chatRoutePath})`);
    fastify.post(chatRoutePath, {
        onRequest: chatRateLimitHandlers.length > 0 ? chatRateLimitHandlers : [authDecorator],
        schema: {
            description: 'Send a message and receive a streaming AI response',
            tags: ['insights'],
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    conversationId: { type: 'string' },
                    content: { type: 'string', minLength: 1 },
                    contentType: { type: 'string', enum: ['text', 'markdown'] },
                    scope: { type: 'object' },
                    scopeMode: { type: 'string', enum: ['global', 'project'] },
                    projectId: { type: 'string' },
                    assistantId: { type: 'string' },
                    modelId: { type: 'string' },
                    templateId: { type: 'string' },
                    parentMessageId: { type: 'string' },
                    options: { type: 'object' },
                    // New parameters for intelligent model selection
                    requiredContentType: { type: 'string', enum: ['text', 'image', 'audio', 'video'] },
                    allowContentFallback: { type: 'boolean' },
                    taskComplexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
                    budget: {
                        type: 'object',
                        properties: {
                            maxCostUSD: { type: 'number' },
                            preferEconomy: { type: 'boolean' },
                        },
                    },
                    linkedShards: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Shard IDs to link when creating a new conversation (only used if conversationId is not provided)',
                    },
                    assetIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Asset IDs to link to the message after creation',
                    },
                },
            },
        },
    }, async (request, reply) => {
        fastify.log.info({
            url: request.url,
            method: request.method,
            hasUser: !!request.user,
            hasBody: !!request.body,
            bodyContentLength: (request.body)?.content?.length || 0,
        }, `POST ${chatRoutePath} - Request received`);
        const { tenantId, id: userId, roles } = request.user;
        const body = request.body;
        // Parse query for entity references and enhance with context
        let enhancedQuery = body.content;
        if (contextAwareQueryParserService) {
            try {
                const parsedQuery = await contextAwareQueryParserService.parseQuery(body.content, tenantId, body.projectId || body.scope?.projectId);
                if (parsedQuery.hasEntityReferences && parsedQuery.enhancedQuery) {
                    enhancedQuery = parsedQuery.enhancedQuery;
                    // Log entity resolution for monitoring
                    fastify.log.info({
                        operation: 'chat.entityResolution',
                        tenantId,
                        entityCount: parsedQuery.entities.length,
                        originalQuery: body.content.substring(0, 100),
                    });
                }
            }
            catch (error) {
                // If entity parsing fails, continue with original query
                fastify.log.warn({ error, tenantId }, 'Failed to parse entity references, using original query');
            }
        }
        // Create conversation if it doesn't exist
        let conversationId = body.conversationId;
        if (!conversationId) {
            // Create a new conversation (with linked shards if provided)
            const newConversation = await conversationService.create(tenantId, userId, {
                title: enhancedQuery.substring(0, 100), // Use first 100 chars of query as title
                visibility: 'private',
                assistantId: body.assistantId,
                templateId: body.templateId,
                defaultModelId: body.modelId,
                linkedShards: body.linkedShards || [],
            });
            conversationId = newConversation.id;
        }
        // Check if streaming is requested
        const acceptsSSE = request.headers.accept?.includes('text/event-stream');
        if (acceptsSSE) {
            // Set SSE headers with CORS
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, Cache-Control, Pragma',
            });
            // Create insight request with enhanced query
            const insightRequest = {
                tenantId,
                userId,
                userRoles: roles || [], // Pass user roles for permission checking
                query: enhancedQuery,
                conversationId: conversationId || body.conversationId,
                parentMessageId: body.parentMessageId,
                scope: body.scope ?? (body.projectId ? { projectId: body.projectId } : undefined),
                scopeMode: body.scopeMode,
                projectId: body.projectId,
                assistantId: body.assistantId,
                modelId: body.modelId,
                templateId: body.templateId,
                options: body.options,
                requiredContentType: body.requiredContentType,
                allowContentFallback: body.allowContentFallback,
                taskComplexity: body.taskComplexity,
                budget: body.budget,
            };
            // Generate a temporary messageId for tracking (will be replaced with actual messageId from start event)
            const tempMessageId = `temp-${Date.now()}`;
            let actualMessageId = null;
            try {
                // Stream response
                for await (const event of insightService.generateStream(tenantId, userId, insightRequest)) {
                    // Track messageId from start event
                    if (event.type === 'start' && 'messageId' in event) {
                        actualMessageId = event.messageId;
                        // Register active stream
                        activeStreams.set(event.messageId, {
                            conversationId: insightRequest.conversationId || '',
                            reply,
                        });
                        // Link assets to message if provided (async, don't block stream)
                        if (body.assetIds && body.assetIds.length > 0 && multimodalAssetService) {
                            // Use Promise.allSettled to handle individual failures gracefully
                            Promise.allSettled(body.assetIds.map((assetId) => multimodalAssetService.updateAsset(assetId, tenantId, {
                                attachedTo: {
                                    conversationId,
                                    messageId: actualMessageId,
                                },
                            }))).then((results) => {
                                // Log any failures but don't block the stream
                                results.forEach((result, index) => {
                                    if (result.status === 'rejected' && body.assetIds) {
                                        fastify.log.warn({
                                            error: result.reason,
                                            assetId: body.assetIds[index],
                                            messageId: actualMessageId
                                        }, 'Failed to link asset to message');
                                    }
                                });
                            }).catch((error) => {
                                // This should never happen with allSettled, but handle it just in case
                                fastify.log.warn({ error }, 'Unexpected error in asset linking');
                            });
                        }
                    }
                    reply.raw.write(`event: ${event.type}\n`);
                    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
                    // Check if stream was stopped
                    if (actualMessageId && !activeStreams.has(actualMessageId)) {
                        // Stream was stopped, send cancellation event and break
                        reply.raw.write(`event: cancelled\n`);
                        reply.raw.write(`data: ${JSON.stringify({ type: 'cancelled', message: 'Generation stopped by user' })}\n\n`);
                        break;
                    }
                }
            }
            catch (error) {
                reply.raw.write(`event: error\n`);
                reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            }
            finally {
                // Clean up tracking - always remove from activeStreams when stream completes
                if (actualMessageId) {
                    activeStreams.delete(actualMessageId);
                }
            }
            reply.raw.write('event: done\n');
            reply.raw.write('data: {}\n\n');
            reply.raw.end();
            return; // SSE response sent, no need to return data
        }
        else {
            // Non-streaming response - use enhanced query
            // Note: Rate limiting is applied at the route level via onRequest handlers
            const insightRequest = {
                tenantId,
                userId,
                userRoles: roles || [], // Pass user roles for permission checking
                query: enhancedQuery,
                conversationId: conversationId || body.conversationId,
                parentMessageId: body.parentMessageId,
                scope: body.scope ?? (body.projectId ? { projectId: body.projectId } : undefined),
                scopeMode: body.scopeMode,
                projectId: body.projectId,
                assistantId: body.assistantId,
                modelId: body.modelId,
                templateId: body.templateId,
                options: body.options,
                requiredContentType: body.requiredContentType,
                allowContentFallback: body.allowContentFallback,
                taskComplexity: body.taskComplexity,
                budget: body.budget,
            };
            const response = await insightService.generate(tenantId, userId, insightRequest);
            // Link assets to message if provided (for non-streaming responses)
            if (body.assetIds && body.assetIds.length > 0 && multimodalAssetService && 'conversationId' in response && response.conversationId) {
                try {
                    // Get the last message from the conversation to find the messageId
                    const conversation = await conversationService.get(response.conversationId, tenantId, {
                        includeMessages: true,
                        messageLimit: 1, // Just get the last message
                    });
                    if (conversation?.structuredData?.messages && conversation.structuredData.messages.length > 0) {
                        const lastMessage = conversation.structuredData.messages[conversation.structuredData.messages.length - 1];
                        const messageId = lastMessage.id;
                        // Link assets to message asynchronously
                        Promise.all(body.assetIds.map((assetId) => multimodalAssetService.updateAsset(assetId, tenantId, {
                            attachedTo: {
                                conversationId: (response).conversationId,
                                messageId,
                            },
                        }).catch((error) => {
                            fastify.log.warn({ error, assetId, messageId }, 'Failed to link asset to message');
                        }))).catch((error) => {
                            fastify.log.warn({ error }, 'Failed to link some assets to message');
                        });
                    }
                }
                catch (error) {
                    fastify.log.warn({ error }, 'Failed to link assets to message (could not retrieve message ID)');
                }
            }
            return response;
        }
    });
    // Verify the chat route was registered
    // Note: printRoutes() may show routes in different formats, so we check multiple patterns
    // Try both the current fastify instance and parent server if available
    let routesAfterChat = fastify.printRoutes();
    const parentServer = fastify.parent;
    if (parentServer && typeof parentServer.printRoutes === 'function') {
        // Try parent server's routes as well
        const parentRoutes = parentServer.printRoutes();
        routesAfterChat = routesAfterChat + '\n' + parentRoutes;
    }
    const expectedFullPath = '/api/v1/insights/chat';
    const routePatterns = [
        expectedFullPath,
        'POST /api/v1/insights/chat',
        '/insights/chat',
        'POST /insights/chat',
        'insights/chat',
        'POST insights/chat',
        chatRoutePath,
        'POST ' + chatRoutePath,
    ];
    const chatRouteRegistered = routePatterns.some(pattern => routesAfterChat.includes(pattern));
    if (chatRouteRegistered) {
        fastify.log.info(`✅ Chat route successfully registered: ${expectedFullPath}`);
    }
    else {
        // Route might be registered but in a different format - check if any chat route exists
        const chatRoutes = routesAfterChat.split('\n').filter(line => line.toLowerCase().includes('chat') &&
            (line.includes('insights') || line.includes('/chat')));
        if (chatRoutes.length > 0) {
            fastify.log.info(`✅ Chat route registered (found ${chatRoutes.length} chat-related route(s), format may differ)`);
            fastify.log.debug({ routes: chatRoutes.slice(0, 5) }, 'Chat routes found');
        }
        else {
            // Route registration succeeded (fastify.post() completed), but printRoutes() can't verify it
            // This is a known limitation - routes are registered but may not appear in printRoutes() from plugin scope
            fastify.log.info(`✅ Chat route registered: ${expectedFullPath} (printRoutes() verification inconclusive from plugin scope)`);
            fastify.log.debug('ℹ️  Route registration succeeded, but printRoutes() may not show routes when called from within a plugin');
        }
    }
    /**
     * Regenerate a message
     * POST /insights/chat/messages/:messageId/regenerate
     */
    fastify.post('/insights/chat/messages/:messageId/regenerate', {
        onRequest: chatRateLimitHandlers,
        schema: {
            description: 'Regenerate an AI response with different parameters',
            tags: ['insights'],
            params: {
                type: 'object',
                properties: {
                    messageId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId, roles } = request.user;
        const { messageId } = request.params;
        const body = request.body;
        // Require conversationId for now (can be enhanced later to search across conversations)
        if (!body.conversationId) {
            return reply.status(400).send({
                error: 'conversationId is required',
                message: 'Please provide conversationId in the request body'
            });
        }
        try {
            // Get conversation and find the message
            const conversation = await conversationService.get(body.conversationId, tenantId);
            if (!conversation) {
                return reply.status(404).send({ error: 'Conversation not found' });
            }
            const data = conversation.structuredData;
            const messageIndex = data.messages.findIndex(m => m.id === messageId);
            if (messageIndex === -1) {
                return reply.status(404).send({ error: 'Message not found' });
            }
            const message = data.messages[messageIndex];
            // Only regenerate assistant messages
            if (message.role !== 'assistant') {
                return reply.status(400).send({
                    error: 'Invalid message type',
                    message: 'Can only regenerate assistant messages'
                });
            }
            // Check if message is currently streaming
            if (message.status === 'streaming' || message.status === 'pending') {
                return reply.status(409).send({
                    error: 'Message is being generated',
                    message: 'Cannot regenerate a message that is currently being generated'
                });
            }
            // Find parent message (the user's message that this response was for)
            const parentMessage = message.parentId
                ? data.messages.find(m => m.id === message.parentId)
                : messageIndex > 0
                    ? data.messages[messageIndex - 1]
                    : null;
            if (!parentMessage || parentMessage.role !== 'user') {
                return reply.status(400).send({
                    error: 'Parent message not found',
                    message: 'Cannot regenerate: parent user message not found'
                });
            }
            // Build insight request from parent message
            const insightRequest = {
                tenantId,
                userId,
                userRoles: roles || [], // Pass user roles for permission checking
                query: parentMessage.content,
                conversationId: body.conversationId,
                parentMessageId: parentMessage.id,
                modelId: body.modelId || message.modelId,
                options: {
                    temperature: body.temperature,
                    maxTokens: message.tokens?.total ? Math.max(message.tokens.total + 100, 1000) : undefined,
                },
            };
            // Regenerate using insight service
            const response = await insightService.generate(tenantId, userId, insightRequest);
            // Check if response is InsightResponse (not ModelUnavailableResponse)
            if ('content' in response) {
                // Use conversationService.updateMessage to ensure proper broadcasting and cache invalidation
                const updatedMessage = await conversationService.updateMessage(body.conversationId, tenantId, messageId, {
                    content: response.content,
                    status: 'complete',
                    isRegenerated: true,
                    regeneratedFrom: message.id,
                    regenerationCount: (message.regenerationCount || 0) + 1,
                    // Map InsightResponse.usage to TokenUsage format
                    tokens: {
                        prompt: response.usage.promptTokens,
                        completion: response.usage.completionTokens,
                        total: response.usage.totalTokens,
                    },
                    cost: response.cost,
                    latencyMs: response.latencyMs,
                    modelId: response.model || message.modelId,
                });
                return {
                    message: updatedMessage,
                    response: {
                        content: response.content,
                        usage: response.usage,
                        cost: response.cost,
                        latencyMs: response.latencyMs,
                    },
                };
            }
            else {
                // Model unavailable - return error
                return reply.status(503).send({
                    error: 'Model unavailable',
                    message: response.message || 'The requested model is not available'
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error regenerating message');
            return reply.status(500).send({
                error: 'Regeneration failed',
                message: errorMessage
            });
        }
    });
    /**
     * Stop generation
     * POST /insights/chat/messages/:messageId/stop
     */
    fastify.post('/insights/chat/messages/:messageId/stop', {
        onRequest: [authDecorator],
        schema: {
            description: 'Stop an in-progress streaming response',
            tags: ['insights'],
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { messageId } = request.params;
        try {
            // Check if there's an active stream for this message
            const activeStream = activeStreams.get(messageId);
            if (!activeStream) {
                // No active stream found - check if message exists and mark as cancelled
                // Try to find conversationId from request body or query
                const conversationId = request.body?.conversationId || request.query?.conversationId;
                if (conversationId) {
                    try {
                        const conversation = await conversationService.get(conversationId, tenantId);
                        if (conversation) {
                            const data = conversation.structuredData;
                            const message = data.messages.find(m => m.id === messageId);
                            if (message && (message.status === 'streaming' || message.status === 'pending')) {
                                // Use conversationService.updateMessage to ensure proper broadcasting and cache invalidation
                                await conversationService.updateMessage(conversationId, tenantId, messageId, {
                                    status: 'cancelled',
                                });
                                return {
                                    success: true,
                                    message: 'Generation stopped',
                                    messageId,
                                    status: 'cancelled'
                                };
                            }
                        }
                    }
                    catch (error) {
                        // Ignore errors when trying to update conversation
                    }
                }
                return reply.status(404).send({
                    error: 'No active stream found',
                    message: 'No active generation found for this message. It may have already completed or was never started.'
                });
            }
            // Stop the active stream
            activeStreams.delete(messageId);
            // Try to close the reply connection gracefully
            try {
                activeStream.reply.raw.write(`event: cancelled\n`);
                activeStream.reply.raw.write(`data: ${JSON.stringify({ type: 'cancelled', message: 'Generation stopped by user' })}\n\n`);
                activeStream.reply.raw.write('event: done\n');
                activeStream.reply.raw.write('data: {}\n\n');
                activeStream.reply.raw.end();
            }
            catch (error) {
                // Connection may already be closed, ignore
            }
            // Update message status in conversation if available
            if (activeStream.conversationId) {
                try {
                    const conversation = await conversationService.get(activeStream.conversationId, tenantId);
                    if (conversation) {
                        const data = conversation.structuredData;
                        const message = data.messages.find(m => m.id === messageId);
                        if (message) {
                            message.status = 'cancelled';
                            message.updatedAt = new Date();
                            // Save updated conversation
                            const { ShardRepository } = await import('../repositories/shard.repository.js');
                            const shardRepository = new ShardRepository(fastify.cosmosDbClient, fastify.monitoring);
                            await shardRepository.update(activeStream.conversationId, tenantId, {
                                structuredData: data,
                            });
                            // Invalidate cache if available
                            if (conversationService.invalidateCache) {
                                await conversationService.invalidateCache(activeStream.conversationId, tenantId);
                            }
                        }
                    }
                }
                catch (error) {
                    // Ignore errors when updating conversation
                    fastify.log.warn(error, 'Failed to update conversation after stopping generation');
                }
            }
            fastify.log.info({
                operation: 'insight.stopGeneration',
                messageId,
                tenantId,
                userId,
            });
            return {
                success: true,
                message: 'Generation stopped',
                messageId,
                status: 'cancelled'
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error stopping generation');
            return reply.status(500).send({
                error: 'Failed to stop generation',
                message: errorMessage
            });
        }
    });
    // ============================================
    // Quick Insights API
    // ============================================
    /**
     * Get quick insight for a shard
     * POST /insights/quick
     */
    fastify.post('/insights/quick', {
        onRequest: quickRateLimitHandlers,
        schema: {
            description: 'Generate a quick insight for a shard',
            tags: ['insights'],
            body: {
                type: 'object',
                required: ['shardId', 'type'],
                properties: {
                    shardId: { type: 'string' },
                    type: {
                        type: 'string',
                        enum: ['summary', 'key_points', 'risks', 'opportunities', 'next_steps', 'comparison', 'trends', 'custom'],
                    },
                    customPrompt: { type: 'string' },
                    options: { type: 'object' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const body = request.body;
        const quickRequest = {
            shardId: body.shardId,
            type: body.type,
            customPrompt: body.customPrompt,
            options: body.options,
        };
        const response = await insightService.quickInsight(tenantId, userId, quickRequest);
        return response;
    });
    /**
     * Get suggested questions for a shard
     * GET /insights/suggestions/:shardId
     */
    fastify.get('/insights/suggestions/:shardId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get AI-generated suggested questions for a shard',
            tags: ['insights'],
            params: {
                type: 'object',
                properties: {
                    shardId: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number', default: 5 },
                    context: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { shardId } = request.params;
        const { limit } = request.query;
        const suggestions = await insightService.getSuggestions(tenantId, shardId, limit);
        return {
            shardId,
            suggestions,
            generatedAt: new Date().toISOString(),
        };
    });
    // ============================================
    // Conversations API
    // ============================================
    /**
     * List conversations
     * GET /insights/conversations
     */
    const routePath = '/insights/conversations';
    fastify.log.info(`Registering route: GET ${routePath} (will be available at /api/v1${routePath})`);
    fastify.get(routePath, {
        onRequest: [authDecorator],
        schema: {
            description: 'List user conversations',
            tags: ['conversations'],
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'array', items: { type: 'string' } },
                    visibility: { type: 'array', items: { type: 'string' } },
                    assistantId: { type: 'string' },
                    search: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    linkedShardId: { type: 'string', description: 'Filter conversations linked to a specific shard' },
                    includeLinkedShardsCount: { type: 'boolean', default: false, description: 'Include linked shards count in response' },
                    limit: { type: 'number', default: 20, maximum: 100 },
                    offset: { type: 'number', default: 0 },
                    orderBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'lastActivityAt', 'messageCount'] },
                    orderDirection: { type: 'string', enum: ['asc', 'desc'] },
                },
            },
        },
    }, async (request, reply) => {
        fastify.log.info({
            url: request.url,
            method: request.method,
            hasUser: !!request.user,
            userId: request.user?.id,
            tenantId: request.user?.tenantId,
        }, `GET ${routePath} - Request received`);
        if (!request.user) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const { tenantId, id: userId } = request.user;
        const options = request.query;
        try {
            const result = await conversationService.list(tenantId, userId, options);
            const response = {
                conversations: result.conversations.map(c => {
                    const conversationResponse = {
                        id: c.id,
                        ...c.structuredData,
                        createdAt: c.createdAt,
                        updatedAt: c.updatedAt,
                    };
                    // Include linked shards count if available (from metadata)
                    if (c.linkedShardsCount !== undefined) {
                        conversationResponse.linkedShardsCount = c.linkedShardsCount;
                    }
                    return conversationResponse;
                }),
                total: result.total,
                limit: options.limit || 20,
                offset: options.offset || 0,
                hasMore: result.hasMore,
            };
            return reply.status(200).send(response);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorName = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
            const errorStack = error instanceof Error ? error.stack?.substring(0, 200) : undefined;
            const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
            const errorDetails = {
                error: error instanceof Error ? error : new Error(errorMessage),
                errorName,
                errorMessage,
                errorStack,
                statusCode,
                tenantId,
                userId,
            };
            request.log.error(errorDetails, 'Failed to list conversations');
            const finalStatusCode = statusCode || (errorMessage?.includes('not found') ? 404 : 500);
            return reply.status(finalStatusCode).send({
                error: errorName || 'Internal Server Error',
                message: errorMessage || 'Failed to list conversations',
                ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
            });
        }
    });
    /**
     * Get a conversation
     * GET /insights/conversations/:id
     */
    fastify.get('/insights/conversations/:id', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get a conversation by ID',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    includeMessages: { type: 'boolean', default: true },
                    messageLimit: { type: 'number', default: 50 },
                    messageOffset: { type: 'number', default: 0 },
                    includeLinkedShards: { type: 'boolean', default: false, description: 'Include linked shards in the response' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const options = request.query;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const conversation = await conversationService.get(id, tenantId, options);
        if (!conversation) {
            return reply.status(404).send({ error: 'Conversation not found' });
        }
        const response = {
            id: conversation.id,
            ...conversation.structuredData,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
        };
        // Include linked shards if requested
        if (options.includeLinkedShards) {
            const linkedShards = await conversationService.getLinkedShards(id, tenantId);
            response.linkedShards = linkedShards.map(({ edge, shard }) => ({
                id: shard.id,
                shardTypeId: shard.shardTypeId,
                name: shard.structuredData?.name || shard.structuredData?.title || shard.shardTypeName || shard.id,
                structuredData: shard.structuredData,
                relationship: {
                    edgeId: edge.id,
                    type: edge.relationshipType,
                    label: edge.label,
                    direction: edge.sourceShardId === id ? 'outgoing' : 'incoming',
                    createdAt: edge.createdAt,
                },
            }));
        }
        return response;
    });
    /**
     * Create a conversation
     * POST /insights/conversations
     */
    fastify.post('/insights/conversations', {
        onRequest: [authDecorator],
        schema: {
            description: 'Create a new conversation',
            tags: ['conversations'],
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    visibility: { type: 'string', enum: ['private', 'shared', 'public'] },
                    assistantId: { type: 'string' },
                    templateId: { type: 'string' },
                    defaultModelId: { type: 'string' },
                    linkedShards: { type: 'array', items: { type: 'string' } },
                    tags: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const input = request.body;
        const conversation = await conversationService.create(tenantId, userId, input);
        return reply.status(201).send({
            id: conversation.id,
            ...conversation.structuredData,
            createdAt: conversation.createdAt,
        });
    });
    /**
     * Update a conversation
     * PATCH /insights/conversations/:id
     */
    fastify.patch('/insights/conversations/:id', {
        onRequest: [authDecorator],
        schema: {
            description: 'Update a conversation',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const input = request.body;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const conversation = await conversationService.update(id, tenantId, userId, input);
        return {
            id: conversation.id,
            ...conversation.structuredData,
            updatedAt: conversation.updatedAt,
        };
    });
    /**
     * Archive a conversation
     * POST /insights/conversations/:id/archive
     */
    fastify.post('/insights/conversations/:id/archive', {
        onRequest: [authDecorator],
        schema: {
            description: 'Archive a conversation (makes it read-only)',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const conversation = await conversationService.update(id, tenantId, userId, { status: 'archived' });
            return {
                id: conversation.id,
                ...conversation.structuredData,
                updatedAt: conversation.updatedAt,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to archive conversation');
            return reply.status(500).send({ error: 'Failed to archive conversation' });
        }
    });
    /**
     * Unarchive a conversation
     * POST /insights/conversations/:id/unarchive
     */
    fastify.post('/insights/conversations/:id/unarchive', {
        onRequest: [authDecorator],
        schema: {
            description: 'Unarchive a conversation (restores it to active, allows new messages)',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const conversation = await conversationService.update(id, tenantId, userId, { status: 'active' });
            return {
                id: conversation.id,
                ...conversation.structuredData,
                updatedAt: conversation.updatedAt,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('Cannot unarchive')) {
                return reply.status(400).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to unarchive conversation');
            return reply.status(500).send({ error: 'Failed to unarchive conversation' });
        }
    });
    /**
     * Delete a conversation
     * DELETE /insights/conversations/:id
     */
    fastify.delete('/insights/conversations/:id', {
        onRequest: [authDecorator],
        schema: {
            description: 'Delete a conversation',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    permanent: { type: 'boolean', default: false },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const { permanent } = request.query;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canWrite || access.role !== 'owner') {
            return reply.status(403).send({ error: 'Only owner can delete conversation' });
        }
        await conversationService.delete(id, tenantId, userId, permanent);
        return reply.status(204).send();
    });
    /**
     * Add participant
     * POST /insights/conversations/:id/participants
     */
    fastify.post('/insights/conversations/:id/participants', {
        onRequest: [authDecorator],
        schema: {
            description: 'Add a participant to the conversation',
            tags: ['conversations'],
        },
    }, async (request, reply) => {
        const { tenantId, id: requestUserId } = request.user;
        const { id } = request.params;
        const { userId: participantUserId, role } = request.body;
        // Check access (only owner can add participants)
        const access = await conversationService.canAccess(id, tenantId, requestUserId);
        if (!access.canWrite || access.role !== 'owner') {
            return reply.status(403).send({ error: 'Only owner can add participants' });
        }
        await conversationService.addParticipant(id, tenantId, requestUserId, participantUserId, role || 'participant');
        return { success: true };
    });
    /**
     * Remove participant
     * DELETE /insights/conversations/:id/participants/:userId
     */
    fastify.delete('/insights/conversations/:id/participants/:participantId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Remove a participant from the conversation',
            tags: ['conversations'],
        },
    }, async (request, reply) => {
        const { tenantId, id: requestUserId } = request.user;
        const { id, participantId } = request.params;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, requestUserId);
        if (!access.canWrite || (access.role !== 'owner' && requestUserId !== participantId)) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        await conversationService.removeParticipant(id, tenantId, requestUserId, participantId);
        return reply.status(204).send();
    });
    // ============================================
    // Feedback API
    // ============================================
    /**
     * Submit feedback
     * POST /insights/messages/:messageId/feedback
     */
    fastify.post('/insights/messages/:messageId/feedback', {
        onRequest: [authDecorator],
        schema: {
            description: 'Submit feedback for a message',
            tags: ['feedback'],
            params: {
                type: 'object',
                properties: {
                    messageId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    rating: { type: 'number', minimum: 1, maximum: 5 },
                    thumbs: { type: 'string', enum: ['up', 'down'] },
                    categories: { type: 'array', items: { type: 'string' } },
                    comment: { type: 'string' },
                    regenerateRequested: { type: 'boolean' },
                    reportAsHarmful: { type: 'boolean' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { messageId } = request.params;
        const body = request.body;
        // Find the conversation containing this message
        // This is a simplified approach - in production you might want a message -> conversation index
        const conversationsResult = await conversationService.list(tenantId, userId, { limit: 100 });
        let conversationId = null;
        for (const conv of conversationsResult.conversations) {
            const data = conv.structuredData;
            if (data.messages?.some((m) => m.id === messageId)) {
                conversationId = conv.id;
                break;
            }
        }
        if (!conversationId) {
            return reply.status(404).send({ error: 'Message not found' });
        }
        const feedbackInput = {
            rating: body.rating,
            thumbs: body.thumbs,
            categories: body.categories,
            comment: body.comment,
            regenerateRequested: body.regenerateRequested,
            reportedAsHarmful: body.reportAsHarmful,
        };
        const feedback = await conversationService.addFeedback(conversationId, tenantId, messageId, userId, feedbackInput);
        return {
            id: feedback.id,
            messageId,
            status: 'submitted',
            createdAt: feedback.createdAt,
        };
    });
    /**
     * Get conversation messages
     * GET /insights/conversations/:id/messages
     */
    fastify.get('/insights/conversations/:id/messages', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get conversation messages with pagination (optionally including archived messages). Supports lazy-loading and field selection for performance.',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number', default: 50, maximum: 100 },
                    offset: { type: 'number', default: 0 },
                    branchIndex: { type: 'number' },
                    afterMessageId: { type: 'string' },
                    includeArchived: { type: 'boolean', default: false },
                    fields: {
                        type: 'string',
                        description: 'Comma-separated list of fields to return (e.g., "id,role,content,createdAt"). Omit large fields like "content", "contextSources", "attachments", "editHistory", "comments" for better performance.'
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const options = request.query;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        // Parse fields parameter
        const fields = options.fields ? options.fields.split(',').map(f => f.trim()) : undefined;
        const result = await conversationService.getMessages(id, tenantId, {
            limit: options.limit,
            offset: options.offset,
            branchIndex: options.branchIndex,
            afterMessageId: options.afterMessageId,
            includeArchived: options.includeArchived,
            fields,
        });
        return {
            messages: result.messages,
            total: result.total,
            limit: options.limit || 50,
            offset: options.offset || 0,
            hasMore: result.hasMore,
        };
    });
    /**
     * Search conversations (full-text search across title, summary, and message content)
     * GET /insights/conversations/search
     */
    fastify.get('/insights/conversations/search', {
        onRequest: [authDecorator],
        schema: {
            description: 'Full-text search conversations by query (searches title, summary, and message content)',
            tags: ['conversations'],
            querystring: {
                type: 'object',
                required: ['q'],
                properties: {
                    q: { type: 'string', description: 'Search query (searches title, summary, and message content)' },
                    limit: { type: 'number', default: 20, maximum: 100 },
                    offset: { type: 'number', default: 0 },
                    fromDate: { type: 'string', description: 'ISO date string - filter conversations from this date' },
                    toDate: { type: 'string', description: 'ISO date string - filter conversations to this date' },
                    participantId: { type: 'string', description: 'Filter by participant user ID' },
                    tags: { type: 'string', description: 'Comma-separated tags to filter by' },
                    linkedShardId: { type: 'string', description: 'Filter conversations linked to a specific shard' },
                    includeLinkedShardsCount: { type: 'boolean', default: false, description: 'Include linked shards count in response' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { q, limit = 20, offset = 0, fromDate, toDate, participantId, tags, linkedShardId, includeLinkedShardsCount } = request.query;
        const result = await conversationService.list(tenantId, userId, {
            search: q,
            limit,
            offset,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
            participantId,
            tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
            linkedShardId,
            includeLinkedShardsCount,
        });
        return {
            conversations: result.conversations.map(c => {
                const response = {
                    id: c.id,
                    ...c.structuredData,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                };
                // Include linked shards count if available (from metadata)
                if (c.linkedShardsCount !== undefined) {
                    response.linkedShardsCount = c.linkedShardsCount;
                }
                return response;
            }),
            total: result.total,
            limit,
            offset,
            hasMore: result.hasMore,
            query: q,
        };
    });
    /**
     * Edit a message
     * PATCH /insights/conversations/:id/messages/:messageId
     */
    fastify.patch('/insights/conversations/:id/messages/:messageId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Edit a user message',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string' },
                    reason: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id, messageId } = request.params;
        const input = request.body;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const message = await conversationService.editMessage(id, tenantId, messageId, userId, input);
        return {
            ...message,
        };
    });
    /**
     * Regenerate response after message edit
     * POST /insights/conversations/:id/messages/:messageId/regenerate
     */
    fastify.post('/insights/conversations/:id/messages/:messageId/regenerate', {
        onRequest: chatRateLimitHandlers,
        schema: {
            description: 'Regenerate the immediate next assistant response after message edit',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id, messageId } = request.params;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const result = await conversationService.regenerateResponseAfterEdit(id, tenantId, messageId, userId);
        return {
            editedMessage: result.editedMessage,
            nextMessage: result.nextMessage,
            needsRegeneration: !!result.nextMessage && result.nextMessage.status === 'pending',
        };
    });
    /**
     * Get message edit history
     * GET /insights/conversations/:id/messages/:messageId/history
     */
    fastify.get('/insights/conversations/:id/messages/:messageId/history', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get message edit history',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id, messageId } = request.params;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const conversation = await conversationService.get(id, tenantId);
        if (!conversation) {
            return reply.status(404).send({ error: 'Conversation not found' });
        }
        const data = conversation.structuredData;
        const message = data.messages?.find((m) => m.id === messageId);
        if (!message) {
            return reply.status(404).send({ error: 'Message not found' });
        }
        return {
            messageId,
            editHistory: message.editHistory || [],
            editedAt: message.editedAt,
            editedBy: message.editedBy,
            originalContent: message.originalContent,
        };
    });
    /**
     * Get archived message shards for a conversation
     * GET /insights/conversations/:id/archived-messages
     */
    fastify.get('/insights/conversations/:id/archived-messages', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get archived message shards for a conversation',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const archivedShards = await conversationService.getArchivedMessageShards(id, tenantId);
        return {
            archivedShards: archivedShards.map(shard => ({
                id: shard.id,
                messageCount: shard.structuredData?.messageCount || 0,
                archivedAt: shard.structuredData?.archivedAt,
                archivedBy: shard.structuredData?.archivedBy,
                firstMessageId: shard.structuredData?.firstMessageId,
                lastMessageId: shard.structuredData?.lastMessageId,
                createdAt: shard.createdAt,
            })),
            total: archivedShards.length,
        };
    });
    /**
     * Generate or regenerate conversation summary
     * POST /insights/conversations/:id/summary
     */
    fastify.post('/insights/conversations/:id/summary', {
        onRequest: [authDecorator],
        schema: {
            description: 'Generate or regenerate conversation summary (AI-powered if available)',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    forceAI: { type: 'boolean', description: 'Force AI generation even if summary exists' },
                    maxMessages: { type: 'number', description: 'Maximum messages to include in summary context' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const options = request.body || {};
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        const summary = await conversationService.generateSummary(id, tenantId, {
            forceAI: options.forceAI,
            maxMessages: options.maxMessages,
        });
        // Update conversation with new summary
        await conversationService.update(id, tenantId, userId, { summary });
        return {
            conversationId: id,
            summary,
            generatedAt: new Date().toISOString(),
        };
    });
    /**
     * Export conversation to PDF, Markdown, or JSON
     * GET /insights/conversations/:id/export
     */
    fastify.get('/insights/conversations/:id/export', {
        onRequest: [authDecorator],
        schema: {
            description: 'Export conversation to PDF, Markdown, or JSON',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                required: ['format'],
                properties: {
                    format: {
                        type: 'string',
                        enum: ['pdf', 'markdown', 'json'],
                        description: 'Export format'
                    },
                    includeArchived: {
                        type: 'boolean',
                        default: false,
                        description: 'Include archived messages'
                    },
                    includeEditHistory: {
                        type: 'boolean',
                        default: true,
                        description: 'Include message edit history'
                    },
                    includeContextSources: {
                        type: 'boolean',
                        default: true,
                        description: 'Include context sources (RAG citations)'
                    },
                    fromDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Filter messages from this date'
                    },
                    toDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Filter messages to this date'
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id } = request.params;
        const { format, includeArchived, includeEditHistory, includeContextSources, fromDate, toDate } = request.query;
        // Check access
        const access = await conversationService.canAccess(id, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const exportResult = await conversationService.exportConversation(id, tenantId, {
                format,
                includeArchived: includeArchived ?? false,
                includeEditHistory: includeEditHistory ?? true,
                includeContextSources: includeContextSources ?? true,
                fromDate: fromDate ? new Date(fromDate) : undefined,
                toDate: toDate ? new Date(toDate) : undefined,
            });
            // Set appropriate headers
            reply.header('Content-Type', exportResult.mimeType);
            reply.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
            reply.header('Content-Length', exportResult.size.toString());
            return reply.send(exportResult.content);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('ConversionService')) {
                return reply.status(503).send({
                    error: 'PDF export is not available. Conversion service not configured.',
                    details: errorMessage
                });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to export conversation');
            return reply.status(500).send({ error: 'Failed to export conversation', details: errorMessage });
        }
    });
    // ============================================
    // Entity Resolution API
    // ============================================
    /**
     * Resolve entity name to shardId
     * POST /insights/entities/resolve
     */
    fastify.post('/insights/entities/resolve', {
        onRequest: [authDecorator],
        schema: {
            description: 'Resolve entity name to shardId',
            tags: ['entities'],
            body: {
                type: 'object',
                required: ['entityName'],
                properties: {
                    entityName: { type: 'string' },
                    projectId: { type: 'string' },
                    shardTypes: { type: 'array', items: { type: 'string' } },
                    limit: { type: 'number', default: 10 },
                },
            },
        },
    }, async (request, reply) => {
        if (!entityResolutionService) {
            return reply.status(501).send({ error: 'Entity resolution service not available' });
        }
        const { tenantId } = request.user;
        const { entityName, projectId, shardTypes, limit } = request.body;
        const results = await entityResolutionService.resolveEntity(tenantId, entityName, {
            projectId,
            shardTypes,
            limit,
        });
        return {
            entityName,
            results,
            count: results.length,
        };
    });
    /**
     * Entity autocomplete
     * GET /insights/entities/autocomplete
     */
    fastify.get('/insights/entities/autocomplete', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get entity autocomplete suggestions',
            tags: ['entities'],
            querystring: {
                type: 'object',
                required: ['q'],
                properties: {
                    q: { type: 'string', minLength: 2 },
                    projectId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        if (!entityResolutionService) {
            return reply.status(501).send({ error: 'Entity resolution service not available' });
        }
        const { tenantId } = request.user;
        const { q, projectId } = request.query;
        const suggestions = await entityResolutionService.autocomplete(tenantId, q, projectId);
        return {
            query: q,
            suggestions,
            count: suggestions.length,
        };
    });
    /**
     * List project entities
     * GET /insights/projects/:projectId/entities
     */
    fastify.get('/insights/projects/:projectId/entities', {
        onRequest: [authDecorator],
        schema: {
            description: 'List entities (documents/opportunities/notes) in a project',
            tags: ['entities', 'projects'],
            params: {
                type: 'object',
                properties: {
                    projectId: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    shardTypes: { type: 'array', items: { type: 'string' } },
                    limit: { type: 'number', default: 50 },
                    offset: { type: 'number', default: 0 },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { projectId } = request.params;
        const { shardTypes = ['c_document', 'c_opportunity', 'c_note'], limit = 50, offset = 0 } = request.query;
        // Use shard repository to list project entities
        const { ShardRepository } = await import('../repositories/shard.repository.js');
        const shardRepository = new ShardRepository(fastify.cosmosClient, fastify.monitoring);
        // If multiple shard types, we need to query each separately or filter after
        // For now, query all and filter by shardTypeIds
        const result = await shardRepository.list({
            filter: {
                tenantId,
            },
            limit: limit * 2, // Get more to account for filtering
        });
        // Filter by shardTypeIds if specified
        const filteredShards = shardTypes.length > 0
            ? result.shards.filter(s => shardTypes.includes(s.shardTypeId))
            : result.shards;
        // Apply limit after filtering
        const limitedShards = filteredShards.slice(0, limit);
        return {
            projectId,
            entities: limitedShards.map(s => {
                const data = s.structuredData;
                return {
                    id: s.id,
                    shardType: s.shardTypeId,
                    name: data?.name || data?.title || s.shardTypeName || s.id,
                    description: data?.description || data?.summary || undefined,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                };
            }),
            total: filteredShards.length,
            limit,
            offset,
            hasMore: filteredShards.length > limit || !!result.continuationToken,
        };
    });
    // ============================================
    // Templates API
    // ============================================
    /**
     * List context templates
     * GET /insights/templates
     */
    fastify.get('/insights/templates', {
        schema: {
            description: 'List available context templates',
            tags: ['templates'],
            querystring: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                    scope: { type: 'string', enum: ['system', 'tenant', 'user'] },
                    search: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { category, scope, search } = request.query;
        const templates = await contextTemplateService.listTemplates(tenantId, {
            category,
            includeSystem: scope !== 'user',
        });
        return {
            templates: templates.map(t => ({
                id: t.id,
                ...t.structuredData,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            })),
            total: templates.length,
        };
    });
    /**
     * Get template
     * GET /insights/templates/:id
     */
    fastify.get('/insights/templates/:id', {
        schema: {
            description: 'Get a context template by ID',
            tags: ['templates'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id } = request.params;
        const template = await contextTemplateService.getTemplateById(id, tenantId);
        if (!template) {
            return reply.status(404).send({ error: 'Template not found' });
        }
        return {
            id: template.id,
            ...template.structuredData,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
        };
    });
    // ============================================
    // Models API
    // ============================================
    /**
     * List available models
     * GET /insights/models
     */
    fastify.get('/insights/models', {
        schema: {
            description: 'List available AI models',
            tags: ['models'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        try {
            // Try to get AIConfigService from server decoration
            const aiConfigService = fastify.aiConfigService;
            if (aiConfigService) {
                // Use AIConfigService to get actual available models
                const availableModels = await aiConfigService.getAvailableModels(tenantId);
                // Transform to the expected format
                const models = availableModels.chatModels.map((model) => {
                    // Get model details from AI_PROVIDERS if available
                    const modelInfo = getModelById(model.id);
                    return {
                        id: model.id,
                        name: model.name,
                        provider: model.provider.toLowerCase(),
                        capabilities: {
                            supportsStreaming: modelInfo?.supportsStreaming ?? true,
                            supportsVision: modelInfo?.supportsVision ?? false,
                            supportsFunctionCalling: modelInfo?.supportsFunctionCalling ?? false,
                            supportsJSON: modelInfo?.supportsJSON ?? false,
                        },
                        contextWindow: modelInfo?.contextWindow || 128000,
                        maxOutputTokens: modelInfo?.maxOutputTokens || 4096,
                        pricing: modelInfo ? {
                            promptPer1k: (modelInfo.inputPricePerMillion || 0) / 1000,
                            completionPer1k: (modelInfo.outputPricePerMillion || 0) / 1000,
                        } : undefined,
                        isDefault: model.id === availableModels.currentChatModel,
                    };
                });
                return {
                    models,
                    defaultModel: availableModels.currentChatModel,
                    total: models.length,
                };
            }
            // Fallback to hardcoded list if AIConfigService not available
            fastify.log.warn('AIConfigService not available, using hardcoded model list');
            return {
                models: [
                    {
                        id: 'gpt-4o',
                        name: 'GPT-4o',
                        provider: 'openai',
                        capabilities: {
                            supportsStreaming: true,
                            supportsVision: true,
                            supportsFunctionCalling: true,
                            supportsJSON: true,
                        },
                        contextWindow: 128000,
                        maxOutputTokens: 4096,
                        pricing: {
                            promptPer1k: 2.5 / 1000,
                            completionPer1k: 10 / 1000,
                        },
                        isDefault: true,
                    },
                    {
                        id: 'gpt-4o-mini',
                        name: 'GPT-4o Mini',
                        provider: 'openai',
                        capabilities: {
                            supportsStreaming: true,
                            supportsVision: true,
                            supportsFunctionCalling: true,
                            supportsJSON: true,
                        },
                        contextWindow: 128000,
                        maxOutputTokens: 16384,
                        pricing: {
                            promptPer1k: 0.15 / 1000,
                            completionPer1k: 0.6 / 1000,
                        },
                        isDefault: false,
                    },
                ],
                defaultModel: 'gpt-4o',
                total: 2,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            fastify.log.error(error instanceof Error ? error : new Error(errorMessage), 'Error fetching available models');
            // Return minimal fallback on error
            return {
                models: [],
                defaultModel: 'gpt-4o',
                total: 0,
                error: 'Failed to fetch available models',
            };
        }
    });
    // ============================================
    // Conversation Configuration API
    // ============================================
    /**
     * Get conversation configuration for tenant
     * GET /insights/conversations/config
     */
    fastify.get('/insights/conversations/config', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get conversation configuration for tenant',
            tags: ['conversations'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const config = await conversationService.getConversationConfig(tenantId);
        return config;
    });
    /**
     * Update conversation configuration for tenant
     * PATCH /insights/conversations/config
     */
    fastify.patch('/insights/conversations/config', {
        onRequest: [authDecorator],
        schema: {
            description: 'Update conversation configuration for tenant',
            tags: ['conversations'],
            body: {
                type: 'object',
                properties: {
                    maxEditHistory: {
                        type: 'number',
                        minimum: 1,
                        maximum: 100,
                        description: 'Number of edit history entries to retain per message (default: 10)',
                    },
                    maxMessageLimit: {
                        type: 'number',
                        minimum: 100,
                        maximum: 10000,
                        description: 'Maximum messages before auto-archiving (default: 1000)',
                    },
                    autoSummarizeEnabled: {
                        type: 'boolean',
                        description: 'Enable automatic summarization (default: true)',
                    },
                    autoSummarizeThreshold: {
                        type: 'number',
                        minimum: 10,
                        maximum: 500,
                        description: 'Number of messages before auto-summarizing (default: 50)',
                    },
                    autoArchiveEnabled: {
                        type: 'boolean',
                        description: 'Enable automatic message archiving (default: true)',
                    },
                    autoArchiveThreshold: {
                        type: 'number',
                        minimum: 100,
                        maximum: 10000,
                        description: 'Number of messages before auto-archiving (default: 1000)',
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const input = request.body;
        try {
            const config = await conversationService.updateConversationConfig(tenantId, userId, input);
            return config;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('must be between')) {
                return reply.status(400).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to update conversation config');
            return reply.status(500).send({ error: 'Failed to update conversation configuration' });
        }
    });
    // ============================================
    // Conversation Templates API
    // ============================================
    /**
     * List conversation templates
     * GET /insights/conversation-templates
     */
    fastify.get('/insights/conversation-templates', {
        onRequest: [authDecorator],
        schema: {
            description: 'List available conversation templates',
            tags: ['conversations'],
            querystring: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                    projectId: { type: 'string', description: 'Filter templates for specific project' },
                    includeSystem: { type: 'boolean', default: true },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { category, projectId, includeSystem = true } = request.query;
        // Get conversation template shard type
        const shardTypeRepo = fastify.shardTypeRepository;
        if (!shardTypeRepo) {
            return reply.status(500).send({ error: 'Shard type repository not available' });
        }
        const shardTypes = await shardTypeRepo.list(tenantId, { limit: 100 });
        const templateType = shardTypes.shardTypes.find((st) => st.name === 'c_conversationTemplate');
        if (!templateType) {
            return { templates: [] };
        }
        // Query templates
        const filters = {
            shardTypeId: templateType.id,
        };
        // Filter by category if provided
        if (category) {
            // Note: This would require a structuredData filter, which may need custom query
            // For now, we'll fetch all and filter in memory
        }
        const templates = await fastify.shardRepository.list(tenantId, {
            ...filters,
            limit: 100,
        });
        // Filter templates
        const filtered = templates.shards.filter((shard) => {
            const data = shard.structuredData;
            // Filter by system/public
            if (!includeSystem && data.isSystem) {
                return false;
            }
            // Filter by category
            if (category && data.category !== category) {
                return false;
            }
            // Filter by project scope
            if (projectId) {
                // Include templates with no project scope, optional scope, or required scope
                // (required scope templates will be validated when creating conversation)
                if (data.projectScope === 'none') {
                    return true; // General templates available for any project
                }
                return true; // Project-scoped templates available
            }
            else {
                // No project - exclude required project scope templates
                if (data.projectScope === 'required') {
                    return false;
                }
            }
            return true;
        });
        return {
            templates: filtered.map((shard) => ({
                id: shard.id,
                name: shard.structuredData.name,
                description: shard.structuredData.description,
                category: shard.structuredData.category,
                initialMessage: shard.structuredData.initialMessage,
                titleSuggestion: shard.structuredData.titleSuggestion,
                assistantId: shard.structuredData.assistantId,
                defaultModelId: shard.structuredData.defaultModelId,
                contextTemplateId: shard.structuredData.contextTemplateId,
                defaultTags: shard.structuredData.defaultTags || [],
                projectScope: shard.structuredData.projectScope || 'none',
                variables: shard.structuredData.variables || [],
                isPublic: shard.structuredData.isPublic || false,
                isSystem: shard.structuredData.isSystem || false,
                createdAt: shard.createdAt,
                updatedAt: shard.updatedAt,
            })),
            total: filtered.length,
        };
    });
    /**
     * Create conversation from template
     * POST /insights/conversation-templates/:id/create
     */
    fastify.post('/insights/conversation-templates/:id/create', {
        onRequest: [authDecorator],
        schema: {
            description: 'Create a new conversation from a template',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    variables: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                        description: 'Variables to fill in template placeholders (e.g., {{projectName}})',
                    },
                    projectId: { type: 'string', description: 'Project ID for project-scoped templates' },
                    linkedShards: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional shard IDs to link to the conversation',
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: templateId } = request.params;
        const { variables, projectId, linkedShards } = request.body;
        try {
            const conversation = await conversationService.createFromTemplate(tenantId, userId, templateId, variables, projectId, linkedShards);
            return {
                conversationId: conversation.id,
                title: conversation.structuredData.title,
                createdAt: conversation.createdAt,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('requires a project')) {
                return reply.status(400).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to create conversation from template');
            return reply.status(500).send({ error: 'Failed to create conversation from template' });
        }
    });
    // ============================================
    // Conversation Threading API
    // ============================================
    /**
     * Create a new conversation thread
     * POST /insights/conversations/threads
     */
    fastify.post('/insights/conversations/threads', {
        onRequest: [authDecorator],
        schema: {
            description: 'Create a new conversation thread (root conversation)',
            tags: ['conversations'],
            body: {
                type: 'object',
                required: ['threadTopic'],
                properties: {
                    title: { type: 'string' },
                    threadTopic: { type: 'string', description: 'Topic/theme of the thread' },
                    visibility: { type: 'string', enum: ['private', 'shared', 'public'] },
                    assistantId: { type: 'string' },
                    templateId: { type: 'string' },
                    defaultModelId: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const input = request.body;
        try {
            const thread = await conversationService.createThread(tenantId, userId, input);
            return {
                threadId: thread.id,
                title: thread.structuredData.title,
                threadTopic: thread.structuredData.threadTopic,
                createdAt: thread.createdAt,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to create thread');
            return reply.status(500).send({ error: 'Failed to create thread', details: errorMessage });
        }
    });
    /**
     * Add conversation to thread
     * POST /insights/conversations/:id/threads/:threadId
     */
    fastify.post('/insights/conversations/:id/threads/:threadId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Add a conversation to an existing thread',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    threadId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId, threadId } = request.params;
        // Check access to conversation
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const conversation = await conversationService.addToThread(tenantId, userId, conversationId, threadId);
            return {
                conversationId: conversation.id,
                threadId: conversation.structuredData.threadId,
                threadOrder: conversation.structuredData.threadOrder,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('already part of')) {
                return reply.status(400).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to add conversation to thread');
            return reply.status(500).send({ error: 'Failed to add conversation to thread' });
        }
    });
    /**
     * Remove conversation from thread
     * DELETE /insights/conversations/:id/threads
     */
    fastify.delete('/insights/conversations/:id/threads', {
        onRequest: [authDecorator],
        schema: {
            description: 'Remove a conversation from its thread',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const conversation = await conversationService.removeFromThread(tenantId, userId, conversationId);
            return {
                conversationId: conversation.id,
                removed: true,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('Cannot remove thread root')) {
                return reply.status(400).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to remove conversation from thread');
            return reply.status(500).send({ error: 'Failed to remove conversation from thread' });
        }
    });
    /**
     * Get thread members
     * GET /insights/conversations/threads/:threadId/members
     */
    fastify.get('/insights/conversations/threads/:threadId/members', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get all conversations in a thread',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    threadId: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    includeArchived: { type: 'boolean', default: false },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { threadId } = request.params;
        const { includeArchived = false } = request.query;
        // Check access to thread
        const access = await conversationService.canAccess(threadId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const members = await conversationService.getThreadMembers(threadId, tenantId, {
                includeArchived,
            });
            return {
                threadId,
                members: members.map(shard => ({
                    id: shard.id,
                    title: shard.structuredData.title,
                    threadOrder: shard.structuredData.threadOrder,
                    messageCount: shard.structuredData.messageCount || 0,
                    lastActivityAt: shard.structuredData.lastActivityAt || shard.createdAt,
                    createdAt: shard.createdAt,
                })),
                total: members.length,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get thread members');
            return reply.status(500).send({ error: 'Failed to get thread members' });
        }
    });
    /**
     * Get thread summary
     * GET /insights/conversations/threads/:threadId/summary
     */
    fastify.get('/insights/conversations/threads/:threadId/summary', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get thread summary (root + stats)',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    threadId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { threadId } = request.params;
        // Check access
        const access = await conversationService.canAccess(threadId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const summary = await conversationService.getThreadSummary(threadId, tenantId);
            return {
                threadId,
                title: summary.thread.structuredData.title,
                threadTopic: summary.thread.structuredData.threadTopic,
                memberCount: summary.memberCount,
                totalMessages: summary.totalMessages,
                lastActivityAt: summary.lastActivityAt,
                createdAt: summary.thread.createdAt,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get thread summary');
            return reply.status(500).send({ error: 'Failed to get thread summary' });
        }
    });
    /**
     * List threads
     * GET /insights/conversations/threads
     */
    fastify.get('/insights/conversations/threads', {
        onRequest: [authDecorator],
        schema: {
            description: 'List conversation threads',
            tags: ['conversations'],
            querystring: {
                type: 'object',
                properties: {
                    projectId: { type: 'string', description: 'Filter threads by project' },
                    topic: { type: 'string', description: 'Filter threads by topic (partial match)' },
                    limit: { type: 'number', default: 20, maximum: 100 },
                    offset: { type: 'number', default: 0 },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { projectId, topic, limit, offset } = request.query;
        try {
            const result = await conversationService.listThreads(tenantId, userId, {
                projectId,
                topic,
                limit,
                offset,
            });
            return {
                threads: result.threads.map(shard => ({
                    id: shard.id,
                    title: shard.structuredData.title,
                    threadTopic: shard.structuredData.threadTopic,
                    messageCount: shard.structuredData.messageCount || 0,
                    lastActivityAt: shard.structuredData.lastActivityAt || shard.createdAt,
                    createdAt: shard.createdAt,
                })),
                total: result.total,
                limit: limit || 20,
                offset: offset || 0,
                hasMore: result.hasMore,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to list threads');
            return reply.status(500).send({ error: 'Failed to list threads' });
        }
    });
    // ============================================
    // Conversation Collaboration API
    // ============================================
    /**
     * Add comment to message
     * POST /insights/conversations/:id/messages/:messageId/comments
     */
    fastify.post('/insights/conversations/:id/messages/:messageId/comments', {
        onRequest: [authDecorator],
        schema: {
            description: 'Add a comment to a message',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string', description: 'Comment content (supports @mentions)' },
                    parentCommentId: { type: 'string', description: 'Parent comment ID for threaded replies' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId, messageId } = request.params;
        const { content, parentCommentId } = request.body;
        // Handle temporary message IDs (messages that are still streaming)
        if (messageId.startsWith('temp-')) {
            return reply.status(400).send({
                error: 'Cannot add comment to a message that is still being generated',
                message: 'Please wait for the message to complete before adding comments'
            });
        }
        try {
            const comment = await conversationService.addComment(conversationId, tenantId, messageId, userId, { content, parentCommentId });
            return comment;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('Access denied')) {
                return reply.status(403).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to add comment');
            return reply.status(500).send({ error: 'Failed to add comment' });
        }
    });
    /**
     * Update comment
     * PATCH /insights/conversations/:id/messages/:messageId/comments/:commentId
     */
    fastify.patch('/insights/conversations/:id/messages/:messageId/comments/:commentId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Update a comment',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                    commentId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId, messageId, commentId } = request.params;
        const { content } = request.body;
        // Handle temporary message IDs (messages that are still streaming)
        if (messageId.startsWith('temp-')) {
            return reply.status(400).send({
                error: 'Cannot update comment on a message that is still being generated',
                message: 'Please wait for the message to complete'
            });
        }
        try {
            const comment = await conversationService.updateComment(conversationId, tenantId, messageId, commentId, userId, { content });
            return comment;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('Only comment author')) {
                return reply.status(403).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to update comment');
            return reply.status(500).send({ error: 'Failed to update comment' });
        }
    });
    /**
     * Delete comment
     * DELETE /insights/conversations/:id/messages/:messageId/comments/:commentId
     */
    fastify.delete('/insights/conversations/:id/messages/:messageId/comments/:commentId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Delete a comment',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                    commentId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId, messageId, commentId } = request.params;
        // Handle temporary message IDs (messages that are still streaming)
        if (messageId.startsWith('temp-')) {
            return reply.status(400).send({
                error: 'Cannot delete comment on a message that is still being generated',
                message: 'Please wait for the message to complete'
            });
        }
        try {
            await conversationService.deleteComment(conversationId, tenantId, messageId, commentId, userId);
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('Access denied')) {
                return reply.status(403).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to delete comment');
            return reply.status(500).send({ error: 'Failed to delete comment' });
        }
    });
    /**
     * Get comments for a message
     * GET /insights/conversations/:id/messages/:messageId/comments
     */
    fastify.get('/insights/conversations/:id/messages/:messageId/comments', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get all comments for a message',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    messageId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId, messageId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        // Handle temporary message IDs (messages that are still streaming)
        // Temporary IDs start with "temp-" and don't exist in the database yet
        if (messageId.startsWith('temp-')) {
            // Return empty comments for temporary message IDs
            // The actual message will be created when streaming completes
            return { comments: [] };
        }
        try {
            const comments = await conversationService.getComments(conversationId, tenantId, messageId);
            return { comments };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get comments');
            return reply.status(500).send({ error: 'Failed to get comments' });
        }
    });
    /**
     * Invite users to conversation
     * POST /insights/conversations/:id/invite
     */
    fastify.post('/insights/conversations/:id/invite', {
        onRequest: [authDecorator],
        schema: {
            description: 'Invite users to conversation (add as participants)',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['userIds'],
                properties: {
                    userIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'User IDs to invite',
                    },
                    role: {
                        type: 'string',
                        enum: ['owner', 'participant', 'viewer'],
                        default: 'participant',
                    },
                    notify: { type: 'boolean', default: true, description: 'Send notification to invited users' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        const { userIds, role, notify } = request.body;
        try {
            await conversationService.inviteUsers(conversationId, tenantId, userId, {
                userIds,
                role,
                notify,
            });
            return {
                success: true,
                invitedCount: userIds.length,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('Access denied')) {
                return reply.status(403).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to invite users');
            return reply.status(500).send({ error: 'Failed to invite users' });
        }
    });
    // ============================================
    // Conversation Analytics API
    // ============================================
    /**
     * Get conversation analytics
     * GET /insights/conversations/:id/analytics
     */
    fastify.get('/insights/conversations/:id/analytics', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get comprehensive analytics for a conversation (topics, entities, quality, cost)',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    includeArchived: { type: 'boolean', default: false },
                    forceRegenerate: { type: 'boolean', default: false },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        const { includeArchived, forceRegenerate } = request.query;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const analytics = await conversationService.generateAnalytics(conversationId, tenantId, {
                includeArchived,
                forceRegenerate,
            });
            return analytics;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to generate analytics');
            return reply.status(500).send({ error: 'Failed to generate analytics' });
        }
    });
    /**
     * Get conversation analytics summary (lightweight)
     * GET /insights/conversations/:id/analytics/summary
     */
    fastify.get('/insights/conversations/:id/analytics/summary', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get lightweight analytics summary for a conversation',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const summary = await conversationService.getAnalyticsSummary(conversationId, tenantId);
            return summary;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get analytics summary');
            return reply.status(500).send({ error: 'Failed to get analytics summary' });
        }
    });
    // ============================================
    // Shard Size Monitoring API
    // ============================================
    /**
     * Check conversation shard size and archive if needed
     * POST /insights/conversations/:id/check-size
     */
    fastify.post('/insights/conversations/:id/check-size', {
        onRequest: [authDecorator],
        schema: {
            description: 'Check conversation shard size and auto-archive if approaching limit',
            tags: ['conversations'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canWrite) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        try {
            const result = await conversationService.checkAndArchiveIfNeeded(conversationId, tenantId, userId);
            return {
                conversationId,
                archived: result.archived,
                sizeBytes: result.sizeBytes,
                sizeMB: result.sizeBytes ? (result.sizeBytes / (1024 * 1024)).toFixed(2) : undefined,
                messageCount: result.messageCount,
                threshold: {
                    warning: 1.2, // MB
                    max: 1.5, // MB
                    cosmosLimit: 2.0, // MB
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                return reply.status(404).send({ error: errorMessage });
            }
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to check shard size');
            return reply.status(500).send({ error: 'Failed to check shard size' });
        }
    });
    // ============================================
    // Typing Indicators API
    // ============================================
    /**
     * Start typing indicator
     * POST /insights/conversations/:id/typing/start
     */
    fastify.post('/insights/conversations/:id/typing/start', {
        onRequest: [authDecorator],
        schema: {
            description: 'Start typing indicator for a conversation',
            tags: ['conversations', 'realtime'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        if (!conversationRealtimeService) {
            return reply.status(503).send({ error: 'Real-time service not available' });
        }
        try {
            // Get user name (simplified - in production, fetch from user service)
            const userName = request.user.name || request.user.email || 'User';
            // Set typing indicator
            await conversationRealtimeService.setTypingIndicator(conversationId, tenantId, userId, userName, 5 // 5 second TTL
            );
            // Broadcast typing start event
            await conversationRealtimeService.broadcastTypingStart(conversationId, tenantId, userId, userName);
            return { success: true };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to start typing indicator');
            return reply.status(500).send({ error: 'Failed to start typing indicator' });
        }
    });
    /**
     * Stop typing indicator
     * POST /insights/conversations/:id/typing/stop
     */
    fastify.post('/insights/conversations/:id/typing/stop', {
        onRequest: [authDecorator],
        schema: {
            description: 'Stop typing indicator for a conversation',
            tags: ['conversations', 'realtime'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        if (!conversationRealtimeService) {
            return reply.status(503).send({ error: 'Real-time service not available' });
        }
        try {
            // Clear typing indicator
            await conversationRealtimeService.clearTypingIndicator(conversationId, tenantId, userId);
            // Broadcast typing stop event
            await conversationRealtimeService.broadcastTypingStop(conversationId, tenantId, userId);
            return { success: true };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to stop typing indicator');
            return reply.status(500).send({ error: 'Failed to stop typing indicator' });
        }
    });
    /**
     * Get active typing indicators
     * GET /insights/conversations/:id/typing
     */
    fastify.get('/insights/conversations/:id/typing', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get active typing indicators for a conversation',
            tags: ['conversations', 'realtime'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId, id: userId } = request.user;
        const { id: conversationId } = request.params;
        // Check access
        const access = await conversationService.canAccess(conversationId, tenantId, userId);
        if (!access.canRead) {
            return reply.status(403).send({ error: 'Access denied' });
        }
        if (!conversationRealtimeService) {
            return reply.status(503).send({ error: 'Real-time service not available' });
        }
        try {
            const indicators = await conversationRealtimeService.getTypingIndicators(conversationId, tenantId);
            // Filter out current user
            const otherUsersTyping = indicators.filter(ind => ind.userId !== userId);
            return { typing: otherUsersTyping };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get typing indicators');
            return reply.status(500).send({ error: 'Failed to get typing indicators' });
        }
    });
    // ============================================
    // Admin Conversation Statistics (Super Admin)
    // ============================================
    /**
     * Get system-wide conversation statistics
     * GET /admin/insights/conversations/stats
     */
    fastify.get('/admin/insights/conversations/stats', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get system-wide conversation statistics (Super Admin only)',
            tags: ['conversations', 'admin'],
            querystring: {
                type: 'object',
                properties: {
                    fromDate: { type: 'string', format: 'date-time' },
                    toDate: { type: 'string', format: 'date-time' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { isGlobalAdmin } = await import('../middleware/authorization.js');
            const { getUser } = await import('../middleware/authenticate.js');
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Super Admin privileges required',
                });
            }
            const { fromDate, toDate } = request.query;
            const options = {
                fromDate: fromDate ? new Date(fromDate) : undefined,
                toDate: toDate ? new Date(toDate) : undefined,
            };
            const stats = await conversationService.getSystemStats(options);
            return stats;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            request.log.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to get system conversation statistics');
            return reply.status(500).send({
                error: 'Failed to get system conversation statistics',
                message: errorMessage,
            });
        }
    });
    // Log all registered routes for debugging
    // Note: printRoutes() called from within a plugin may not show all routes or may show them in a different format
    // Routes are registered successfully (verified earlier), so this is just informational
    try {
        const registeredRoutes = fastify.printRoutes();
        const insightsRoutes = registeredRoutes.split('\n').filter(line => line.includes('/insights'));
        // Explicitly verify critical routes - check multiple formats
        const expectedChatRoute = prefix ? `${prefix}/insights/chat` : '/insights/chat';
        const chatRoutePatterns = [
            '/api/v1/insights/chat',
            'POST /api/v1/insights/chat',
            '/insights/chat',
            'POST /insights/chat',
            'insights/chat',
            'POST insights/chat',
            expectedChatRoute,
        ];
        const hasChatRoute = chatRoutePatterns.some(pattern => registeredRoutes.includes(pattern));
        const conversationsRoutePatterns = [
            '/api/v1/insights/conversations',
            'GET /api/v1/insights/conversations',
            '/insights/conversations',
            'GET /insights/conversations',
            'insights/conversations',
        ];
        const hasConversationsRoute = conversationsRoutePatterns.some(pattern => registeredRoutes.includes(pattern));
        // Check if routes exist but in a different format
        const chatRoutes = registeredRoutes.split('\n').filter(line => line.toLowerCase().includes('chat') &&
            (line.includes('insights') || line.includes('/chat')));
        // Log verification result - routes are registered, verification is just informational
        if (hasChatRoute || chatRoutes.length > 0) {
            fastify.log.info({
                routeCount: insightsRoutes.length,
                prefix: prefix || 'none',
                expectedChatRoute,
                hasChatRoute: '✅',
                hasConversationsRoute: hasConversationsRoute ? '✅' : '❌',
                sampleRoutes: insightsRoutes.slice(0, 10),
            }, `✅ AI Insights routes registration complete.`);
        }
        else {
            // Route was registered earlier (we saw the success log), but printRoutes() can't find it
            // This is a known limitation when calling printRoutes() from within a plugin
            fastify.log.info({
                routeCount: insightsRoutes.length,
                prefix: prefix || 'none',
                expectedChatRoute,
                note: 'Route registered successfully (printRoutes() verification inconclusive from plugin scope)',
            }, `✅ AI Insights routes registration complete.`);
            fastify.log.debug('ℹ️  Route verification inconclusive - routes are registered, but printRoutes() may not show them from plugin scope');
        }
    }
    catch (err) {
        // Silently ignore - printRoutes() may not be available or may fail
        // Routes are still registered successfully
        fastify.log.debug('ℹ️  Could not verify routes via printRoutes() (routes are still registered)');
    }
}
//# sourceMappingURL=insights.routes.js.map