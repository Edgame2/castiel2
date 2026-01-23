// OAuth 2.0 configuration and utilities
import { env } from '@/lib/env'

export interface OAuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

const normalizeBaseUrl = (value?: string | null): string | null => {
  if (!value) return null
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const resolvedBaseUrl = normalizeBaseUrl(env.NEXT_PUBLIC_API_BASE_URL)

if (!resolvedBaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_API_BASE_URL for OAuth')
}

export const oAuthConfig = {
  baseUrl: resolvedBaseUrl,
  authorizationEndpoint: `${resolvedBaseUrl}/oauth2/authorize`,
  tokenEndpoint: `${resolvedBaseUrl}/oauth2/token`,
  revokeEndpoint: `${resolvedBaseUrl}/oauth2/revoke`,
  userInfoEndpoint: `${resolvedBaseUrl}/oauth2/userinfo`,
  clientId: env.NEXT_PUBLIC_OAUTH_CLIENT_ID || '',
  redirectUri: env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || '',
  scope: env.NEXT_PUBLIC_OAUTH_SCOPE || 'openid profile email',
}

export interface AuthorizationUrlOptions {
  state: string
  codeChallenge?: string
  codeChallengeMethod?: 'plain' | 'S256'
  scopeOverride?: string
}

/**
 * Generate OAuth authorization URL with optional PKCE parameters
 */
export function buildAuthorizationUrl(options: AuthorizationUrlOptions): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: oAuthConfig.clientId,
    redirect_uri: oAuthConfig.redirectUri,
    scope: options.scopeOverride ?? oAuthConfig.scope,
    state: options.state,
  })

  if (options.codeChallenge) {
    params.set('code_challenge', options.codeChallenge)
    params.set('code_challenge_method', options.codeChallengeMethod ?? 'S256')
  }

  return `${oAuthConfig.authorizationEndpoint}?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier?: string
): Promise<OAuthTokenResponse> {
  const payload: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    client_id: oAuthConfig.clientId,
    redirect_uri: oAuthConfig.redirectUri,
  }

  if (codeVerifier) {
    payload.code_verifier = codeVerifier
  }

  const response = await fetch(oAuthConfig.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const response = await fetch(oAuthConfig.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: oAuthConfig.clientId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get user information from access token
 */
export async function getUserInfo(accessToken: string): Promise<unknown> {
  const response = await fetch(oAuthConfig.userInfoEndpoint, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`)
  }

  return response.json()
}
