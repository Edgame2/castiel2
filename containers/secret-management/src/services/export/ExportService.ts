/**
 * Export Service
 * 
 * Handles exporting secrets to various formats (.env, JSON).
 */

import { SecretService } from '../SecretService';
import { ListSecretsParams, SecretContext, AnySecretValue } from '../../types';
import { ExportError } from '../../errors/SecretErrors';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export interface ExportResult {
  format: 'env' | 'json';
  data: string;
  secretCount: number;
  exportedAt: Date;
}

export class ExportService {
  private secretService: SecretService;
  private auditService: AuditService;
  
  constructor() {
    this.secretService = new SecretService();
    this.auditService = new AuditService();
  }
  
  /**
   * Export secrets to .env format
   */
  async exportToEnv(
    params: {
      scope?: 'GLOBAL' | 'ORGANIZATION' | 'TEAM' | 'PROJECT' | 'USER';
      organizationId?: string;
      teamId?: string;
      projectId?: string;
      includeValues: boolean;
    },
    context: SecretContext
  ): Promise<ExportResult> {
    // List secrets
    const listParams: ListSecretsParams = {
      scope: params.scope,
      organizationId: params.organizationId,
      teamId: params.teamId,
      projectId: params.projectId,
    };
    
    const secrets = await this.secretService.listSecrets(listParams, context);
    
    // Build .env content
    const lines: string[] = [];
    
    for (const secret of secrets) {
      if (params.includeValues) {
        try {
          const value = await this.secretService.getSecretValue(secret.id, context);
          const stringValue = this.valueToString(value);
          
          // Escape special characters
          const escapedValue = stringValue
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
          
          lines.push(`${secret.name}="${escapedValue}"`);
        } catch (error) {
          // Skip secrets we can't access
          lines.push(`# ${secret.name} - Access denied`);
        }
      } else {
        lines.push(`# ${secret.name} - Value not included`);
      }
    }
    
    const result = {
      format: 'env' as const,
      data: lines.join('\n'),
      secretCount: secrets.length,
      exportedAt: new Date(),
    };
    
    // Publish export event
    await publishSecretEvent(
      SecretEvents.secretsExported({
        organizationId: params.organizationId,
        actorId: context.userId,
        secretCount: secrets.length,
        format: 'env',
        includeValues: params.includeValues,
      })
    );
    
    // Log export (warn if values included)
    await getLoggingClient().sendLog({
      level: params.includeValues ? 'warn' : 'info',
      message: 'Secrets exported to .env',
      service: 'secret-management',
      metadata: {
        secretCount: secrets.length,
        includeValues: params.includeValues,
        organizationId: params.organizationId,
        userId: context.userId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRETS_EXPORTED',
      actorId: context.userId,
      organizationId: params.organizationId,
      action: 'Export secrets to .env',
      details: {
        secretCount: secrets.length,
        format: 'env',
        includeValues: params.includeValues,
      },
    });
    
    return result;
  }
  
  /**
   * Export secrets to JSON format
   */
  async exportToJson(
    params: {
      scope?: 'GLOBAL' | 'ORGANIZATION' | 'TEAM' | 'PROJECT' | 'USER';
      organizationId?: string;
      teamId?: string;
      projectId?: string;
      includeValues: boolean;
    },
    context: SecretContext
  ): Promise<ExportResult> {
    // List secrets
    const listParams: ListSecretsParams = {
      scope: params.scope,
      organizationId: params.organizationId,
      teamId: params.teamId,
      projectId: params.projectId,
    };
    
    const secrets = await this.secretService.listSecrets(listParams, context);
    
    // Build JSON structure
    const exportData: any[] = [];
    
    for (const secret of secrets) {
      const secretData: any = {
        name: secret.name,
        description: secret.description,
        type: secret.type,
        scope: secret.scope,
        tags: secret.tags,
        metadata: secret.metadata,
        createdAt: secret.createdAt.toISOString(),
      };
      
      if (params.includeValues) {
        try {
          const value = await this.secretService.getSecretValue(secret.id, context);
          secretData.value = value;
        } catch (error) {
          secretData.value = null;
          secretData.error = 'Access denied';
        }
      }
      
      exportData.push(secretData);
    }
    
    const result = {
      format: 'json' as const,
      data: JSON.stringify(exportData, null, 2),
      secretCount: secrets.length,
      exportedAt: new Date(),
    };
    
    // Publish export event
    await publishSecretEvent(
      SecretEvents.secretsExported({
        organizationId: params.organizationId,
        actorId: context.userId,
        secretCount: secrets.length,
        format: 'json',
        includeValues: params.includeValues,
      })
    );
    
    // Log export (warn if values included)
    await getLoggingClient().sendLog({
      level: params.includeValues ? 'warn' : 'info',
      message: 'Secrets exported to JSON',
      service: 'secret-management',
      metadata: {
        secretCount: secrets.length,
        includeValues: params.includeValues,
        organizationId: params.organizationId,
        userId: context.userId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRETS_EXPORTED',
      actorId: context.userId,
      organizationId: params.organizationId,
      action: 'Export secrets to JSON',
      details: {
        secretCount: secrets.length,
        format: 'json',
        includeValues: params.includeValues,
      },
    });
    
    return result;
  }
  
  /**
   * Convert secret value to string
   */
  private valueToString(value: AnySecretValue): string {
    switch (value.type) {
      case 'API_KEY':
        return (value as any).key;
      
      case 'USERNAME_PASSWORD':
        return JSON.stringify({
          username: (value as any).username,
          password: (value as any).password,
        });
      
      case 'OAUTH2_TOKEN':
        return JSON.stringify(value);
      
      case 'CERTIFICATE':
        return (value as any).certificate;
      
      case 'SSH_KEY':
        return (value as any).privateKey;
      
      case 'CONNECTION_STRING':
        return (value as any).connectionString;
      
      case 'JSON_CREDENTIAL':
        return JSON.stringify((value as any).credential);
      
      case 'ENV_VARIABLE_SET':
        return JSON.stringify((value as any).variables);
      
      case 'GENERIC':
        return (value as any).value;
      
      default:
        return JSON.stringify(value);
    }
  }
}
