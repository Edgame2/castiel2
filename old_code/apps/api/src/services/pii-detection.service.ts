/**
 * PII Detection Service
 * Phase 3.1: Automated PII Detection and Redaction
 * 
 * Detects personally identifiable information (PII) in text and structured data
 * using pattern matching and configurable detection rules.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  PIIType,
  DetectedPII,
  PIIDetectionResult,
  PIIDetectionConfig,
  SensitivityLevel,
  RedactionStrategy,
  RedactionResult,
  ComplianceRequirement,
  FieldSensitivity,
} from '../types/pii-detection.types.js';

/**
 * Default PII detection patterns
 */
const PII_PATTERNS: Record<PIIType, RegExp[]> = {
  [PIIType.EMAIL]: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ],
  [PIIType.PHONE]: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // US format: 123-456-7890
    /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, // (123) 456-7890
    /\b\+1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // +1-123-456-7890
    /\b\d{10}\b/g, // 1234567890
  ],
  [PIIType.SSN]: [
    /\b\d{3}-\d{2}-\d{4}\b/g, // 123-45-6789
    /\b\d{9}\b/g, // 123456789 (if in SSN context)
  ],
  [PIIType.CREDIT_CARD]: [
    /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, // 1234-5678-9012-3456
    /\b\d{13,19}\b/g, // 13-19 digits (with context validation)
  ],
  [PIIType.ADDRESS]: [
    /\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy)\b/gi,
    /\b\d{5}(-\d{4})?\b/g, // ZIP code
  ],
  [PIIType.NAME]: [
    // This is context-dependent and less reliable, so lower confidence
    /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  ],
  [PIIType.IP_ADDRESS]: [
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  ],
  [PIIType.DATE_OF_BIRTH]: [
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g, // MM/DD/YYYY
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi, // January 1, 2000
  ],
  [PIIType.DRIVER_LICENSE]: [
    /\b[A-Z]{1,2}\d{6,9}\b/g, // State format varies
  ],
  [PIIType.PASSPORT]: [
    /\b[A-Z]{1,2}\d{6,9}\b/g, // Format varies by country
  ],
  [PIIType.BANK_ACCOUNT]: [
    /\b\d{8,17}\b/g, // Account numbers (with context validation)
  ],
  [PIIType.CUSTOM]: [], // Custom patterns added via config
};

/**
 * Default confidence scores by PII type
 */
const DEFAULT_CONFIDENCE: Record<PIIType, number> = {
  [PIIType.EMAIL]: 0.95,
  [PIIType.PHONE]: 0.85,
  [PIIType.SSN]: 0.90,
  [PIIType.CREDIT_CARD]: 0.80, // Lower due to false positives
  [PIIType.ADDRESS]: 0.70,
  [PIIType.NAME]: 0.50, // Low confidence due to false positives
  [PIIType.IP_ADDRESS]: 0.90,
  [PIIType.DATE_OF_BIRTH]: 0.75,
  [PIIType.DRIVER_LICENSE]: 0.70,
  [PIIType.PASSPORT]: 0.70,
  [PIIType.BANK_ACCOUNT]: 0.60,
  [PIIType.CUSTOM]: 0.80,
};

export class PIIDetectionService {
  private configs: Map<string, PIIDetectionConfig> = new Map(); // tenantId -> config

  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Configure PII detection for a tenant
   */
  async configureDetection(
    tenantId: string,
    config: Partial<PIIDetectionConfig>,
    userId: string
  ): Promise<void> {
    const existingConfig = this.configs.get(tenantId);
    const newConfig: PIIDetectionConfig = {
      tenantId,
      enabled: config.enabled ?? existingConfig?.enabled ?? true,
      sensitivityLevel: config.sensitivityLevel ?? existingConfig?.sensitivityLevel ?? SensitivityLevel.MEDIUM,
      detectTypes: config.detectTypes ?? existingConfig?.detectTypes ?? Object.values(PIIType),
      redactionStrategy: config.redactionStrategy ?? existingConfig?.redactionStrategy ?? this.getDefaultRedactionStrategies(),
      customPatterns: config.customPatterns ?? existingConfig?.customPatterns,
      industrySpecific: config.industrySpecific ?? existingConfig?.industrySpecific,
      createdAt: existingConfig?.createdAt ?? new Date(),
      updatedAt: new Date(),
      updatedBy: userId,
    };

    this.configs.set(tenantId, newConfig);

    this.monitoring.trackEvent('pii-detection.config-updated', {
      tenantId,
      enabled: newConfig.enabled,
      sensitivityLevel: newConfig.sensitivityLevel,
      detectTypesCount: newConfig.detectTypes.length,
    });
  }

  /**
   * Get detection configuration for a tenant
   */
  getConfig(tenantId: string): PIIDetectionConfig | null {
    return this.configs.get(tenantId) || null;
  }

  /**
   * Detect PII in text content
   */
  detectPII(
    content: string,
    tenantId: string,
    fieldPath?: string
  ): PIIDetectionResult {
    const config = this.getConfig(tenantId);
    
    if (!config || !config.enabled) {
      return {
        detected: [],
        totalCount: 0,
        byType: {} as Record<PIIType, number>,
        hasPII: false,
      };
    }

    const detected: DetectedPII[] = [];
    const byType: Record<PIIType, number> = {} as Record<PIIType, number>;

    // Phase 3.1: Detect each configured PII type, respecting sensitivity levels
    for (const piiType of config.detectTypes) {
      // Check if this PII type should be detected based on sensitivity and field path
      if (!this.shouldDetectPIIType(piiType, config, fieldPath)) {
        continue;
      }
      if (piiType === PIIType.CUSTOM && config.customPatterns) {
        // Handle custom patterns
        for (const customPattern of config.customPatterns) {
          try {
            const regex = new RegExp(customPattern.pattern, 'gi');
            const matches = content.matchAll(regex);
            
            for (const match of matches) {
              if (match.index !== undefined) {
                detected.push({
                  type: PIIType.CUSTOM,
                  value: match[0],
                  startIndex: match.index,
                  endIndex: match.index + match[0].length,
                  confidence: DEFAULT_CONFIDENCE[PIIType.CUSTOM],
                  context: this.getContext(content, match.index, match[0].length),
                  fieldPath,
                });
                
                byType[PIIType.CUSTOM] = (byType[PIIType.CUSTOM] || 0) + 1;
              }
            }
          } catch (error) {
            this.monitoring.trackException(error as Error, {
              operation: 'pii-detection.custom-pattern',
              tenantId,
              pattern: customPattern.pattern,
            });
          }
        }
      } else {
        // Handle standard PII types
        const patterns = PII_PATTERNS[piiType];
        for (const pattern of patterns) {
          const matches = content.matchAll(pattern);
          
          for (const match of matches) {
            if (match.index !== undefined) {
              // Validate match (some patterns need additional validation)
              if (this.validateMatch(piiType, match[0], content, match.index)) {
                detected.push({
                  type: piiType,
                  value: match[0],
                  startIndex: match.index,
                  endIndex: match.index + match[0].length,
                  confidence: DEFAULT_CONFIDENCE[piiType],
                  context: this.getContext(content, match.index, match[0].length),
                  fieldPath,
                });
                
                byType[piiType] = (byType[piiType] || 0) + 1;
              }
            }
          }
        }
      }
    }

    // Sort by start index
    detected.sort((a, b) => a.startIndex - b.startIndex);

    // Remove overlapping detections (keep higher confidence)
    const deduplicated = this.deduplicateDetections(detected);

    return {
      detected: deduplicated,
      totalCount: deduplicated.length,
      byType,
      hasPII: deduplicated.length > 0,
    };
  }

  /**
   * Detect PII in structured data (object)
   * Phase 3.1: Enhanced with field-level sensitivity support
   */
  detectPIIInStructuredData(
    data: Record<string, any>,
    tenantId: string,
    fieldPath: string = ''
  ): PIIDetectionResult {
    const config = this.getConfig(tenantId);
    const allDetected: DetectedPII[] = [];
    const byType: Record<PIIType, number> = {} as Record<PIIType, number>;

    const traverse = (obj: any, currentPath: string): void => {
      if (obj === null || obj === undefined) {
        return;
      }

      if (typeof obj === 'string') {
        const fullPath = currentPath || fieldPath;
        // Phase 3.1: Check field-level sensitivity
        if (config) {
          const fieldSensitivity = this.getFieldSensitivity(config, fullPath);
          if (fieldSensitivity) {
            // If field has specific required types, only detect those
            if (fieldSensitivity.requiredTypes && fieldSensitivity.requiredTypes.length > 0) {
              const result = this.detectPII(obj, tenantId, fullPath);
              const filtered = result.detected.filter(d => 
                fieldSensitivity.requiredTypes!.includes(d.type)
              );
              allDetected.push(...filtered);
              for (const detection of filtered) {
                byType[detection.type] = (byType[detection.type] || 0) + 1;
              }
            } else {
              // Use standard detection but respect field sensitivity level
              const result = this.detectPII(obj, tenantId, fullPath);
              allDetected.push(...result.detected);
              for (const [type, count] of Object.entries(result.byType)) {
                byType[type as PIIType] = (byType[type as PIIType] || 0) + count;
              }
            }
          } else {
            // No field-specific config, use standard detection
            const result = this.detectPII(obj, tenantId, fullPath);
            allDetected.push(...result.detected);
            for (const [type, count] of Object.entries(result.byType)) {
              byType[type as PIIType] = (byType[type as PIIType] || 0) + count;
            }
          }
        } else {
          // No config, use standard detection
          const result = this.detectPII(obj, tenantId, fullPath);
          allDetected.push(...result.detected);
          for (const [type, count] of Object.entries(result.byType)) {
            byType[type as PIIType] = (byType[type as PIIType] || 0) + count;
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, `${currentPath}[${index}]`);
        });
      } else if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          traverse(value, newPath);
        }
      }
    };

    traverse(data, fieldPath);

    // Deduplicate across all fields
    const deduplicated = this.deduplicateDetections(allDetected);

    return {
      detected: deduplicated,
      totalCount: deduplicated.length,
      byType,
      hasPII: deduplicated.length > 0,
    };
  }

  /**
   * Validate a PII match (reduce false positives)
   */
  private validateMatch(
    type: PIIType,
    value: string,
    content: string,
    index: number
  ): boolean {
    switch (type) {
      case PIIType.CREDIT_CARD:
        // Luhn algorithm validation
        return this.validateLuhn(value.replace(/[-\s.]/g, ''));
      
      case PIIType.SSN:
        // SSN validation (not 000-00-0000, not 123-45-6789, etc.)
        const ssn = value.replace(/-/g, '');
        if (ssn === '000000000' || ssn === '123456789' || /^0+$/.test(ssn)) {
          return false;
        }
        return true;
      
      case PIIType.PHONE:
        // Basic phone validation (not all zeros, reasonable format)
        const phone = value.replace(/[-\s().]/g, '');
        if (/^0+$/.test(phone) || phone.length < 10) {
          return false;
        }
        return true;
      
      case PIIType.NAME:
        // Name validation (not common words, has proper capitalization)
        const words = value.split(/\s+/);
        const commonWords = ['the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that'];
        if (words.some(w => commonWords.includes(w.toLowerCase()))) {
          return false;
        }
        return words.every(w => /^[A-Z][a-z]+$/.test(w));
      
      default:
        return true;
    }
  }

  /**
   * Validate credit card using Luhn algorithm
   */
  private validateLuhn(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Get context around detected PII
   */
  private getContext(content: string, index: number, length: number, contextSize: number = 20): string {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(content.length, index + length + contextSize);
    return content.substring(start, end);
  }

  /**
   * Deduplicate overlapping detections (keep higher confidence)
   */
  private deduplicateDetections(detected: DetectedPII[]): DetectedPII[] {
    const sorted = [...detected].sort((a, b) => {
      // Sort by start index, then by confidence (descending)
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      return b.confidence - a.confidence;
    });

    const result: DetectedPII[] = [];
    for (const detection of sorted) {
      // Check if this detection overlaps with any in result
      const overlaps = result.some(existing => {
        return !(
          detection.endIndex <= existing.startIndex ||
          detection.startIndex >= existing.endIndex
        );
      });

      if (!overlaps) {
        result.push(detection);
      } else {
        // If overlaps, keep the one with higher confidence
        const existingIndex = result.findIndex(existing => {
          return !(
            detection.endIndex <= existing.startIndex ||
            detection.startIndex >= existing.endIndex
          );
        });

        if (existingIndex >= 0 && detection.confidence > result[existingIndex].confidence) {
          result[existingIndex] = detection;
        }
      }
    }

    return result;
  }

  /**
   * Phase 3.1: Apply compliance requirements to configuration
   * Automatically configures detection and redaction based on compliance needs
   */
  async applyComplianceRequirements(
    tenantId: string,
    requirements: ComplianceRequirement[],
    userId: string
  ): Promise<PIIDetectionConfig> {
    const existingConfig = this.configs.get(tenantId);
    const baseConfig = existingConfig || await this.getDefaultConfig(tenantId, userId);

    // Build compliance-driven configuration
    const complianceTypes: Set<PIIType> = new Set(baseConfig.detectTypes);
    const complianceStrategies: Record<PIIType, RedactionStrategy> = {
      ...baseConfig.redactionStrategy,
    };
    let maxSensitivity = baseConfig.sensitivityLevel;

    // Apply GDPR requirements
    if (requirements.includes(ComplianceRequirement.GDPR)) {
      complianceTypes.add(PIIType.EMAIL);
      complianceTypes.add(PIIType.NAME);
      complianceTypes.add(PIIType.ADDRESS);
      complianceTypes.add(PIIType.PHONE);
      complianceTypes.add(PIIType.IP_ADDRESS);
      complianceTypes.add(PIIType.DATE_OF_BIRTH);
      complianceStrategies[PIIType.EMAIL] = RedactionStrategy.PSEUDONYMIZATION;
      complianceStrategies[PIIType.NAME] = RedactionStrategy.PSEUDONYMIZATION;
      maxSensitivity = this.getHigherSensitivity(maxSensitivity, SensitivityLevel.HIGH);
    }

    // Apply HIPAA requirements
    if (requirements.includes(ComplianceRequirement.HIPAA)) {
      complianceTypes.add(PIIType.SSN);
      complianceTypes.add(PIIType.DATE_OF_BIRTH);
      complianceTypes.add(PIIType.NAME);
      complianceTypes.add(PIIType.ADDRESS);
      complianceTypes.add(PIIType.PHONE);
      complianceTypes.add(PIIType.EMAIL);
      complianceStrategies[PIIType.SSN] = RedactionStrategy.MASKING;
      complianceStrategies[PIIType.DATE_OF_BIRTH] = RedactionStrategy.MASKING;
      maxSensitivity = this.getHigherSensitivity(maxSensitivity, SensitivityLevel.CRITICAL);
    }

    // Apply PCI-DSS requirements
    if (requirements.includes(ComplianceRequirement.PCI_DSS)) {
      complianceTypes.add(PIIType.CREDIT_CARD);
      complianceTypes.add(PIIType.BANK_ACCOUNT);
      complianceStrategies[PIIType.CREDIT_CARD] = RedactionStrategy.MASKING;
      complianceStrategies[PIIType.BANK_ACCOUNT] = RedactionStrategy.MASKING;
      maxSensitivity = this.getHigherSensitivity(maxSensitivity, SensitivityLevel.CRITICAL);
    }

    // Apply CCPA requirements
    if (requirements.includes(ComplianceRequirement.CCPA)) {
      complianceTypes.add(PIIType.EMAIL);
      complianceTypes.add(PIIType.NAME);
      complianceTypes.add(PIIType.ADDRESS);
      complianceTypes.add(PIIType.PHONE);
      complianceTypes.add(PIIType.IP_ADDRESS);
      maxSensitivity = this.getHigherSensitivity(maxSensitivity, SensitivityLevel.HIGH);
    }

    // Apply FERPA requirements
    if (requirements.includes(ComplianceRequirement.FERPA)) {
      complianceTypes.add(PIIType.NAME);
      complianceTypes.add(PIIType.DATE_OF_BIRTH);
      complianceTypes.add(PIIType.ADDRESS);
      complianceStrategies[PIIType.NAME] = RedactionStrategy.PSEUDONYMIZATION;
      maxSensitivity = this.getHigherSensitivity(maxSensitivity, SensitivityLevel.HIGH);
    }

    const updatedConfig: PIIDetectionConfig = {
      ...baseConfig,
      detectTypes: Array.from(complianceTypes),
      redactionStrategy: complianceStrategies,
      sensitivityLevel: maxSensitivity,
      complianceConfig: {
        requirements,
        autoConfigured: true,
        lastComplianceCheck: new Date(),
      },
      updatedAt: new Date(),
      updatedBy: userId,
    };

    this.configs.set(tenantId, updatedConfig);

    this.monitoring.trackEvent('pii-detection.compliance-applied', {
      tenantId,
      requirements: requirements.join(','),
      detectTypesCount: updatedConfig.detectTypes.length,
      sensitivityLevel: updatedConfig.sensitivityLevel,
    });

    return updatedConfig;
  }

  /**
   * Phase 3.1: Configure per-field sensitivity
   */
  async configureFieldSensitivity(
    tenantId: string,
    fieldSensitivity: FieldSensitivity[],
    userId: string
  ): Promise<void> {
    const existingConfig = this.configs.get(tenantId);
    if (!existingConfig) {
      throw new Error(`No PII detection configuration found for tenant ${tenantId}`);
    }

    const updatedConfig: PIIDetectionConfig = {
      ...existingConfig,
      fieldSensitivity: fieldSensitivity,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    this.configs.set(tenantId, updatedConfig);

    this.monitoring.trackEvent('pii-detection.field-sensitivity-configured', {
      tenantId,
      fieldCount: fieldSensitivity.length,
    });
  }

  /**
   * Phase 3.1: Get field-specific sensitivity for a given field path
   */
  private getFieldSensitivity(
    config: PIIDetectionConfig,
    fieldPath: string
  ): FieldSensitivity | null {
    if (!config.fieldSensitivity || config.fieldSensitivity.length === 0) {
      return null;
    }

    // Find exact match first
    let match = config.fieldSensitivity.find(fs => fs.fieldPath === fieldPath);
    if (match) {
      return match;
    }

    // Find parent field match (e.g., 'structuredData.email' matches 'structuredData')
    const pathParts = fieldPath.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      match = config.fieldSensitivity.find(fs => fs.fieldPath === parentPath);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Phase 3.1: Check if PII type should be detected based on sensitivity level
   */
  private shouldDetectPIIType(
    piiType: PIIType,
    config: PIIDetectionConfig,
    fieldPath?: string
  ): boolean {
    // Check field-specific requirements
    if (fieldPath) {
      const fieldSensitivity = this.getFieldSensitivity(config, fieldPath);
      if (fieldSensitivity?.requiredTypes) {
        return fieldSensitivity.requiredTypes.includes(piiType);
      }
    }

    // Check if type is in configured detect types
    if (!config.detectTypes.includes(piiType)) {
      return false;
    }

    // Check sensitivity level threshold
    const piiSensitivity = this.getPIISensitivityLevel(piiType);
    return this.meetsSensitivityThreshold(piiSensitivity, config.sensitivityLevel);
  }

  /**
   * Phase 3.1: Get sensitivity level for a PII type
   */
  private getPIISensitivityLevel(piiType: PIIType): SensitivityLevel {
    switch (piiType) {
      case PIIType.EMAIL:
      case PIIType.NAME:
        return SensitivityLevel.LOW;
      case PIIType.PHONE:
      case PIIType.ADDRESS:
      case PIIType.IP_ADDRESS:
        return SensitivityLevel.MEDIUM;
      case PIIType.SSN:
      case PIIType.DATE_OF_BIRTH:
      case PIIType.DRIVER_LICENSE:
      case PIIType.PASSPORT:
        return SensitivityLevel.HIGH;
      case PIIType.CREDIT_CARD:
      case PIIType.BANK_ACCOUNT:
        return SensitivityLevel.CRITICAL;
      default:
        return SensitivityLevel.MEDIUM;
    }
  }

  /**
   * Phase 3.1: Check if sensitivity level meets threshold
   */
  private meetsSensitivityThreshold(
    piiSensitivity: SensitivityLevel,
    threshold: SensitivityLevel
  ): boolean {
    const levels = [
      SensitivityLevel.LOW,
      SensitivityLevel.MEDIUM,
      SensitivityLevel.HIGH,
      SensitivityLevel.CRITICAL,
    ];
    return levels.indexOf(piiSensitivity) >= levels.indexOf(threshold);
  }

  /**
   * Phase 3.1: Get higher sensitivity level
   */
  private getHigherSensitivity(
    a: SensitivityLevel,
    b: SensitivityLevel
  ): SensitivityLevel {
    const levels = [
      SensitivityLevel.LOW,
      SensitivityLevel.MEDIUM,
      SensitivityLevel.HIGH,
      SensitivityLevel.CRITICAL,
    ];
    return levels.indexOf(a) >= levels.indexOf(b) ? a : b;
  }

  /**
   * Phase 3.1: Get default configuration for a tenant
   */
  private async getDefaultConfig(
    tenantId: string,
    userId: string
  ): Promise<PIIDetectionConfig> {
    return {
      tenantId,
      enabled: true,
      sensitivityLevel: SensitivityLevel.MEDIUM,
      detectTypes: Object.values(PIIType),
      redactionStrategy: this.getDefaultRedactionStrategies(),
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId,
    };
  }

  /**
   * Get default redaction strategies by PII type
   */
  private getDefaultRedactionStrategies(): Record<PIIType, RedactionStrategy> {
    return {
      [PIIType.EMAIL]: RedactionStrategy.MASKING,
      [PIIType.PHONE]: RedactionStrategy.MASKING,
      [PIIType.SSN]: RedactionStrategy.MASKING,
      [PIIType.CREDIT_CARD]: RedactionStrategy.MASKING,
      [PIIType.ADDRESS]: RedactionStrategy.GENERALIZATION,
      [PIIType.NAME]: RedactionStrategy.PSEUDONYMIZATION,
      [PIIType.IP_ADDRESS]: RedactionStrategy.MASKING,
      [PIIType.DATE_OF_BIRTH]: RedactionStrategy.MASKING,
      [PIIType.DRIVER_LICENSE]: RedactionStrategy.MASKING,
      [PIIType.PASSPORT]: RedactionStrategy.MASKING,
      [PIIType.BANK_ACCOUNT]: RedactionStrategy.MASKING,
      [PIIType.CUSTOM]: RedactionStrategy.MASKING,
    };
  }
}
