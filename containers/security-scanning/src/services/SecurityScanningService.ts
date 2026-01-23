/**
 * Security Scanning Service
 * PII detection, redaction, and security scanning
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface SecurityScan {
  scanId: string;
  tenantId: string;
  targetId: string;
  targetType: 'shard' | 'document' | 'field';
  scanType: 'pii' | 'secret' | 'vulnerability';
  status: 'pending' | 'running' | 'completed' | 'failed';
  findings: SecurityFinding[];
  startedAt?: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
}

export interface SecurityFinding {
  id: string;
  type: 'pii' | 'secret' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  recommendation?: string;
}

export interface PIIDetection {
  detectionId: string;
  tenantId: string;
  contentId: string;
  detectedPII: Array<{
    type: string;
    value: string;
    confidence: number;
    location: string;
  }>;
  createdAt: Date | string;
}

export class SecurityScanningService {
  private config: ReturnType<typeof loadConfig>;
  private authClient: ServiceClient;
  private secretManagementClient: ServiceClient;
  private shardManagerClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.authClient = new ServiceClient({
      baseURL: this.config.services.auth?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.secretManagementClient = new ServiceClient({
      baseURL: this.config.services.secret_management?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Scan for security issues
   */
  async scanSecurity(
    tenantId: string,
    targetId: string,
    targetType: 'shard' | 'document' | 'field',
    scanType: 'pii' | 'secret' | 'vulnerability'
  ): Promise<SecurityScan> {
    const scanId = uuidv4();

    try {
      log.info('Starting security scan', {
        scanId,
        targetId,
        targetType,
        scanType,
        tenantId,
        service: 'security-scanning',
      });

      const scan: SecurityScan = {
        scanId,
        tenantId,
        targetId,
        targetType,
        scanType,
        status: 'running',
        findings: [],
        startedAt: new Date(),
        createdAt: new Date(),
      };

      // Store scan
      const container = getContainer('security_scans');
      await container.items.create(scan, { partitionKey: tenantId });

      // Get target data for scanning
      let targetData: any = null;
      if (targetType === 'shard') {
        try {
          // Get shard data from shard-manager
          const shardResponse = await this.shardManagerClient.get<any>(
            `/api/v1/shards/${targetId}`,
            {
              headers: {
                'X-Tenant-ID': tenantId,
              },
            }
          );
          targetData = shardResponse?.structuredData || {};
        } catch (error: any) {
          log.warn('Failed to get shard data for scanning', {
            error: error.message,
            targetId,
            service: 'security-scanning',
          });
        }
      } else {
        targetData = { content: targetId }; // For document/field types, use targetId as content
      }

      // Perform actual security scanning
      const findings: SecurityFinding[] = [];

      // PII detection
      if (scanType === 'pii' || scanType === 'secret') {
        try {
          const piiDetection = await this.detectPII(tenantId, targetId, JSON.stringify(targetData || {}));
          if (piiDetection.detectedPII && piiDetection.detectedPII.length > 0) {
            findings.push(...piiDetection.detectedPII.map(pii => ({
              id: uuidv4(),
              type: 'pii' as const,
              severity: 'high' as const,
              description: `PII detected: ${pii.type}`,
              location: pii.location || 'unknown',
            })));
          }
        } catch (error: any) {
          log.warn('PII detection failed during scan', {
            error: error.message,
            scanId,
            service: 'security-scanning',
          });
        }
      }

      // Secret scanning (API keys, tokens, passwords)
      if (scanType === 'secret' || scanType === 'vulnerability') {
        const content = JSON.stringify(targetData || {});
        const secretPatterns = [
          { pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/i, type: 'api_key' },
          { pattern: /(secret|token|password)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,})['"]?/i, type: 'secret' },
          { pattern: /(bearer|authorization)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{20,})['"]?/i, type: 'token' },
          { pattern: /(aws[_-]?access[_-]?key|aws[_-]?secret)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/i, type: 'aws_credential' },
        ];

        for (const { pattern, type } of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            findings.push({
              id: uuidv4(),
              type: 'secret' as const,
              severity: 'critical' as const,
              description: `Potential ${type} detected`,
              location: 'content',
            });
          }
        }
      }

      // Vulnerability scanning (basic patterns)
      if (scanType === 'vulnerability') {
        const content = JSON.stringify(targetData || {}).toLowerCase();
        const vulnerabilityPatterns = [
          { pattern: /eval\s*\(/, type: 'code_injection', severity: 'high' },
          { pattern: /exec\s*\(/, type: 'command_injection', severity: 'high' },
          { pattern: /sql.*select.*from/i, type: 'sql_injection', severity: 'medium' },
          { pattern: /<script/i, type: 'xss', severity: 'medium' },
        ];

        for (const { pattern, type, severity } of vulnerabilityPatterns) {
          if (pattern.test(content)) {
            findings.push({
              id: uuidv4(),
              type: 'vulnerability' as const,
              severity: severity as 'low' | 'medium' | 'high' | 'critical',
              description: `Potential ${type} vulnerability detected`,
              location: 'content',
            });
          }
        }
      }

      scan.findings = findings;
      scan.status = 'completed';
      scan.completedAt = new Date();

      await container.item(scanId, tenantId).replace({
        id: scanId,
        tenantId,
        ...scan,
        updatedAt: new Date(),
      });

      return scan;
    } catch (error: any) {
      log.error('Security scan failed', error, {
        scanId,
        targetId,
        tenantId,
        service: 'security-scanning',
      });
      throw error;
    }
  }

  /**
   * Detect PII in content
   */
  async detectPII(tenantId: string, contentId: string, content: string): Promise<PIIDetection> {
    const detectionId = uuidv4();

    try {
      // Implement PII detection
      const detectedPII: Array<{ type: string; value: string; location: string; confidence: number }> = [];

      // Email detection
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = content.match(emailPattern);
      if (emails) {
        emails.forEach(email => {
          detectedPII.push({
            type: 'email',
            value: email,
            location: 'content',
            confidence: 0.95,
          });
        });
      }

      // Phone number detection (US format)
      const phonePattern = /\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
      const phones = content.match(phonePattern);
      if (phones) {
        phones.forEach(phone => {
          detectedPII.push({
            type: 'phone',
            value: phone,
            location: 'content',
            confidence: 0.85,
          });
        });
      }

      // SSN detection (US format: XXX-XX-XXXX)
      const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
      const ssns = content.match(ssnPattern);
      if (ssns) {
        ssns.forEach(ssn => {
          detectedPII.push({
            type: 'ssn',
            value: ssn,
            location: 'content',
            confidence: 0.9,
          });
        });
      }

      // Credit card detection (basic pattern - 13-19 digits with optional separators)
      const ccPattern = /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g;
      const creditCards = content.match(ccPattern);
      if (creditCards) {
        creditCards.forEach(cc => {
          // Basic Luhn check would go here, but for now just flag potential matches
          detectedPII.push({
            type: 'credit_card',
            value: cc.replace(/[-\s]/g, '').substring(0, 4) + '****', // Masked
            location: 'content',
            confidence: 0.7,
          });
        });
      }

      // IP address detection
      const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
      const ips = content.match(ipPattern);
      if (ips) {
        ips.forEach(ip => {
          detectedPII.push({
            type: 'ip_address',
            value: ip,
            location: 'content',
            confidence: 0.8,
          });
        });
      }

      const detection: PIIDetection = {
        detectionId,
        tenantId,
        contentId,
        detectedPII,
        createdAt: new Date(),
      };

      // Store detection
      const container = getContainer('security_pii_detections');
      await container.items.create(detection, { partitionKey: tenantId });

      return detection;
    } catch (error: any) {
      log.error('PII detection failed', error, {
        detectionId,
        contentId,
        tenantId,
        service: 'security-scanning',
      });
      throw error;
    }
  }

  /**
   * Get scan by ID
   */
  async getScan(scanId: string, tenantId: string): Promise<SecurityScan | null> {
    try {
      const container = getContainer('security_scans');
      const { resource } = await container.item(scanId, tenantId).read<SecurityScan>();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get scan', error, {
        scanId,
        tenantId,
        service: 'security-scanning',
      });
      return null;
    }
  }
}
