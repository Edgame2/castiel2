import { initiateGoogleOAuthSchema, googleCallbackSchema, initiateGithubOAuthSchema, githubCallbackSchema, initiateMicrosoftOAuthSchema, microsoftCallbackSchema, } from '../schemas/oauth.schemas.js';
export async function registerOAuthRoutes(server) {
    const oauthController = server
        .oauthController;
    if (!oauthController) {
        throw new Error('OAuthController not found on server instance');
    }
    // Google OAuth
    server.get('/auth/google', { schema: initiateGoogleOAuthSchema }, (request, reply) => oauthController.initiateGoogle(request, reply));
    server.get('/auth/google/callback', { schema: googleCallbackSchema }, (request, reply) => oauthController.handleGoogleCallback(request, reply));
    // GitHub OAuth
    server.get('/auth/github', { schema: initiateGithubOAuthSchema }, (request, reply) => oauthController.initiateGitHub(request, reply));
    server.get('/auth/github/callback', { schema: githubCallbackSchema }, (request, reply) => oauthController.handleGitHubCallback(request, reply));
    // Microsoft OAuth
    server.get('/auth/microsoft', { schema: initiateMicrosoftOAuthSchema }, (request, reply) => oauthController.initiateMicrosoft(request, reply));
    server.get('/auth/microsoft/callback', { schema: microsoftCallbackSchema }, (request, reply) => oauthController.handleMicrosoftCallback(request, reply));
    server.log.info('OAuth routes registered');
}
//# sourceMappingURL=oauth.routes.js.map