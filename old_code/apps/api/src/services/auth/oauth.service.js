import crypto from 'crypto';
import axios from 'axios';
/**
 * OAuth service for handling Google, GitHub, and Microsoft OAuth flows
 * - State management in Redis for CSRF protection
 * - Token exchange with OAuth providers
 * - User info retrieval
 */
export class OAuthService {
    redis;
    googleConfig;
    githubConfig;
    microsoftConfig;
    STATE_TTL = 600; // 10 minutes
    STATE_PREFIX = 'oauth:state:';
    constructor(redis, googleConfig, githubConfig, microsoftConfig) {
        this.redis = redis;
        this.googleConfig = googleConfig;
        this.githubConfig = githubConfig;
        this.microsoftConfig = microsoftConfig;
    }
    /**
     * Generate OAuth state and store in Redis
     */
    async createState(provider, tenantId, redirectUrl) {
        const state = crypto.randomBytes(32).toString('hex');
        const stateData = {
            provider,
            tenantId,
            redirectUrl,
            createdAt: Date.now(),
        };
        await this.redis.setex(`${this.STATE_PREFIX}${state}`, this.STATE_TTL, JSON.stringify(stateData));
        return state;
    }
    /**
     * Validate and retrieve OAuth state from Redis
     */
    async validateState(state) {
        const key = `${this.STATE_PREFIX}${state}`;
        const stateJson = await this.redis.get(key);
        if (!stateJson) {
            return null;
        }
        // Delete state to prevent reuse
        await this.redis.del(key);
        try {
            const stateData = JSON.parse(stateJson);
            // Check if state is expired (10 minutes)
            const age = Date.now() - stateData.createdAt;
            if (age > this.STATE_TTL * 1000) {
                return null;
            }
            return stateData;
        }
        catch {
            return null;
        }
    }
    /**
     * Get config for provider
     */
    getConfig(provider) {
        switch (provider) {
            case 'google':
                return this.googleConfig;
            case 'github':
                return this.githubConfig;
            case 'microsoft':
                if (!this.microsoftConfig) {
                    throw new Error('Microsoft OAuth is not configured');
                }
                return this.microsoftConfig;
            default:
                throw new Error(`Unknown OAuth provider: ${provider}`);
        }
    }
    /**
     * Build authorization URL for OAuth provider
     */
    buildAuthorizationUrl(provider, state, scope) {
        const config = this.getConfig(provider);
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            state,
            scope: scope || config.scope,
        });
        // Google requires access_type=offline for refresh token
        if (provider === 'google') {
            params.append('access_type', 'offline');
            params.append('prompt', 'consent');
        }
        // Microsoft-specific parameters
        if (provider === 'microsoft') {
            params.append('response_mode', 'query');
        }
        return `${config.authorizationUrl}?${params.toString()}`;
    }
    /**
     * Exchange authorization code for access token
     */
    async exchangeCode(provider, code) {
        const config = this.getConfig(provider);
        try {
            const response = await axios.post(config.tokenUrl, {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code',
            }, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`);
            }
            throw error;
        }
    }
    /**
     * Get user information from OAuth provider
     */
    async getUserInfo(provider, accessToken) {
        const config = this.getConfig(provider);
        try {
            const response = await axios.get(config.userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });
            switch (provider) {
                case 'google':
                    return this.parseGoogleUserInfo(response.data);
                case 'github':
                    return await this.parseGithubUserInfo(response.data, accessToken);
                case 'microsoft':
                    return this.parseMicrosoftUserInfo(response.data);
                default:
                    throw new Error(`Unknown OAuth provider: ${provider}`);
            }
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to get user info: ${error.response?.data?.error_description || error.message}`);
            }
            throw error;
        }
    }
    /**
     * Parse Google user info response
     */
    parseGoogleUserInfo(data) {
        return {
            id: data.sub || data.id,
            email: data.email,
            emailVerified: data.email_verified ?? false,
            name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
            firstName: data.given_name,
            lastName: data.family_name,
            avatarUrl: data.picture,
            provider: 'google',
        };
    }
    /**
     * Parse GitHub user info response
     * GitHub requires separate API call for email
     */
    async parseGithubUserInfo(data, accessToken) {
        let email = data.email;
        let emailVerified = false;
        // If email is not public, fetch from emails endpoint
        if (!email) {
            try {
                const emailResponse = await axios.get('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                    },
                });
                const primaryEmail = emailResponse.data.find((e) => e.primary && e.verified);
                if (primaryEmail) {
                    email = primaryEmail.email;
                    emailVerified = primaryEmail.verified;
                }
            }
            catch {
                // If we can't get email, throw error as email is required
                throw new Error('GitHub user email is not available');
            }
        }
        return {
            id: String(data.id),
            email,
            emailVerified,
            name: data.name || data.login,
            firstName: data.name?.split(' ')[0],
            lastName: data.name?.split(' ').slice(1).join(' '),
            avatarUrl: data.avatar_url,
            provider: 'github',
        };
    }
    /**
     * Parse Microsoft user info response (Microsoft Graph API)
     */
    parseMicrosoftUserInfo(data) {
        return {
            id: data.id,
            email: data.mail || data.userPrincipalName,
            emailVerified: true, // Microsoft verifies emails
            name: data.displayName || `${data.givenName || ''} ${data.surname || ''}`.trim(),
            firstName: data.givenName,
            lastName: data.surname,
            avatarUrl: undefined, // Microsoft Graph requires separate call for photo
            provider: 'microsoft',
        };
    }
    /**
     * Check if OAuth service is ready for a specific provider
     */
    isReady(provider) {
        try {
            const config = this.getConfig(provider);
            return !!(config.clientId &&
                config.clientSecret &&
                config.redirectUri &&
                config.authorizationUrl &&
                config.tokenUrl &&
                config.userInfoUrl);
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=oauth.service.js.map