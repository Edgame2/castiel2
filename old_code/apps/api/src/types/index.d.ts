import type { FastifyRequest } from 'fastify';
export * from './proactive-insights.types.js';
/**
 * User information from JWT token
 */
export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    tenantId: string;
    provider?: string;
    claims?: Record<string, any>;
}
/**
 * Extended FastifyRequest with user information
 */
export type AuthenticatedRequest = FastifyRequest & {
    user?: AuthUser;
};
/**
 * Service configuration
 */
export interface ServiceConfig {
    port: number;
    host: string;
    nodeEnv: 'development' | 'staging' | 'production';
    logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    azureB2C: {
        tenantName: string;
        tenantId: string;
        clientId: string;
        clientSecret: string;
        domain: string;
        customDomain?: string;
        policies: {
            signUpSignIn: string;
            passwordReset: string;
            profileEdit: string;
        };
    };
    redis: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        tls: boolean;
        db: number;
    };
    cosmosDb: {
        endpoint: string;
        key: string;
        database: string;
        usersContainer: string;
        tenantsContainer?: string;
        ssoConfigsContainer?: string;
        oauth2ClientsContainer?: string;
    };
    jwt: {
        secret: string;
        accessTokenExpiry: string;
        refreshTokenExpiry: string;
    };
    oauth: {
        google: {
            clientId: string;
            clientSecret: string;
        };
        github: {
            clientId: string;
            clientSecret: string;
        };
    };
    monitoring: {
        enabled: boolean;
        provider: 'applicationInsights' | 'mock';
        instrumentationKey?: string;
        samplingRate: number;
    };
    resend: {
        apiKey: string;
        fromEmail: string;
    };
    urls: {
        authBroker: string;
        redirectUri: string;
        frontend: string;
    };
}
/**
 * User session stored in Redis
 */
/**
 * Device information for session
 */
export interface SessionDeviceInfo {
    userAgent: string;
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    device?: string;
    isMobile: boolean;
}
/**
 * Location information for session
 */
export interface SessionLocationInfo {
    ip: string;
    country?: string;
    region?: string;
    city?: string;
}
export interface UserSession {
    sessionId: string;
    userId: string;
    tenantId: string;
    email: string;
    name?: string;
    provider: string;
    createdAt: number;
    lastActivityAt: number;
    expiresAt: number;
    deviceInfo?: SessionDeviceInfo;
    locationInfo?: SessionLocationInfo;
    metadata?: Record<string, any>;
}
/**
 * Refresh token data stored in Redis
 */
export interface RefreshTokenData {
    tokenId: string;
    userId: string;
    tenantId: string;
    familyId: string;
    createdAt: number;
    expiresAt: number;
    rotationCount: number;
    lastUsedAt?: number;
}
/**
 * Login request body
 */
export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}
/**
 * Register request body
 */
export interface RegisterRequest {
    email: string;
    password: string;
    givenName: string;
    surname: string;
    displayName?: string;
    tenantId: string;
}
/**
 * Password reset request body
 */
export interface PasswordResetRequest {
    email: string;
}
/**
 * Password reset confirmation body
 */
export interface PasswordResetConfirmRequest {
    token: string;
    newPassword: string;
}
/**
 * Refresh token request body
 */
export interface RefreshTokenRequest {
    refreshToken: string;
}
/**
 * Token response
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    user: {
        id: string;
        email: string;
        name?: string;
        tenantId: string;
    };
}
/**
 * Error response
 */
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
    details?: any;
}
/**
 * Health check response
 */
export interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'error';
    service: string;
    version: string;
    timestamp: string;
    checks: {
        redis: 'ok' | 'error';
        cosmosDb: 'ok' | 'error';
    };
}
//# sourceMappingURL=index.d.ts.map