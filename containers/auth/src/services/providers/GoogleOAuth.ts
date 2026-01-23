import { FastifyOAuth2Options } from '@fastify/oauth2';
import { FastifyInstance } from 'fastify';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function setupGoogleOAuth(fastify: FastifyInstance, config: GoogleOAuthConfig): void {
  const oauth2Options: FastifyOAuth2Options = {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: config.clientId,
        secret: config.clientSecret,
      },
      auth: {
        authorizeHost: 'https://accounts.google.com',
        authorizePath: '/o/oauth2/v2/auth',
        tokenHost: 'https://www.googleapis.com',
        tokenPath: '/oauth2/v4/token',
      },
    },
    startRedirectPath: '/api/v1/auth/google',
    callbackUri: config.redirectUri,
    scope: ['openid', 'profile', 'email'],
  };

  fastify.register(require('@fastify/oauth2'), oauth2Options);
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google');
  }

  return await response.json() as GoogleUserInfo;
}
