/**
 * Multi-Modal Assets API Routes
 * Endpoints for uploading and managing images, audio, video, and documents for AI insights
 */
import { FastifyInstance } from 'fastify';
import { MultimodalAssetService } from '../services/multimodal-asset.service.js';
/**
 * Register multi-modal asset routes
 */
export declare function multimodalAssetsRoutes(fastify: FastifyInstance, options: {
    multimodalAssetService?: MultimodalAssetService;
    authenticate?: any;
    tokenValidationCache?: any;
}): Promise<void>;
//# sourceMappingURL=multimodal-assets.routes.d.ts.map