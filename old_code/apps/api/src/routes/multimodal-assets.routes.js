/**
 * Multi-Modal Assets API Routes
 * Endpoints for uploading and managing images, audio, video, and documents for AI insights
 */
/**
 * Register multi-modal asset routes
 */
export async function multimodalAssetsRoutes(fastify, options) {
    const { multimodalAssetService, authenticate: passedAuthenticate, tokenValidationCache } = options;
    if (!multimodalAssetService) {
        fastify.log.warn('⚠️  Multi-modal asset routes not registered - service missing');
        return;
    }
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
        fastify.log.warn('⚠️  Multi-modal asset routes not registered - authentication decorator missing');
        return;
    }
    // Log route registration start
    fastify.log.info('🚀 Starting multi-modal asset routes registration', {
        hasService: !!multimodalAssetService,
        hasAuthDecorator: !!authDecorator,
        prefix: fastify.prefix || 'none',
    });
    // Register a simple test route first to verify the plugin is working
    fastify.get('/insights/assets/test', {
        onRequest: [authDecorator],
    }, async (request, reply) => {
        return reply.send({ message: 'Assets routes are working', timestamp: new Date().toISOString() });
    });
    fastify.log.info('✅ Test route registered: GET /insights/assets/test');
    /**
     * POST /insights/assets/upload
     * Upload a multi-modal asset (image, audio, video, document)
     */
    fastify.post('/insights/assets/upload', {
        onRequest: [authDecorator],
        schema: {
            description: 'Upload a multi-modal asset for AI insights',
            tags: ['Multi-Modal Assets'],
            consumes: ['multipart/form-data'],
            querystring: {
                type: 'object',
                required: ['assetType'],
                properties: {
                    assetType: {
                        type: 'string',
                        enum: ['image', 'audio', 'video', 'document'],
                    },
                    conversationId: { type: 'string' },
                    messageId: { type: 'string' },
                    shardId: { type: 'string' },
                    insightId: { type: 'string' },
                    autoAnalyze: { type: 'string', enum: ['true', 'false'] },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }
            // Get file from multipart form data
            const data = await request.file();
            if (!data) {
                return reply.status(400).send({
                    error: 'No file provided',
                    message: 'Request must include a file in multipart/form-data format',
                });
            }
            // Convert file stream to buffer
            const fileBuffer = await data.toBuffer();
            // Get query parameters
            const { assetType, conversationId, messageId, shardId, insightId, autoAnalyze } = request.query;
            // Determine MIME type
            const mimeType = data.mimetype || 'application/octet-stream';
            // Validate asset type matches MIME type
            const mimeTypeValidation = validateAssetType(assetType, mimeType);
            if (!mimeTypeValidation.valid) {
                return reply.status(400).send({
                    error: 'Invalid file type',
                    message: mimeTypeValidation.message,
                });
            }
            // Upload asset
            const result = await multimodalAssetService.uploadAsset({
                file: fileBuffer,
                fileName: data.filename || 'untitled',
                mimeType,
                assetType,
                attachTo: conversationId || messageId || shardId || insightId
                    ? {
                        conversationId,
                        messageId,
                        shardId,
                        insightId,
                    }
                    : undefined,
                autoAnalyze: autoAnalyze === 'false' ? false : true,
            }, user.tenantId, user.id);
            return reply.status(201).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to upload asset');
            return reply.status(500).send({
                error: 'Failed to upload asset',
                message: error.message || 'Unknown error',
            });
        }
    });
    /**
     * GET /insights/assets
     * List assets for the current tenant
     * IMPORTANT: This route must be registered BEFORE /insights/assets/:assetId
     * to ensure proper route matching in Fastify
     */
    const listAssetsRoutePath = '/insights/assets';
    fastify.log.info(`Registering route: GET ${listAssetsRoutePath} (will be available at /api/v1${listAssetsRoutePath})`);
    try {
        fastify.get(listAssetsRoutePath, {
            onRequest: [authDecorator],
            schema: {
                description: 'List multi-modal assets',
                tags: ['Multi-Modal Assets'],
                querystring: {
                    type: 'object',
                    properties: {
                        assetType: {
                            type: 'string',
                            enum: ['image', 'audio', 'video', 'document'],
                        },
                        conversationId: { type: 'string' },
                        messageId: { type: 'string' },
                        shardId: { type: 'string' },
                        limit: { type: 'string' },
                        offset: { type: 'string' },
                    },
                },
            },
        }, async (request, reply) => {
            try {
                fastify.log.info(`GET ${listAssetsRoutePath} - Request received`, {
                    url: request.url,
                    method: request.method,
                    hasUser: !!request.user,
                    query: request.query,
                });
                const user = request.user;
                if (!user || !user.tenantId) {
                    fastify.log.warn('Unauthorized request to list assets');
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Authentication required'
                    });
                }
                const { assetType, conversationId, messageId, shardId, limit, offset } = request.query;
                // Handle temporary message IDs (messages still being generated)
                if (messageId && messageId.startsWith('temp-')) {
                    fastify.log.info('Temporary message ID detected, returning empty assets array', {
                        messageId,
                        tenantId: user.tenantId,
                    });
                    return reply.status(200).send({ assets: [] });
                }
                fastify.log.info('Fetching assets', {
                    tenantId: user.tenantId,
                    filters: { assetType, conversationId, messageId, shardId, limit, offset },
                });
                const assets = await multimodalAssetService.listAssets(user.tenantId, {
                    assetType,
                    attachedTo: conversationId || messageId || shardId
                        ? {
                            conversationId,
                            messageId,
                            shardId,
                        }
                        : undefined,
                    limit: limit ? parseInt(limit, 10) : undefined,
                    offset: offset ? parseInt(offset, 10) : undefined,
                });
                fastify.log.info('Assets fetched successfully', {
                    tenantId: user.tenantId,
                    count: assets.length,
                });
                return reply.status(200).send({ assets });
            }
            catch (error) {
                const errorDetails = {
                    errorType: error.constructor?.name,
                    errorName: error.name,
                    errorMessage: error.message,
                    errorStack: error.stack?.substring(0, 500),
                    statusCode: error.statusCode,
                    tenantId: request.user?.tenantId,
                };
                request.log.error(errorDetails, 'Failed to list assets');
                const statusCode = error.statusCode || (error.message?.includes('not found') ? 404 : 500);
                return reply.status(statusCode).send({
                    error: error.name || 'Internal Server Error',
                    message: error.message || 'Failed to list assets',
                    ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
                });
            }
        });
        fastify.log.info(`✅ Successfully registered GET ${listAssetsRoutePath}`);
    }
    catch (error) {
        fastify.log.error({ error }, `❌ Failed to register GET ${listAssetsRoutePath}`);
        throw error;
    }
    /**
     * GET /insights/assets/:assetId
     * Get asset metadata
     * IMPORTANT: This route must be registered AFTER /insights/assets
     * to ensure proper route matching in Fastify
     */
    fastify.get('/insights/assets/:assetId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get multi-modal asset metadata',
            tags: ['Multi-Modal Assets'],
            params: {
                type: 'object',
                required: ['assetId'],
                properties: {
                    assetId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }
            const { assetId } = request.params;
            const asset = await multimodalAssetService.getAsset(assetId, user.tenantId);
            if (!asset) {
                return reply.status(404).send({ error: 'Asset not found' });
            }
            return reply.send(asset);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get asset');
            return reply.status(500).send({
                error: 'Failed to get asset',
                message: error.message || 'Unknown error',
            });
        }
    });
    /**
     * POST /insights/assets/:assetId/process
     * Trigger processing for a pending asset
     */
    fastify.post('/insights/assets/:assetId/process', {
        onRequest: [authDecorator],
        schema: {
            description: 'Process a pending multi-modal asset',
            tags: ['Multi-Modal Assets'],
            params: {
                type: 'object',
                required: ['assetId'],
                properties: {
                    assetId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }
            const { assetId } = request.params;
            const asset = await multimodalAssetService.processAsset(assetId, user.tenantId);
            return reply.send(asset);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to process asset');
            return reply.status(500).send({
                error: 'Failed to process asset',
                message: error.message || 'Unknown error',
            });
        }
    });
    /**
     * DELETE /insights/assets/:assetId
     * Delete an asset
     */
    fastify.delete('/insights/assets/:assetId', {
        onRequest: [authDecorator],
        schema: {
            description: 'Delete a multi-modal asset',
            tags: ['Multi-Modal Assets'],
            params: {
                type: 'object',
                required: ['assetId'],
                properties: {
                    assetId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }
            const { assetId } = request.params;
            await multimodalAssetService.deleteAsset(assetId, user.tenantId);
            return reply.status(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete asset');
            return reply.status(500).send({
                error: 'Failed to delete asset',
                message: error.message || 'Unknown error',
            });
        }
    });
    // Verify route registration
    try {
        const registeredRoutes = fastify.printRoutes();
        const assetsRoutes = registeredRoutes.split('\n').filter(line => line.toLowerCase().includes('assets') &&
            (line.includes('insights') || line.includes('/assets')));
        const routePatterns = [
            '/api/v1/insights/assets',
            'GET /api/v1/insights/assets',
            '/insights/assets',
            'GET /insights/assets',
            'insights/assets',
        ];
        const hasAssetsRoute = routePatterns.some(pattern => registeredRoutes.includes(pattern));
        if (hasAssetsRoute || assetsRoutes.length > 0) {
            fastify.log.info(`✅ Multi-modal asset routes registered successfully (found ${assetsRoutes.length} route(s))`);
            if (assetsRoutes.length > 0) {
                fastify.log.info('Registered assets routes:', assetsRoutes.slice(0, 10));
            }
        }
        else {
            fastify.log.warn('⚠️ Multi-modal asset routes may not be registered correctly');
            fastify.log.warn('Available routes containing "assets":', registeredRoutes.split('\n').filter(line => line.includes('assets')).slice(0, 10));
            fastify.log.warn('Available routes containing "insights":', registeredRoutes.split('\n').filter(line => line.includes('insights')).slice(0, 20));
        }
    }
    catch (err) {
        fastify.log.error({ err }, '❌ Error verifying routes via printRoutes()');
    }
    fastify.log.info('✅ Multi-modal asset routes registration completed');
}
/**
 * Validate that the asset type matches the MIME type
 */
function validateAssetType(assetType, mimeType) {
    const mimeTypeMap = {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg'],
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        document: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/markdown',
        ],
    };
    const allowedTypes = mimeTypeMap[assetType];
    if (!allowedTypes) {
        return { valid: false, message: `Invalid asset type: ${assetType}` };
    }
    if (!allowedTypes.includes(mimeType)) {
        return {
            valid: false,
            message: `MIME type ${mimeType} is not allowed for asset type ${assetType}. Allowed types: ${allowedTypes.join(', ')}`,
        };
    }
    return { valid: true };
}
//# sourceMappingURL=multimodal-assets.routes.js.map