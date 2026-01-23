/**
 * Import Service
 * 
 * Handles importing secrets from various formats (.env, JSON).
 */

import { SecretService } from '../SecretService';
import { CreateSecretParams, SecretContext, AnySecretValue } from '../../types';
import { ImportError } from '../../errors/SecretErrors';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ name: string; error: string }>;
}

export interface ImportSecretData {
  name: string;
  description?: string;
  type?: string;
  value: any;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class ImportService {
  private secretService: SecretService;
  private auditService: AuditService;
  
  constructor() {
    this.secretService = new SecretService();
    this.auditService = new AuditService();
  }
  
  /**
   * Import secrets from .env format
   */
  async importFromEnv(
    envContent: string,
    params: {
      scope: 'GLOBAL' | 'ORGANIZATION' | 'TEAM' | 'PROJECT' | 'USER';
      organizationId?: string;
      teamId?: string;
      projectId?: string;
      defaultType?: 'GENERIC' | 'API_KEY' | 'ENV_VARIABLE_SET';
    },
    context: SecretContext
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };
    
    // Parse .env format
    const lines = envContent.split('\n');
    const secrets: ImportSecretData[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) {
        continue;
      }
      
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      secrets.push({
        name: key,
        type: params.defaultType || 'GENERIC',
        value: {
          type: params.defaultType || 'GENERIC',
          value: value,
        } as AnySecretValue,
      });
    }
    
    // Import each secret
    for (const secretData of secrets) {
      try {
        await this.importSecret(secretData, params, context);
        result.imported++;
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          result.skipped++;
        } else {
          result.errors.push({
            name: secretData.name,
            error: error.message || String(error),
          });
        }
      }
    }
    
    // Publish import event
    await publishSecretEvent(
      SecretEvents.secretsImported({
        organizationId: params.organizationId,
        actorId: context.userId,
        importedCount: result.imported,
        skippedCount: result.skipped,
        format: 'env',
      })
    );
    
    // Log import
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secrets imported from .env',
      service: 'secret-management',
      metadata: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        organizationId: params.organizationId,
        userId: context.userId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRETS_IMPORTED',
      actorId: context.userId,
      organizationId: params.organizationId,
      action: 'Import secrets from .env',
      details: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        format: 'env',
      },
    });
    
    return result;
  }
  
  /**
   * Import secrets from JSON format
   */
  async importFromJson(
    jsonContent: string,
    params: {
      scope: 'GLOBAL' | 'ORGANIZATION' | 'TEAM' | 'PROJECT' | 'USER';
      organizationId?: string;
      teamId?: string;
      projectId?: string;
    },
    context: SecretContext
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };
    
    let secrets: ImportSecretData[];
    
    try {
      secrets = JSON.parse(jsonContent);
      
      // Handle both array and object formats
      if (!Array.isArray(secrets)) {
        if (typeof secrets === 'object') {
          // Convert object to array
          secrets = Object.entries(secrets).map(([name, value]) => ({
            name,
            type: 'GENERIC',
            value: {
              type: 'GENERIC',
              value: typeof value === 'string' ? value : JSON.stringify(value),
            } as AnySecretValue,
          }));
        } else {
          throw new ImportError('Invalid JSON format: expected array or object');
        }
      }
    } catch (error: any) {
      throw new ImportError(`Failed to parse JSON: ${error.message}`);
    }
    
    // Import each secret
    for (const secretData of secrets) {
      try {
        await this.importSecret(secretData, params, context);
        result.imported++;
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          result.skipped++;
        } else {
          result.errors.push({
            name: secretData.name || 'unknown',
            error: error.message || String(error),
          });
        }
      }
    }
    
    // Publish import event
    await publishSecretEvent(
      SecretEvents.secretsImported({
        organizationId: params.organizationId,
        actorId: context.userId,
        importedCount: result.imported,
        skippedCount: result.skipped,
        format: 'json',
      })
    );
    
    // Log import
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secrets imported from JSON',
      service: 'secret-management',
      metadata: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        organizationId: params.organizationId,
        userId: context.userId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRETS_IMPORTED',
      actorId: context.userId,
      organizationId: params.organizationId,
      action: 'Import secrets from JSON',
      details: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        format: 'json',
      },
    });
    
    return result;
  }
  
  /**
   * Import a single secret
   */
  private async importSecret(
    secretData: ImportSecretData,
    params: {
      scope: 'GLOBAL' | 'ORGANIZATION' | 'TEAM' | 'PROJECT' | 'USER';
      organizationId?: string;
      teamId?: string;
      projectId?: string;
    },
    context: SecretContext
  ): Promise<void> {
    const createParams: CreateSecretParams = {
      name: secretData.name,
      description: secretData.description,
      type: (secretData.type as any) || 'GENERIC',
      value: secretData.value as AnySecretValue,
      scope: params.scope,
      organizationId: params.organizationId,
      teamId: params.teamId,
      projectId: params.projectId,
      tags: secretData.tags,
      metadata: secretData.metadata,
    };
    
    await this.secretService.createSecret(createParams, context);
  }
}
