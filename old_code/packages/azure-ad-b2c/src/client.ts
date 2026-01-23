import { ConfidentialClientApplication, type Configuration, type AuthorizationUrlRequest, type AuthorizationCodeRequest, type RefreshTokenRequest as MsalRefreshTokenRequest } from '@azure/msal-node';
import type {
  AzureAdB2CConfig,
  B2CAuthenticationResult,
  AuthorizationRequest,
  TokenRequest,
  RefreshTokenRequest,
} from './types.js';
import { UserFlowType } from './types.js';

/**
 * Azure AD B2C Client for handling authentication flows
 */
export class AzureAdB2CClient {
  private confidentialClient: ConfidentialClientApplication;
  private config: AzureAdB2CConfig;

  constructor(config: AzureAdB2CConfig) {
    this.config = config;

    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        authority: this.getAuthority(config.policies.signUpSignIn),
        clientSecret: config.clientSecret,
        knownAuthorities: [config.domain],
      },
      system: {
        loggerOptions: {
          logLevel: process.env.NODE_ENV === 'development' ? 3 : 1, // Verbose in dev, Error in prod
          loggerCallback: (level, message) => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[MSAL][${level}] ${message}`);
            }
          },
          piiLoggingEnabled: false,
        },
      },
    };

    this.confidentialClient = new ConfidentialClientApplication(msalConfig);
  }

  /**
   * Get authorization URL for user flow
   */
  async getAuthorizationUrl(request: AuthorizationRequest): Promise<string> {
    const authRequest: AuthorizationUrlRequest = {
      scopes: request.scopes || ['openid', 'profile', 'email', 'offline_access'],
      redirectUri: request.redirectUri,
      authority: request.authority,
      state: request.state,
      nonce: request.nonce,
      loginHint: request.loginHint,
      domainHint: request.domainHint,
      prompt: request.prompt,
      extraQueryParameters: request.extraQueryParameters,
      responseMode: 'form_post',
    };

    return await this.confidentialClient.getAuthCodeUrl(authRequest);
  }

  /**
   * Exchange authorization code for tokens
   */
  async acquireTokenByCode(request: TokenRequest): Promise<B2CAuthenticationResult> {
    const tokenRequest: AuthorizationCodeRequest = {
      code: request.code,
      scopes: request.scopes || ['openid', 'profile', 'email', 'offline_access'],
      redirectUri: request.redirectUri,
      authority: request.authority,
    };

    const response = await this.confidentialClient.acquireTokenByCode(tokenRequest);

    if (!response) {
      throw new Error('Failed to acquire token');
    }

    // MSAL response may include refreshToken in the raw response but not in types
    const rawResponse = response as any;

    return {
      accessToken: response.accessToken,
      idToken: response.idToken,
      refreshToken: rawResponse.refreshToken || '',
      tokenType: response.tokenType || 'Bearer',
      expiresIn: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600,
      expiresOn: response.expiresOn || new Date(Date.now() + 3600 * 1000),
      scopes: response.scopes || [],
      account: {
        homeAccountId: response.account?.homeAccountId || '',
        environment: response.account?.environment || this.config.domain,
        tenantId: response.account?.tenantId || this.config.tenantId,
        username: response.account?.username || '',
        localAccountId: response.account?.localAccountId || '',
        name: response.account?.name,
        idTokenClaims: response.account?.idTokenClaims as any,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<B2CAuthenticationResult> {
    const refreshRequest: MsalRefreshTokenRequest = {
      refreshToken: request.refreshToken,
      scopes: request.scopes || ['openid', 'profile', 'email', 'offline_access'],
      authority: request.authority,
    };

    const response = await this.confidentialClient.acquireTokenByRefreshToken(refreshRequest);

    if (!response) {
      throw new Error('Failed to refresh token');
    }

    // MSAL response may include refreshToken in the raw response but not in types
    const rawResponse = response as any;

    return {
      accessToken: response.accessToken,
      idToken: response.idToken,
      refreshToken: rawResponse.refreshToken || request.refreshToken,
      tokenType: response.tokenType || 'Bearer',
      expiresIn: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600,
      expiresOn: response.expiresOn || new Date(Date.now() + 3600 * 1000),
      scopes: response.scopes || [],
      account: {
        homeAccountId: response.account?.homeAccountId || '',
        environment: response.account?.environment || this.config.domain,
        tenantId: response.account?.tenantId || this.config.tenantId,
        username: response.account?.username || '',
        localAccountId: response.account?.localAccountId || '',
        name: response.account?.name,
        idTokenClaims: response.account?.idTokenClaims as any,
      },
    };
  }

  /**
   * Get authority URL for a specific user flow
   */
  getAuthority(policyName: string): string {
    const domain = this.config.customDomain || this.config.domain;
    return `https://${domain}/${this.config.tenantName}.onmicrosoft.com/${policyName}`;
  }

  /**
   * Get authority for user flow type
   */
  getAuthorityForFlow(flowType: UserFlowType): string {
    switch (flowType) {
      case UserFlowType.SignUpSignIn:
        return this.getAuthority(this.config.policies.signUpSignIn);
      case UserFlowType.PasswordReset:
        return this.getAuthority(this.config.policies.passwordReset);
      case UserFlowType.ProfileEdit:
        return this.getAuthority(this.config.policies.profileEdit);
      default:
        return this.getAuthority(this.config.policies.signUpSignIn);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): AzureAdB2CConfig {
    return { ...this.config };
  }

  /**
   * Build login URL for sign-up/sign-in flow
   */
  async buildLoginUrl(redirectUri: string, state?: string, loginHint?: string): Promise<string> {
    return this.getAuthorizationUrl({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      authority: this.getAuthorityForFlow(UserFlowType.SignUpSignIn),
      state,
      loginHint,
      prompt: 'login',
    });
  }

  /**
   * Build password reset URL
   */
  async buildPasswordResetUrl(redirectUri: string, state?: string): Promise<string> {
    return this.getAuthorizationUrl({
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      authority: this.getAuthorityForFlow(UserFlowType.PasswordReset),
      state,
    });
  }

  /**
   * Build profile edit URL
   */
  async buildProfileEditUrl(redirectUri: string, state?: string, loginHint?: string): Promise<string> {
    return this.getAuthorizationUrl({
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      authority: this.getAuthorityForFlow(UserFlowType.ProfileEdit),
      state,
      loginHint,
    });
  }

  /**
   * Build OAuth provider login URL (Google, GitHub)
   */
  async buildOAuthLoginUrl(
    provider: 'google' | 'github',
    redirectUri: string,
    state?: string
  ): Promise<string> {
    return this.getAuthorizationUrl({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      authority: this.getAuthorityForFlow(UserFlowType.SignUpSignIn),
      state,
      domainHint: provider,
      prompt: 'select_account',
    });
  }

  /**
   * Build SSO login URL for organization
   */
  async buildSsoLoginUrl(
    organizationId: string,
    redirectUri: string,
    state?: string
  ): Promise<string> {
    return this.getAuthorizationUrl({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      authority: this.getAuthorityForFlow(UserFlowType.SignUpSignIn),
      state,
      extraQueryParameters: {
        organization: organizationId,
      },
      prompt: 'login',
    });
  }
}
