/**
 * PII Redaction Service
 * Phase 3.1: Multiple Redaction Strategies
 * 
 * Applies various redaction strategies to detected PII based on configuration.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  DetectedPII,
  RedactionStrategy,
  RedactionResult,
  PIIType,
  ContextAwareRedactionOptions,
} from '../types/pii-detection.types.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class PIIRedactionService {
  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Apply redaction to text content based on detected PII
   * Phase 3.1: Enhanced with context-aware options support
   */
  applyRedaction(
    content: string,
    detectedPII: DetectedPII[],
    strategies: Record<PIIType, RedactionStrategy>,
    options?: ContextAwareRedactionOptions,
    modelName?: string
  ): RedactionResult {
    if (detectedPII.length === 0) {
      return {
        original: content,
        redacted: content,
        redactions: [],
        auditInfo: {
          redactedAt: new Date(),
          reason: 'No PII detected',
          method: 'none',
          preserveForAudit: options?.preserveForAudit || false,
          modelName,
        },
      };
    }

    // Phase 3.1: Filter PII that may be required for analysis
    const piiToRedact = options?.requiredForAnalysis
      ? detectedPII.filter(pii => !options.requiredForAnalysis!.includes(pii.type))
      : detectedPII;

    // Sort by start index (reverse to avoid index shifting issues)
    const sorted = [...piiToRedact].sort((a, b) => b.startIndex - a.startIndex);
    
    let redacted = content;
    const redactions: RedactionResult['redactions'] = [];
    const reversibleMapping = new Map<string, string>(); // Phase 3.1: For reversible redaction

    for (const pii of sorted) {
      // Phase 3.1: Check for model-specific strategy override
      let strategy = strategies[pii.type] || RedactionStrategy.MASKING;
      if (options?.modelSpecific && modelName && options.modelSpecific[modelName]) {
        strategy = options.modelSpecific[modelName];
      }

      // Phase 3.1: Use reversible tokenization if allowReversible is true
      if (options?.allowReversible && strategy === RedactionStrategy.TOKENIZATION) {
        const token = this.generateReversibleToken(pii.value, pii.type);
        reversibleMapping.set(token, pii.value);
        const redactedValue = `[${pii.type.toUpperCase()}_${token}]`;
        
        redacted = 
          redacted.substring(0, pii.startIndex) +
          redactedValue +
          redacted.substring(pii.endIndex);

        redactions.push({
          type: pii.type,
          originalValue: pii.value,
          redactedValue,
          strategy,
          startIndex: pii.startIndex,
          endIndex: pii.startIndex + redactedValue.length,
          fieldPath: pii.fieldPath,
          token,
        });
      } else {
        const redactedValue = this.applyStrategy(pii, strategy);
        
        // Replace in reverse order to maintain indices
        redacted = 
          redacted.substring(0, pii.startIndex) +
          redactedValue +
          redacted.substring(pii.endIndex);

        redactions.push({
          type: pii.type,
          originalValue: pii.value,
          redactedValue,
          strategy,
          startIndex: pii.startIndex,
          endIndex: pii.startIndex + redactedValue.length,
          fieldPath: pii.fieldPath,
        });
      }
    }

    return {
      original: content,
      redacted,
      redactions,
      auditInfo: {
        redactedAt: new Date(),
        reason: 'PII detected and redacted for AI context',
        method: 'automated',
        preserveForAudit: options?.preserveForAudit || false,
        modelName,
      },
      reversibleMapping: reversibleMapping.size > 0 ? reversibleMapping : undefined,
    };
  }

  /**
   * Apply redaction strategy to a PII value
   */
  private applyStrategy(pii: DetectedPII, strategy: RedactionStrategy): string {
    switch (strategy) {
      case RedactionStrategy.REMOVAL:
        return '[REDACTED]';
      
      case RedactionStrategy.MASKING:
        return this.maskValue(pii.type, pii.value);
      
      case RedactionStrategy.TOKENIZATION:
        return this.tokenizeValue(pii.type, pii.value);
      
      case RedactionStrategy.PSEUDONYMIZATION:
        return this.pseudonymizeValue(pii.type, pii.value);
      
      case RedactionStrategy.GENERALIZATION:
        return this.generalizeValue(pii.type, pii.value);
      
      default:
        return '[REDACTED]';
    }
  }

  /**
   * Mask a value (show partial information)
   */
  private maskValue(type: PIIType, value: string): string {
    switch (type) {
      case PIIType.EMAIL:
        // user@example.com -> u***@e***.com
        const [local, domain] = value.split('@');
        if (!domain) return '***@***';
        const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
        const [domainName, tld] = domain.split('.');
        const maskedDomain = domainName && domainName.length > 1 ? domainName[0] + '***' : '***';
        return `${maskedLocal}@${maskedDomain}${tld ? '.' + tld : ''}`;
      
      case PIIType.PHONE:
        // 123-456-7890 -> xxx-xxx-7890
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 4) {
          return 'xxx-xxx-' + digits.slice(-4);
        }
        return 'xxx-xxx-xxxx';
      
      case PIIType.SSN:
        // 123-45-6789 -> xxx-xx-6789
        const ssnDigits = value.replace(/\D/g, '');
        if (ssnDigits.length >= 4) {
          return 'xxx-xx-' + ssnDigits.slice(-4);
        }
        return 'xxx-xx-xxxx';
      
      case PIIType.CREDIT_CARD:
        // 1234-5678-9012-3456 -> xxxx-xxxx-xxxx-3456
        const cardDigits = value.replace(/\D/g, '');
        if (cardDigits.length >= 4) {
          return 'xxxx-xxxx-xxxx-' + cardDigits.slice(-4);
        }
        return 'xxxx-xxxx-xxxx-xxxx';
      
      case PIIType.IP_ADDRESS:
        // 192.168.1.1 -> 192.168.x.x
        const parts = value.split('.');
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.x.x`;
        }
        return 'x.x.x.x';
      
      default:
        // Generic masking: show first and last character
        if (value.length <= 2) {
          return '**';
        }
        return value[0] + '***' + value[value.length - 1];
    }
  }

  /**
   * Tokenize a value (replace with unique token)
   */
  private tokenizeValue(type: PIIType, value: string): string {
    // Generate a deterministic token based on type and value hash
    const hash = this.simpleHash(value);
    const token = `[${type.toUpperCase()}_${hash.toString(36).substring(0, 8)}]`;
    return token;
  }

  /**
   * Pseudonymize a value (replace with realistic but fake value)
   */
  private pseudonymizeValue(type: PIIType, value: string): string {
    switch (type) {
      case PIIType.NAME:
        // Replace with generic name
        const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'];
        const hash = this.simpleHash(value);
        return names[hash % names.length] + ' ' + names[(hash * 2) % names.length];
      
      case PIIType.EMAIL:
        // user@example.com -> pseudonym@example.com
        const [local] = value.split('@');
        const domain = value.split('@')[1] || 'example.com';
        return `pseudonym${this.simpleHash(value) % 1000}@${domain}`;
      
      case PIIType.PHONE:
        // 123-456-7890 -> 555-0100-XXXX (generic phone)
        return '555-0100-' + (this.simpleHash(value) % 10000).toString().padStart(4, '0');
      
      default:
        return this.maskValue(type, value);
    }
  }

  /**
   * Generalize a value (replace with general description)
   */
  private generalizeValue(type: PIIType, value: string): string {
    switch (type) {
      case PIIType.ADDRESS:
        return '[Address]';
      
      case PIIType.NAME:
        return '[Name]';
      
      case PIIType.EMAIL:
        return '[Email Address]';
      
      case PIIType.PHONE:
        return '[Phone Number]';
      
      case PIIType.IP_ADDRESS:
        return '[IP Address]';
      
      default:
        return `[${type.replace('_', ' ')}]`;
    }
  }

  /**
   * Simple hash function for deterministic tokenization
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Phase 3.1: Generate reversible token for tokenization strategy
   * Uses encryption to allow authorized users to reverse the tokenization
   */
  private generateReversibleToken(value: string, piiType: PIIType): string {
    // Generate a deterministic but reversible token
    // In production, this should use proper encryption with a tenant-specific key
    const hash = crypto.createHash('sha256')
      .update(`${piiType}:${value}`)
      .digest('hex');
    
    // Return first 16 characters as token (can be extended to support decryption)
    return hash.substring(0, 16);
  }

  /**
   * Phase 3.1: Reverse tokenization (for authorized access)
   * Note: This requires the reversible mapping from the redaction result
   */
  reverseRedaction(
    redactedContent: string,
    reversibleMapping: Map<string, string>
  ): string {
    if (!reversibleMapping || reversibleMapping.size === 0) {
      return redactedContent;
    }

    let restored = redactedContent;

    // Replace tokens with original values
    for (const [token, originalValue] of reversibleMapping.entries()) {
      // Match pattern: [PII_TYPE_TOKEN]
      const pattern = new RegExp(`\\[\\w+_${token}\\]`, 'g');
      restored = restored.replace(pattern, originalValue);
    }

    return restored;
  }
}
