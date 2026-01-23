import { FastifyOAuth2Options } from '@fastify/oauth2';
import { FastifyInstance } from 'fastify';

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function setupGitHubOAuth(fastify: FastifyInstance, config: GitHubOAuthConfig): void {
  const oauth2Options: FastifyOAuth2Options = {
    name: 'githubOAuth2',
    credentials: {
      client: {
        id: config.clientId,
        secret: config.clientSecret,
      },
      auth: {
        authorizeHost: 'https://github.com',
        authorizePath: '/login/oauth/authorize',
        tokenHost: 'https://github.com',
        tokenPath: '/login/oauth/access_token',
      },
    },
    startRedirectPath: '/api/v1/auth/oauth/github',
    callbackUri: config.redirectUri,
    scope: ['user:email'],
  };

  fastify.register(require('@fastify/oauth2'), oauth2Options);
}

export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
  blog?: string;
  location?: string;
}

export async function getGitHubUserInfo(accessToken: string): Promise<GitHubUserInfo> {
  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user info from GitHub');
  }

  const userData = await userResponse.json() as GitHubUserInfo;

  // Get email (may be private, so we need to fetch separately)
  if (!userData.email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (emailResponse.ok) {
      const emails = await emailResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primaryEmail = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0];
      if (primaryEmail) {
        userData.email = primaryEmail.email;
      }
    }
  }

  return userData;
}
