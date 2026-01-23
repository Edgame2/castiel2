/**
 * Magic Link Routes
 *
 * Routes for passwordless authentication via magic links
 */
import { requestMagicLinkSchema, verifyMagicLinkSchema, } from '../schemas/magic-link.schemas.js';
export async function registerMagicLinkRoutes(server) {
    const magicLinkController = server
        .magicLinkController;
    if (!magicLinkController) {
        throw new Error('MagicLinkController not found on server instance');
    }
    // Request magic link (public endpoint)
    server.post('/auth/magic-link/request', { schema: requestMagicLinkSchema }, (request, reply) => magicLinkController.requestMagicLink(request, reply));
    // Verify magic link (public endpoint)
    server.get('/auth/magic-link/verify/:token', { schema: verifyMagicLinkSchema }, (request, reply) => magicLinkController.verifyMagicLink(request, reply));
    server.log.info('Magic link routes registered');
}
//# sourceMappingURL=magic-link.routes.js.map