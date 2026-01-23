/**
 * Authentication Services Initialization
 * Initializes authentication-related services and routes
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { registerAuthRoutes } from '../../routes/auth.routes.js';
import { registerMFARoutes } from '../../routes/mfa.routes.js';
import { registerMagicLinkRoutes } from '../../routes/magic-link.routes.js';
import { registerSSORoutes } from '../../routes/sso.routes.js';
import { registerSSOConfigRoutes } from '../../routes/sso-config.routes.js';
import { registerAzureADB2CRoutes } from '../../routes/azure-ad-b2c.routes.js';
import { registerOAuthRoutes } from '../../routes/oauth.routes.js';
import { registerOAuth2Routes } from '../../routes/oauth2.routes.js';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';

/**
 * Register authentication routes
 */
export async function registerAuthRoutesGroup(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  const tracker = getRouteRegistrationTracker();

  // Core authentication routes
  if (server.authController) {
    await server.register(async (authServer) => {
      await registerAuthRoutes(authServer);
    }, { prefix: '/api/v1' });
    server.log.info('✅ Auth routes registered');
    tracker.record('Auth', true, { 
      prefix: '/api/v1',
      dependencies: ['authController', 'UserService', 'TenantService', 'Redis']
    });
  } else {
    server.log.warn('⚠️  Auth routes not registered - AuthController missing');
    tracker.record('Auth', false, { 
      prefix: '/api/v1',
      reason: 'AuthController missing',
      dependencies: ['authController']
    });
  }

  // MFA routes
  if (server.mfaController) {
    await server.register(async (mfaServer) => {
      await registerMFARoutes(mfaServer);
    }, { prefix: '/api/v1' });
    server.log.info('✅ MFA routes registered');
    tracker.record('MFA', true, { 
      prefix: '/api/v1',
      dependencies: ['mfaController', 'MFAService', 'Redis']
    });
  } else {
    server.log.warn('⚠️  MFA routes not registered - MFAController missing');
    tracker.record('MFA', false, { 
      prefix: '/api/v1',
      reason: 'MFAController missing',
      dependencies: ['mfaController']
    });
  }

  // Magic link routes
  if (server.magicLinkController) {
    await server.register(async (mlServer) => {
      await registerMagicLinkRoutes(mlServer);
    }, { prefix: '/api/v1' });
    server.log.info('✅ Magic link routes registered');
    tracker.record('Magic Link', true, { 
      prefix: '/api/v1',
      dependencies: ['magicLinkController', 'MagicLinkService', 'EmailService', 'Redis']
    });
  } else {
    server.log.warn('⚠️  Magic link routes not registered - MagicLinkController missing');
    tracker.record('Magic Link', false, { 
      prefix: '/api/v1',
      reason: 'MagicLinkController missing',
      dependencies: ['magicLinkController']
    });
  }

  // SSO/SAML routes
  if (server.ssoController) {
    await server.register(async (ssoServer) => {
      await registerSSORoutes(ssoServer);
    }, { prefix: '/api/v1' });
    server.log.info('✅ SSO routes registered');
    tracker.record('SSO', true, { 
      prefix: '/api/v1',
      dependencies: ['ssoController', 'SAMLService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  SSO routes not registered - SSOController missing');
    tracker.record('SSO', false, { 
      prefix: '/api/v1',
      reason: 'SSOController missing',
      dependencies: ['ssoController']
    });
  }

  // SSO Configuration routes
  if (server.ssoConfigController) {
    await server.register(async (ssoConfigServer) => {
      registerSSOConfigRoutes(ssoConfigServer, server.ssoConfigController);
    }, { prefix: '/api/v1' });
    server.log.info('✅ SSO config routes registered');
    tracker.record('SSO Config', true, { 
      prefix: '/api/v1',
      dependencies: ['ssoConfigController', 'SSOConfigService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  SSO config routes not registered - SSOConfigController missing');
    tracker.record('SSO Config', false, { 
      prefix: '/api/v1',
      reason: 'SSOConfigController missing',
      dependencies: ['ssoConfigController']
    });
  }

  // Azure AD B2C routes
  if (server.azureADB2CController) {
    await server.register(async (b2cServer) => {
      registerAzureADB2CRoutes(b2cServer, server.azureADB2CController);
    }, { prefix: '/api/v1' });
    server.log.info('✅ Azure AD B2C routes registered');
    tracker.record('Azure AD B2C', true, { 
      prefix: '/api/v1',
      dependencies: ['azureADB2CController', 'AzureADB2CService']
    });
  } else {
    server.log.warn('⚠️  Azure AD B2C routes not registered - AzureADB2CController missing');
    tracker.record('Azure AD B2C', false, { 
      prefix: '/api/v1',
      reason: 'AzureADB2CController missing',
      dependencies: ['azureADB2CController']
    });
  }

  // OAuth routes
  if (server.oauthController) {
    await server.register(async (oauthServer) => {
      await registerOAuthRoutes(oauthServer);
    }, { prefix: '/api/v1' });
    server.log.info('✅ OAuth routes registered');
    tracker.record('OAuth', true, { 
      prefix: '/api/v1',
      dependencies: ['oauthController', 'OAuthService']
    });
  } else {
    server.log.warn('⚠️  OAuth routes not registered - OAuthController missing');
    tracker.record('OAuth', false, { 
      prefix: '/api/v1',
      reason: 'OAuthController missing',
      dependencies: ['oauthController']
    });
  }

  // OAuth2 routes
  if (server.oauth2Controller) {
    await server.register(async (oauth2Server) => {
      await registerOAuth2Routes(oauth2Server);
    }, { prefix: '/api/v1' });
    server.log.info('✅ OAuth2 routes registered');
    tracker.record('OAuth2', true, { 
      prefix: '/api/v1',
      dependencies: ['oauth2Controller', 'OAuth2AuthService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  OAuth2 routes not registered - OAuth2Controller missing');
    tracker.record('OAuth2', false, { 
      prefix: '/api/v1',
      reason: 'OAuth2Controller missing',
      dependencies: ['oauth2Controller']
    });
  }
}
