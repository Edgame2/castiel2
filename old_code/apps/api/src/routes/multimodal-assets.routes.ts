/**
 * Multi-Modal Assets API Routes
 * Endpoints for uploading and managing images, audio, video, and documents for AI insights
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultimodalAssetService } from '../services/multimodal-asset.service.js';
import { AssetType } from '../types/multimodal-asset.types.js';

interface UploadAssetRequest {
  Querystring: {
    assetType: AssetType;
    conversationId?: string;
    messageId?: string;
    shardId?: string;
    insightId?: string;
    autoAnalyze?: string; // 'true' | 'false'
  };
}

interface GetAssetRequest {
  Params: {
    assetId: string;
  };
}

interface ListAssetsRequest {
  Querystring: {
    assetType?: AssetType;
    conversationId?: string;
    messageId?: string;
    shardId?: string;
    limit?: string;
    offset?: string;
  };
}

interface DeleteAssetRequest {
  Params: {
    assetId: string;
  };
}

/**
 * Register multi-modal asset routes
 */
export async function multimodalAssetsRoutes(
  fastify: FastifyInstance,
  options: {
    multimodalAssetService?: MultimodalAssetService;
    authenticate?: any; // Authentication decorator passed from parent
    tokenValidationCache?: any; // Token validation cache passed from parent
  }
): Promise<void> {
  const { multimodalAssetService, authenticate: passedAuthenticate, tokenValidationCache } = options;

  if (!multimodalAssetService) {
    fastify.log.warn('⚠️  Multi-modal asset routes not registered - service missing');
    return;
  }

  // Get authentication decorator - prefer passed one, then try from fastify instance or parent
  let authDecorator = passedAuthenticate || (fastify as any).authenticate;
  
  // If not found, try to get from parent server
  if (!authDecorator && (fastify as any).parent) {
    authDecorator = ((fastify as any).parent)?.authenticate;
  }
  
  // If still not found, try to create from tokenValidationCache
  if (!authDecorator) {
    const cache = tokenValidationCache || 
                  (fastify as any).tokenValidationCache || 
                  ((fastify as any).parent)?.tokenValidationCache;
    
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
  fastify.log.info({
    hasService: !!multimodalAssetService,
    hasAuthDecorator: !!authDecorator,
    prefix: (fastify as any).prefix || 'none',
  }, '🚀 Starting multi-modal asset routes registration');

  // Register a simple test route first to verify the plugin is working
  fastify.get('/insights/assets/test', {
    onRequest: [authDecorator] as any,
  }, async (request, reply) => {
    return reply.send({ message: 'Assets routes are working', timestamp: new Date().toISOString() });
  });
  fastify.log.info('✅ Test route registered: GET /insights/assets/test');

  /**
   * POST /insights/assets/upload
   * Upload a multi-modal asset (image, audio, video, document)
   */
  fastify.post<UploadAssetRequest>(
    '/insights/assets/upload',
    {
      onRequest: [authDecorator] as any,
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
    },
    async (request: FastifyRequest<UploadAssetRequest>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
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
        const result = await multimodalAssetService.uploadAsset(
          {
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
          },
          user.tenantId,
          user.id
        );

        return reply.status(201).send(result);
      } catch (error: any) {
        request.log.error({ error }, 'Failed to upload asset');
        return reply.status(500).send({
          error: 'Failed to upload asset',
          message: error.message || 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /insights/assets
   * List assets for the current tenant
   * IMPORTANT: This route must be registered BEFORE /insights/assets/:assetId
   * to ensure proper route matching in Fastify
   */
  const listAssetsRoutePath = '/insights/assets';
  fastify.log.info(`Registering route: GET ${listAssetsRoutePath} (will be available at /api/v1${listAssetsRoutePath})`);
  
  try {
    fastify.get<ListAssetsRequest>(
      listAssetsRoutePath,
      {
        onRequest: [authDecorator] as any,
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
    },
    async (request: FastifyRequest<ListAssetsRequest>, reply: FastifyReply) => {
      try {
        fastify.log.info({
          url: request.url,
          method: request.method,
          hasUser: !!(request as any).user,
          query: request.query,
        }, `GET ${listAssetsRoutePath} - Request received`);

        const user = (request as any).user;
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
          fastify.log.info({
            messageId,
            tenantId: user.tenantId,
          }, 'Temporary message ID detected, returning empty assets array');
          return reply.status(200).send({ assets: [] });
        }

        fastify.log.info({
          tenantId: user.tenantId,
          filters: { assetType, conversationId, messageId, shardId, limit, offset },
        }, 'Fetching assets');

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

        fastify.log.info({
          tenantId: user.tenantId,
          count: assets.length,
        }, 'Assets fetched successfully');

        return reply.status(200).send({ assets });
      } catch (error: any) {
        const errorDetails = {
          errorType: error.constructor?.name,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack?.substring(0, 500),
          statusCode: error.statusCode,
          tenantId: (request as any).user?.tenantId,
        };
        
        request.log.error(errorDetails, 'Failed to list assets');
        
        const statusCode = error.statusCode || (error.message?.includes('not found') ? 404 : 500);
        return reply.status(statusCode).send({
          error: error.name || 'Internal Server Error',
          message: error.message || 'Failed to list assets',
          ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
        });
      }
    }
    );
    fastify.log.info(`✅ Successfully registered GET ${listAssetsRoutePath}`);
  } catch (error: any) {
    fastify.log.error({ error }, `❌ Failed to register GET ${listAssetsRoutePath}`);
    throw error;
  }

  /**
   * GET /insights/assets/:assetId
   * Get asset metadata
   * IMPORTANT: This route must be registered AFTER /insights/assets
   * to ensure proper route matching in Fastify
   */
  fastify.get<GetAssetRequest>(
    '/insights/assets/:assetId',
    {
      onRequest: [authDecorator] as any,
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
    },
    async (request: FastifyRequest<GetAssetRequest>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'Authentication required' });
        }

        const { assetId } = request.params;

        const asset = await multimodalAssetService.getAsset(assetId, user.tenantId);

        if (!asset) {
          return reply.status(404).send({ error: 'Asset not found' });
        }

        return reply.send(asset);
      } catch (error: any) {
        request.log.error({ error }, 'Failed to get asset');
        return reply.status(500).send({
          error: 'Failed to get asset',
          message: error.message || 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /insights/assets/:assetId/process
   * Trigger processing for a pending asset
   */
  fastify.post<{ Params: { assetId: string } }>(
    '/insights/assets/:assetId/process',
    {
      onRequest: [authDecorator] as any,
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
    },
    async (request: FastifyRequest<{ Params: { assetId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'Authentication required' });
        }

        const { assetId } = request.params;

        const asset = await multimodalAssetService.processAsset(assetId, user.tenantId);

        return reply.send(asset);
      } catch (error: any) {
        request.log.error({ error }, 'Failed to process asset');
        return reply.status(500).send({
          error: 'Failed to process asset',
          message: error.message || 'Unknown error',
        });
      }
    }
  );

  /**
   * DELETE /insights/assets/:assetId
   * Delete an asset
   */
  fastify.delete<DeleteAssetRequest>(
    '/insights/assets/:assetId',
    {
      onRequest: [authDecorator] as any,
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
    },
    async (request: FastifyRequest<DeleteAssetRequest>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.status(401).send({ error: 'Authentication required' });
        }

        const { assetId } = request.params;

        await multimodalAssetService.deleteAsset(assetId, user.tenantId);

        return reply.status(204).send();
      } catch (error: any) {
        request.log.error({ error }, 'Failed to delete asset');
        return reply.status(500).send({
          error: 'Failed to delete asset',
          message: error.message || 'Unknown error',
        });
      }
    }
  );

  // Verify route registration
  try {
    const registeredRoutes = fastify.printRoutes();
    const assetsRoutes = registeredRoutes.split('\n').filter(line => 
      line.toLowerCase().includes('assets') && 
      (line.includes('insights') || line.includes('/assets'))
    );
    
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
        fastify.log.info({ routes: assetsRoutes.slice(0, 10) }, 'Registered assets routes');
      }
    } else {
      fastify.log.warn('⚠️ Multi-modal asset routes may not be registered correctly');
      fastify.log.warn({ routes: registeredRoutes.split('\n').filter(line => line.includes('assets')).slice(0, 10) }, 'Available routes containing "assets"');
      fastify.log.warn({ routes: registeredRoutes.split('\n').filter(line => line.includes('insights')).slice(0, 20) }, 'Available routes containing "insights"');
    }
  } catch (err) {
    fastify.log.error({ err }, '❌ Error verifying routes via printRoutes()');
  }
  
  fastify.log.info('✅ Multi-modal asset routes registration completed');
}

/**
 * Validate that the asset type matches the MIME type
 */
function validateAssetType(assetType: AssetType, mimeType: string): { valid: boolean; message?: string } {
  const mimeTypeMap: Record<AssetType, string[]> = {
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

