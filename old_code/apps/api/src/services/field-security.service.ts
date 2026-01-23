import { IMonitoringProvider } from '@castiel/monitoring';
import {
  FieldSecurityConfig,
  FieldSecurityContext,
  FieldSecurityCheckResult,
  FieldSecurityAuditEntry,
  SecuredShardData,
  ShardTypeSecurityConfig,
  SecurityLevel,
  PIICategory,
  ExportSecurityPolicy,
  MASK_PATTERNS,
  FIELD_SECURITY_PRESETS,
} from '../types/field-security.types.js';
import { Shard } from '../types/shard.types.js';
import { ShardType } from '../types/shard-type.types.js';

/**
 * Field Security Service
 * Handles per-field access control, encryption, and masking
 */
export class FieldSecurityService {
  private monitoring: IMonitoringProvider;
  
  // Cache for ShardType security configs
  private securityConfigCache: Map<string, ShardTypeSecurityConfig> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Apply field security to shard data for read operations
   */
  async secureShardForRead(
    shard: Shard,
    shardType: ShardType,
    context: FieldSecurityContext
  ): Promise<SecuredShardData> {
    const securityConfig = this.getSecurityConfig(shardType);
    const result: SecuredShardData = {
      structuredData: { ...shard.structuredData },
      maskedFields: [],
      removedFields: [],
      decryptedFields: [],
      auditEntries: [],
    };

    if (!securityConfig || securityConfig.fieldSecurity.length === 0) {
      // No security config, return as-is
      return result;
    }

    // Process each secured field
    for (const fieldConfig of securityConfig.fieldSecurity) {
      const fieldValue = this.getNestedValue(result.structuredData, fieldConfig.field);
      
      if (fieldValue === undefined) {continue;}

      const checkResult = this.checkFieldAccess(fieldConfig, context);

      // Create audit entry if configured
      if (securityConfig.auditAllAccess || !checkResult.allowed || fieldConfig.securityLevel === SecurityLevel.RESTRICTED) {
        result.auditEntries.push(this.createAuditEntry(
          shard.id,
          fieldConfig,
          context,
          checkResult.allowed
        ));
      }

      if (!checkResult.allowed) {
        // Remove field entirely
        this.removeNestedValue(result.structuredData, fieldConfig.field);
        result.removedFields.push(fieldConfig.field);
      } else if (checkResult.wasMasked) {
        // Apply masking
        this.setNestedValue(result.structuredData, fieldConfig.field, checkResult.maskedValue);
        result.maskedFields.push(fieldConfig.field);
      }
      // If allowed and not masked, leave field as-is
    }

    this.monitoring.trackEvent('fieldSecurity.shardSecured', {
      shardId: shard.id,
      tenantId: context.tenantId,
      userId: context.userId,
      operation: context.operation,
      maskedFields: result.maskedFields.length,
      removedFields: result.removedFields.length,
    });

    return result;
  }

  /**
   * Validate field security for write operations
   */
  async validateFieldsForWrite(
    data: Record<string, any>,
    shardType: ShardType,
    context: FieldSecurityContext
  ): Promise<{
    valid: boolean;
    errors: Array<{ field: string; message: string }>;
    auditEntries: FieldSecurityAuditEntry[];
  }> {
    const securityConfig = this.getSecurityConfig(shardType);
    const errors: Array<{ field: string; message: string }> = [];
    const auditEntries: FieldSecurityAuditEntry[] = [];

    if (!securityConfig || securityConfig.fieldSecurity.length === 0) {
      return { valid: true, errors: [], auditEntries: [] };
    }

    for (const fieldConfig of securityConfig.fieldSecurity) {
      const fieldValue = this.getNestedValue(data, fieldConfig.field);
      
      if (fieldValue === undefined) {continue;}

      // Check write permission
      const hasWriteAccess = this.hasRoleAccess(fieldConfig.writeRoles, context.userRoles);

      if (!hasWriteAccess) {
        errors.push({
          field: fieldConfig.field,
          message: `Insufficient permissions to write field '${fieldConfig.field}'`,
        });

        auditEntries.push(this.createAuditEntry(
          '', // No shard ID yet for creates
          fieldConfig,
          { ...context, operation: 'write' },
          false,
          'Insufficient write permissions'
        ));
      }

      // Validate field format if rules exist
      if (fieldConfig.validationRules) {
        for (const rule of fieldConfig.validationRules) {
          const validationResult = this.validateFieldValue(fieldValue, rule);
          if (!validationResult.valid) {
            errors.push({
              field: fieldConfig.field,
              message: validationResult.message || rule.message,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      auditEntries,
    };
  }

  /**
   * Apply security policy for data export
   */
  async secureDataForExport(
    shards: Shard[],
    shardType: ShardType,
    context: FieldSecurityContext,
    policy: ExportSecurityPolicy
  ): Promise<{
    data: Record<string, any>[];
    summary: {
      totalShards: number;
      maskedFields: string[];
      excludedFields: string[];
    };
  }> {
    const securityConfig = this.getSecurityConfig(shardType);
    const maskedFields = new Set<string>();
    const excludedFields = new Set<string>();

    const securedData = await Promise.all(
      shards.map(async (shard) => {
        const secured = await this.secureShardForRead(
          shard,
          shardType,
          { ...context, operation: 'export' }
        );

        const exportData = { ...secured.structuredData };

        // Apply export policy
        if (securityConfig) {
          for (const fieldConfig of securityConfig.fieldSecurity) {
            const fieldValue = this.getNestedValue(exportData, fieldConfig.field);
            if (fieldValue === undefined) {continue;}

            // Exclude by security level
            if (policy.excludeSecurityLevels.includes(fieldConfig.securityLevel)) {
              this.removeNestedValue(exportData, fieldConfig.field);
              excludedFields.add(fieldConfig.field);
              continue;
            }

            // Handle PII
            if (fieldConfig.piiCategory) {
              if (!policy.includePII) {
                this.removeNestedValue(exportData, fieldConfig.field);
                excludedFields.add(fieldConfig.field);
                continue;
              }

              if (policy.maskAllPII || fieldConfig.maskInExport) {
                const maskedValue = this.maskValue(fieldValue, fieldConfig.maskPattern);
                this.setNestedValue(exportData, fieldConfig.field, maskedValue);
                maskedFields.add(fieldConfig.field);
              }
            }
          }
        }

        // Apply custom exclusions
        for (const field of policy.excludeFields) {
          this.removeNestedValue(exportData, field);
          excludedFields.add(field);
        }

        return exportData;
      })
    );

    return {
      data: securedData,
      summary: {
        totalShards: shards.length,
        maskedFields: Array.from(maskedFields),
        excludedFields: Array.from(excludedFields),
      },
    };
  }

  /**
   * Secure data for AI context (exclude sensitive fields)
   */
  async secureDataForAI(
    shard: Shard,
    shardType: ShardType,
    context: FieldSecurityContext
  ): Promise<Record<string, any>> {
    const securityConfig = this.getSecurityConfig(shardType);
    const data = { ...shard.structuredData };

    if (!securityConfig) {return data;}

    for (const fieldConfig of securityConfig.fieldSecurity) {
      if (fieldConfig.maskInAI) {
        this.removeNestedValue(data, fieldConfig.field);
      }
    }

    return data;
  }

  /**
   * Check field access and determine if masking is needed
   */
  checkFieldAccess(
    fieldConfig: FieldSecurityConfig,
    context: FieldSecurityContext
  ): FieldSecurityCheckResult {
    const operationRoles = context.operation === 'write' 
      ? fieldConfig.writeRoles 
      : fieldConfig.readRoles;

    const hasAccess = this.hasRoleAccess(operationRoles, context.userRoles);

    if (!hasAccess) {
      return {
        allowed: false,
        reason: `Role access denied for operation '${context.operation}'`,
        wasMasked: false,
        securityLevel: fieldConfig.securityLevel,
      };
    }

    // Check if masking is needed based on operation
    let shouldMask = false;
    switch (context.operation) {
      case 'log':
        shouldMask = fieldConfig.maskInLogs;
        break;
      case 'export':
        shouldMask = fieldConfig.maskInExport;
        break;
      case 'ai':
        shouldMask = fieldConfig.maskInAI;
        break;
      default:
        shouldMask = context.applyMasking && fieldConfig.securityLevel === SecurityLevel.RESTRICTED;
    }

    return {
      allowed: true,
      wasMasked: shouldMask,
      securityLevel: fieldConfig.securityLevel,
    };
  }

  /**
   * Mask a value using the specified pattern
   */
  maskValue(value: any, maskPattern?: string): any {
    if (value === null || value === undefined) {return value;}

    const stringValue = String(value);

    // Use built-in pattern if exists
    if (maskPattern && maskPattern in MASK_PATTERNS) {
      return (MASK_PATTERNS as any)[maskPattern](stringValue);
    }

    // Use custom pattern (regex replacement)
    if (maskPattern) {
      try {
        return stringValue.replace(new RegExp(maskPattern, 'g'), '*');
      } catch {
        // Invalid regex, fall back to partial mask
        return MASK_PATTERNS.PARTIAL(stringValue);
      }
    }

    // Default to partial mask
    return MASK_PATTERNS.PARTIAL(stringValue);
  }

  /**
   * Get security config for a ShardType
   */
  getSecurityConfig(shardType: ShardType): ShardTypeSecurityConfig | null {
    // Check cache
    const cached = this.securityConfigCache.get(shardType.id);
    if (cached) {return cached;}

    // Extract security config from ShardType
    const securityConfig = (shardType as any).securityConfig as ShardTypeSecurityConfig | undefined;
    
    if (securityConfig) {
      this.securityConfigCache.set(shardType.id, securityConfig);
      return securityConfig;
    }

    // Auto-detect PII fields if no explicit config
    const autoConfig = this.autoDetectSecurityConfig(shardType);
    if (autoConfig && autoConfig.fieldSecurity.length > 0) {
      this.securityConfigCache.set(shardType.id, autoConfig);
      return autoConfig;
    }

    return null;
  }

  /**
   * Auto-detect security requirements based on field names
   */
  private autoDetectSecurityConfig(shardType: ShardType): ShardTypeSecurityConfig {
    const fieldSecurity: FieldSecurityConfig[] = [];
    
    // Common field name patterns that indicate PII
    const piiPatterns: Array<{ pattern: RegExp; preset: keyof typeof FIELD_SECURITY_PRESETS }> = [
      { pattern: /email/i, preset: 'email' },
      { pattern: /phone|mobile|cell/i, preset: 'phone' },
      { pattern: /ssn|social.?security/i, preset: 'ssn' },
      { pattern: /credit.?card|card.?number/i, preset: 'creditCard' },
      { pattern: /address|street|city|zip|postal/i, preset: 'address' },
      { pattern: /salary|wage|compensation|income/i, preset: 'salary' },
      { pattern: /dob|date.?of.?birth|birthday/i, preset: 'dateOfBirth' },
      { pattern: /health|medical|diagnosis/i, preset: 'health' },
    ];

    // Extract field names from schema
    const fieldNames = this.extractFieldNames(shardType);

    for (const fieldName of fieldNames) {
      for (const { pattern, preset } of piiPatterns) {
        if (pattern.test(fieldName)) {
          const presetConfig = FIELD_SECURITY_PRESETS[preset];
          fieldSecurity.push({
            field: fieldName,
            readRoles: presetConfig.readRoles || ['user', 'admin'],
            writeRoles: presetConfig.writeRoles || ['user', 'admin'],
            encrypted: presetConfig.encrypted || false,
            piiCategory: presetConfig.piiCategory,
            securityLevel: presetConfig.securityLevel || SecurityLevel.INTERNAL,
            maskInLogs: presetConfig.maskInLogs || true,
            maskInExport: presetConfig.maskInExport || false,
            maskInAI: presetConfig.maskInAI || false,
            maskPattern: presetConfig.maskPattern,
            retentionDays: presetConfig.retentionDays,
          });
          break; // Only apply first matching pattern
        }
      }
    }

    return {
      defaultSecurityLevel: SecurityLevel.INTERNAL,
      fieldSecurity,
      auditAllAccess: false,
      encryptPIIByDefault: false,
    };
  }

  /**
   * Extract field names from ShardType schema
   */
  private extractFieldNames(shardType: ShardType): string[] {
    const fieldNames: string[] = [];
    const schema = shardType.schema;

    if ('fields' in schema && Array.isArray(schema.fields)) {
      // Rich schema format
      for (const field of schema.fields) {
        fieldNames.push(field.name);
      }
    } else if ('properties' in schema && schema.properties) {
      // JSON Schema format
      fieldNames.push(...Object.keys(schema.properties));
    } else if ('fields' in schema && typeof schema.fields === 'object') {
      // Legacy format
      fieldNames.push(...Object.keys(schema.fields));
    }

    return fieldNames;
  }

  /**
   * Validate a field value against a rule
   */
  private validateFieldValue(
    value: any,
    rule: { type: string; pattern?: string; format?: string; message: string }
  ): { valid: boolean; message?: string } {
    if (value === null || value === undefined) {
      return { valid: true };
    }

    const stringValue = String(value);

    switch (rule.type) {
      case 'regex':
        if (rule.pattern) {
          try {
            const regex = new RegExp(rule.pattern);
            if (!regex.test(stringValue)) {
              return { valid: false, message: rule.message };
            }
          } catch {
            return { valid: false, message: 'Invalid validation pattern' };
          }
        }
        break;

      case 'format':
        switch (rule.format) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
              return { valid: false, message: rule.message };
            }
            break;
          case 'phone':
            if (!/^\+?[\d\s\-()]+$/.test(stringValue)) {
              return { valid: false, message: rule.message };
            }
            break;
          case 'ssn':
            if (!/^\d{3}-?\d{2}-?\d{4}$/.test(stringValue)) {
              return { valid: false, message: rule.message };
            }
            break;
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Check if user has any of the required roles
   */
  private hasRoleAccess(requiredRoles: string[], userRoles: string[]): boolean {
    // Admin always has access
    if (userRoles.includes('admin') || userRoles.includes('superadmin')) {
      return true;
    }

    // Check for any matching role
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * Create an audit entry for field access
   */
  private createAuditEntry(
    shardId: string,
    fieldConfig: FieldSecurityConfig,
    context: FieldSecurityContext,
    allowed: boolean,
    reason?: string
  ): FieldSecurityAuditEntry {
    return {
      timestamp: new Date(),
      userId: context.userId,
      tenantId: context.tenantId,
      shardId,
      field: fieldConfig.field,
      operation: context.operation as any,
      allowed,
      reason,
      piiCategory: fieldConfig.piiCategory,
      securityLevel: fieldConfig.securityLevel,
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {return undefined;}
      current = current[part];
    }

    return current;
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Remove nested value from object using dot notation
   */
  private removeNestedValue(obj: Record<string, any>, path: string): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {return;}
      current = current[part];
    }

    delete current[parts[parts.length - 1]];
  }

  /**
   * Clear security config cache
   */
  clearCache(): void {
    this.securityConfigCache.clear();
  }

  /**
   * Clear cache for specific ShardType
   */
  clearCacheForShardType(shardTypeId: string): void {
    this.securityConfigCache.delete(shardTypeId);
  }
}
