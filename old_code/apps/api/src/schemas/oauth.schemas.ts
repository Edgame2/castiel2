/**
 * Schemas for social OAuth routes
 */

const oauthInitiateQuery = {
  type: 'object',
  properties: {
    tenantId: {
      type: 'string',
      description: 'Tenant ID (optional, defaults to "default")',
    },
    redirectUrl: {
      type: 'string',
      format: 'uri',
      description: 'URL to redirect to after OAuth completes',
    },
  },
};

const oauthCallbackQuery = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    state: { type: 'string' },
    error: { type: 'string' },
    error_description: { type: 'string' },
  },
};

const oauthSuccessResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    expiresIn: { type: 'string' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        tenantId: { type: 'string' },
        status: { type: 'string' },
      },
    },
    isNewUser: { type: 'boolean' },
  },
};

const oauthErrorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

export const initiateGoogleOAuthSchema = {
  description: 'Initiate Google OAuth flow',
  tags: ['OAuth'],
  querystring: oauthInitiateQuery,
  response: {
    302: {
      description: 'Redirect to Google OAuth',
      type: 'null',
    },
    503: oauthErrorResponse,
  },
};

export const googleCallbackSchema = {
  description: 'Handle Google OAuth callback',
  tags: ['OAuth'],
  querystring: oauthCallbackQuery,
  response: {
    200: oauthSuccessResponse,
    302: {
      description: 'Redirect with tokens appended as query params',
      type: 'null',
    },
    400: oauthErrorResponse,
  },
};

export const initiateGithubOAuthSchema = {
  description: 'Initiate GitHub OAuth flow',
  tags: ['OAuth'],
  querystring: oauthInitiateQuery,
  response: {
    302: {
      description: 'Redirect to GitHub OAuth',
      type: 'null',
    },
    503: oauthErrorResponse,
  },
};

export const githubCallbackSchema = {
  description: 'Handle GitHub OAuth callback',
  tags: ['OAuth'],
  querystring: oauthCallbackQuery,
  response: {
    200: oauthSuccessResponse,
    302: {
      description: 'Redirect with tokens appended as query params',
      type: 'null',
    },
    400: oauthErrorResponse,
  },
};

export const initiateMicrosoftOAuthSchema = {
  description: 'Initiate Microsoft OAuth flow',
  tags: ['OAuth'],
  querystring: oauthInitiateQuery,
  response: {
    302: {
      description: 'Redirect to Microsoft OAuth',
      type: 'null',
    },
    503: oauthErrorResponse,
  },
};

export const microsoftCallbackSchema = {
  description: 'Handle Microsoft OAuth callback',
  tags: ['OAuth'],
  querystring: oauthCallbackQuery,
  response: {
    200: oauthSuccessResponse,
    302: {
      description: 'Redirect with tokens appended as query params',
      type: 'null',
    },
    400: oauthErrorResponse,
  },
};
