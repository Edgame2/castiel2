/**
 * Secret Management Client
 * 
 * HTTP client for communicating with the Secret Management Service.
 * Handles service-to-service authentication and SSO secret operations.
 */

import { log } from '../utils/logger';
import { loadConfig } from '../config';

/**
 * SSO Credentials interface
 */
export interface SSOCredentials {
  // For SAML
  certificate?: string;
  privateKey?: string;
  
  // For Azure AD
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  
  // For Okta
  oktaDomain?: string;
  apiToken?: string;
}

/**
 * Create SSO Secret Request
 */
export interface CreateSSOSecretRequest {
  organizationId: string;
  provider: 'azure_ad' | 'okta';
  credentials: SSOCredentials;
}

/**
 * Create SSO Secret Response
 */
export interface CreateSSOSecretResponse {
  secretId: string;
  organizationId: string;
  provider: string;
  createdAt: string;
}

/**
 * Get SSO Secret Response
 */
export interface GetSSOSecretResponse {
  secretId: string;
  organizationId: string;
  provider: string;
  credentials: SSOCredentials;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update SSO Secret Request
 */
export interface UpdateSSOSecretRequest {
  credentials?: SSOCredentials;
  metadata?: Record<string, any>;
}

/**
 * Rotate SSO Certificate Request
 */
export interface RotateSSOCertificateRequest {
  newCertificate: string;
  newPrivateKey?: string;
  gracePeriodHours?: number;
}

/**
 * Rotate SSO Certificate Response
 */
export interface RotateSSOCertificateResponse {
  secretId: string;
  rotatedAt: string;
  gracePeriodEndsAt?: string;
}

/**
 * Certificate Expiration Response
 */
export interface CertificateExpirationResponse {
  expiresAt?: string;
  daysUntilExpiration?: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

/**
 * Secret Management Client
 */
export class SecretManagementClient {
  private baseUrl: string;
  private serviceToken: string;
  private requestingService: string;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.services?.secret_management?.url || process.env.SECRET_MANAGEMENT_SERVICE_URL || 'http://localhost:3003';
    this.serviceToken = process.env.SERVICE_AUTH_TOKEN || '';
    this.requestingService = 'auth-service';
  }

  /**
   * Get service authentication headers
   */
  private getAuthHeaders(organizationId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Service-Token': this.serviceToken,
      'X-Requesting-Service': this.requestingService,
    };

    if (organizationId) {
      headers['X-Organization-Id'] = organizationId;
    }

    return headers;
  }

  /**
   * Create SSO secret
   */
  async createSSOSecret(request: CreateSSOSecretRequest): Promise<CreateSSOSecretResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/secrets/sso`, {
        method: 'POST',
        headers: this.getAuthHeaders(request.organizationId),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create SSO secret: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      log.error('Failed to create SSO secret', error, {
        organizationId: request.organizationId,
        provider: request.provider,
        service: 'auth',
      });
      throw error;
    }
  }

  /**
   * Get SSO secret
   */
  async getSSOSecret(secretId: string, organizationId: string): Promise<GetSSOSecretResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/secrets/sso/${secretId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(organizationId),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get SSO secret: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      log.error('Failed to get SSO secret', error, {
        secretId,
        organizationId,
        service: 'auth',
      });
      throw error;
    }
  }

  /**
   * Update SSO secret
   */
  async updateSSOSecret(
    secretId: string,
    organizationId: string,
    request: UpdateSSOSecretRequest
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/secrets/sso/${secretId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(organizationId),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update SSO secret: ${errorText}`);
      }
    } catch (error: any) {
      log.error('Failed to update SSO secret', error, {
        secretId,
        organizationId,
        service: 'auth',
      });
      throw error;
    }
  }

  /**
   * Delete SSO secret
   */
  async deleteSSOSecret(secretId: string, organizationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/secrets/sso/${secretId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(organizationId),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete SSO secret: ${errorText}`);
      }
    } catch (error: any) {
      log.error('Failed to delete SSO secret', error, {
        secretId,
        organizationId,
        service: 'auth',
      });
      throw error;
    }
  }

  /**
   * Rotate SSO certificate
   */
  async rotateSSOCertificate(
    secretId: string,
    request: RotateSSOCertificateRequest,
    organizationId: string
  ): Promise<RotateSSOCertificateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/secrets/sso/${secretId}/rotate`, {
        method: 'POST',
        headers: this.getAuthHeaders(organizationId),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to rotate SSO certificate: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      log.error('Failed to rotate SSO certificate', error, {
        secretId,
        organizationId,
        service: 'auth',
      });
      throw error;
    }
  }

  /**
   * Get certificate expiration
   */
  async getCertificateExpiration(
    secretId: string,
    organizationId?: string
  ): Promise<CertificateExpirationResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/secrets/sso/${secretId}/expiration`, {
        method: 'GET',
        headers: this.getAuthHeaders(organizationId),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error: any) {
      log.warn('Failed to get certificate expiration', error, {
        secretId,
        organizationId,
        service: 'auth',
      });
      return null;
    }
  }
}

// Singleton instance
let secretManagementClientInstance: SecretManagementClient | null = null;

/**
 * Get the Secret Management Client instance
 */
export function getSecretManagementClient(): SecretManagementClient {
  if (!secretManagementClientInstance) {
    secretManagementClientInstance = new SecretManagementClient();
  }
  return secretManagementClientInstance;
}

