import type { FastifyInstance } from 'fastify';
import { OAuthController } from '../controllers/oauth.controller.js';
import type {
  OAuthCallbackQuery,
  OAuthInitiateQuery,
} from '../controllers/oauth.controller.js';
import {
  initiateGoogleOAuthSchema,
  googleCallbackSchema,
  initiateGithubOAuthSchema,
  githubCallbackSchema,
  initiateMicrosoftOAuthSchema,
  microsoftCallbackSchema,
} from '../schemas/oauth.schemas.js';

export async function registerOAuthRoutes(server: FastifyInstance): Promise<void> {
  const oauthController = (server as FastifyInstance & { oauthController?: OAuthController })
    .oauthController;

  if (!oauthController) {
    throw new Error('OAuthController not found on server instance');
  }

  // Google OAuth
  server.get<{ Querystring: OAuthInitiateQuery }>(
    '/auth/google',
    { schema: initiateGoogleOAuthSchema },
    (request, reply) => oauthController.initiateGoogle(request, reply)
  );

  server.get<{ Querystring: OAuthCallbackQuery }>(
    '/auth/google/callback',
    { schema: googleCallbackSchema },
    (request, reply) => oauthController.handleGoogleCallback(request, reply)
  );

  // GitHub OAuth
  server.get<{ Querystring: OAuthInitiateQuery }>(
    '/auth/github',
    { schema: initiateGithubOAuthSchema },
    (request, reply) => oauthController.initiateGitHub(request, reply)
  );

  server.get<{ Querystring: OAuthCallbackQuery }>(
    '/auth/github/callback',
    { schema: githubCallbackSchema },
    (request, reply) => oauthController.handleGitHubCallback(request, reply)
  );

  // Microsoft OAuth
  server.get<{ Querystring: OAuthInitiateQuery }>(
    '/auth/microsoft',
    { schema: initiateMicrosoftOAuthSchema },
    (request, reply) => oauthController.initiateMicrosoft(request, reply)
  );

  server.get<{ Querystring: OAuthCallbackQuery }>(
    '/auth/microsoft/callback',
    { schema: microsoftCallbackSchema },
    (request, reply) => oauthController.handleMicrosoftCallback(request, reply)
  );

  server.log.info('OAuth routes registered');
}
