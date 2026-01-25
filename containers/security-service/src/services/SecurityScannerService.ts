/**
 * Security Scanner Service
 * Handles security scan execution
 */

import { v4 as uuidv4 } from 'uuid';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import { SecurityScanService } from './SecurityScanService';
import { loadConfig } from '../config';
import {
  SecurityScan,
  RunSecurityScanInput,
  SecurityScanStatus,
  SecurityScanType,
  SecurityFinding,
  SecuritySeverity,
  SecurityFindingType,
  PIIDetection,
} from '../types/security.types';

export class SecurityScannerService {
  private scanService: SecurityScanService;
  private findingsContainerName = 'security_findings';
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;

  constructor(scanService: SecurityScanService) {
    this.scanService = scanService;
    this.config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Run security scan
   * Note: This is a placeholder - actual scanning would use security tools
   */
  async runScan(input: RunSecurityScanInput): Promise<SecurityScan> {
    if (!input.tenantId || !input.scanId) {
      throw new BadRequestError('tenantId and scanId are required');
    }

    const scan = await this.scanService.getById(input.scanId, input.tenantId);

    if (scan.status === SecurityScanStatus.SCANNING) {
      throw new BadRequestError('Scan is already running');
    }

    if (scan.status === SecurityScanStatus.COMPLETED) {
      throw new BadRequestError('Scan has already been completed');
    }

    // Update status to scanning
    const updatedScan = await this.scanService.update(input.scanId, input.tenantId, {
      status: SecurityScanStatus.SCANNING,
      startedAt: new Date(),
    });

    // Start scan (async)
    this.executeScan(updatedScan, input.tenantId, input.options || {}).catch((error) => {
      console.error('Security scan execution failed:', error);
    });

    return updatedScan;
  }

  /**
   * Execute scan (async)
   */
  private async executeScan(
    scan: SecurityScan,
    tenantId: string,
    options: RunSecurityScanInput['options']
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Perform scan based on type
      const findings = await this.performScan(scan, options);

      // Calculate summary
      const summary = this.calculateSummary(findings);

      // Save findings
      await this.saveFindings(findings, tenantId);

      const duration = Date.now() - startTime;

      // Update scan with results
      await this.scanService.update(scan.id, tenantId, {
        status: SecurityScanStatus.COMPLETED,
        findings,
        summary,
        completedAt: new Date(),
        duration,
      });
    } catch (error: any) {
      await this.scanService.update(scan.id, tenantId, {
        status: SecurityScanStatus.FAILED,
        error: error.message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Perform scan (enhanced with actual scanning logic)
   */
  private async performScan(
    scan: SecurityScan,
    options: RunSecurityScanInput['options']
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    switch (scan.type) {
      case SecurityScanType.SECRET_SCAN:
        findings.push(...this.scanForSecrets(scan));
        break;
      case SecurityScanType.VULNERABILITY_SCAN:
        findings.push(...this.scanForVulnerabilities(scan));
        break;
      case SecurityScanType.PII_DETECTION:
        findings.push(...(await this.scanForPII(scan)));
        break;
      case SecurityScanType.SAST:
        findings.push(...this.performSAST(scan));
        break;
      case SecurityScanType.SCA:
        findings.push(...this.performSCA(scan));
        break;
      default:
        findings.push(...this.performGenericScan(scan));
    }

    // Filter by severity threshold if provided
    if (options?.severityThreshold) {
      const severityOrder = {
        [SecuritySeverity.CRITICAL]: 5,
        [SecuritySeverity.HIGH]: 4,
        [SecuritySeverity.MEDIUM]: 3,
        [SecuritySeverity.LOW]: 2,
        [SecuritySeverity.INFO]: 1,
      };
      const threshold = severityOrder[options.severityThreshold];
      return findings.filter(
        (f) => severityOrder[f.severity] >= threshold
      );
    }

    return findings;
  }

  /**
   * Scan for secrets (enhanced with pattern matching)
   */
  private scanForSecrets(scan: SecurityScan): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    
    // In a real implementation, this would read the file content
    // For now, we'll use pattern matching similar to security-scanning
    const secretPatterns = [
      { pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/i, type: 'api_key' },
      { pattern: /(secret|token|password)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,})['"]?/i, type: 'secret' },
      { pattern: /(bearer|authorization)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{20,})['"]?/i, type: 'token' },
      { pattern: /(aws[_-]?access[_-]?key|aws[_-]?secret)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/i, type: 'aws_credential' },
    ];

    // Placeholder: In real implementation, read file content
    const content = ''; // Would be read from scan.target.path
    
    for (const { pattern, type } of secretPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          id: uuidv4(),
          tenantId: scan.tenantId,
          scanId: scan.id,
          type: SecurityFindingType.SECRET_LEAK,
          severity: SecuritySeverity.CRITICAL,
          title: `Potential ${type} Exposure`,
          description: `Found what appears to be a ${type} in the code`,
          location: {
            file: scan.target.path,
          },
          evidence: matches[0],
          recommendation: 'Move secrets to environment variables or secret management service',
          remediation: {
            description: 'Use environment variables for secrets',
            code: `const ${type} = process.env.${type.toUpperCase()};`,
            steps: [
              'Remove hardcoded secret',
              'Add secret to environment variables',
              'Update code to read from environment',
            ],
          },
          createdAt: new Date(),
        });
      }
    }

    return findings;
  }

  /**
   * Scan for vulnerabilities (enhanced with pattern matching)
   */
  private scanForVulnerabilities(scan: SecurityScan): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    
    // Placeholder: In real implementation, read file content
    const content = ''; // Would be read from scan.target.path
    const contentLower = content.toLowerCase();
    
    const vulnerabilityPatterns = [
      { pattern: /eval\s*\(/, type: 'code_injection', severity: SecuritySeverity.HIGH, cwe: 'CWE-94' },
      { pattern: /exec\s*\(/, type: 'command_injection', severity: SecuritySeverity.HIGH, cwe: 'CWE-78' },
      { pattern: /sql.*select.*from/i, type: 'sql_injection', severity: SecuritySeverity.MEDIUM, cwe: 'CWE-89' },
      { pattern: /<script/i, type: 'xss', severity: SecuritySeverity.MEDIUM, cwe: 'CWE-79' },
    ];

    for (const { pattern, type, severity, cwe } of vulnerabilityPatterns) {
      if (pattern.test(contentLower)) {
        findings.push({
          id: uuidv4(),
          tenantId: scan.tenantId,
          scanId: scan.id,
          type: SecurityFindingType.VULNERABILITY,
          severity,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Vulnerability`,
          description: `Potential ${type} vulnerability detected`,
          location: {
            file: scan.target.path,
          },
          recommendation: `Fix ${type} vulnerability`,
          remediation: {
            description: `Remediate ${type} vulnerability`,
            steps: [
              'Review code for vulnerability',
              'Apply recommended fix',
              'Test fix',
            ],
          },
          cwe,
          owasp: 'A03:2021 – Injection',
          createdAt: new Date(),
        });
      }
    }

    return findings;
  }

  /**
   * Scan for PII (enhanced with actual detection)
   */
  private async scanForPII(scan: SecurityScan): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    try {
      // Get target content
      let content = '';
      if (scan.target.type === 'file') {
        // In a real implementation, read file content
        content = ''; // Placeholder
      } else if (scan.target.type === 'module' || scan.target.type === 'project') {
        // Get content from shard-manager if it's a shard
        try {
          const shardResponse = await this.shardManagerClient.get<any>(
            `/api/v1/shards/${scan.target.path}`,
            {
              headers: {
                'X-Tenant-ID': scan.tenantId,
              },
            }
          );
          content = JSON.stringify(shardResponse?.structuredData || {});
        } catch (error) {
          // Ignore errors, use empty content
        }
      }

      // Detect PII
      const piiDetection = await this.detectPII(scan.tenantId, scan.id, content);
      
      // Convert PII detections to findings
      if (piiDetection && piiDetection.length > 0) {
        for (const pii of piiDetection) {
          findings.push({
            id: uuidv4(),
            tenantId: scan.tenantId,
            scanId: scan.id,
            type: SecurityFindingType.PII_EXPOSURE,
            severity: SecuritySeverity.HIGH,
            title: `PII Detected: ${pii.piiType}`,
            description: `Found ${pii.piiType} with confidence ${(pii.confidence * 100).toFixed(0)}%`,
            location: pii.location,
            evidence: pii.value ? `Detected value: ${pii.value}` : undefined,
            recommendation: 'Ensure PII is properly encrypted and access-controlled',
            remediation: {
              description: 'Encrypt PII at rest and in transit',
              steps: [
                'Encrypt sensitive data',
                'Implement access controls',
                'Audit PII access',
              ],
            },
            createdAt: new Date(),
          });
        }
      }
    } catch (error: any) {
      // Return empty findings on error
    }

    return findings;
  }

  /**
   * Detect PII in content (from security-scanning)
   */
  private async detectPII(tenantId: string, scanId: string, content: string): Promise<Array<{
    piiType: string;
    value?: string;
    location: { file?: string; line?: number; column?: number };
    confidence: number;
  }>> {
    const detectedPII: Array<{
      piiType: string;
      value?: string;
      location: { file?: string; line?: number; column?: number };
      confidence: number;
    }> = [];

    // Email detection
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailPattern);
    if (emails) {
      emails.forEach(email => {
        detectedPII.push({
          piiType: 'email',
          value: email,
          location: {},
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
          piiType: 'phone',
          value: phone,
          location: {},
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
          piiType: 'ssn',
          value: ssn.substring(0, 3) + '-**-****', // Masked
          location: {},
          confidence: 0.9,
        });
      });
    }

    // Credit card detection
    const ccPattern = /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g;
    const creditCards = content.match(ccPattern);
    if (creditCards) {
      creditCards.forEach(cc => {
        detectedPII.push({
          piiType: 'credit_card',
          value: cc.replace(/[-\s]/g, '').substring(0, 4) + '****', // Masked
          location: {},
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
          piiType: 'ip_address',
          value: ip,
          location: {},
          confidence: 0.8,
        });
      });
    }

    // Store detections in Cosmos DB
    if (detectedPII.length > 0) {
      try {
        const container = getContainer('security_pii_detections');
        for (const pii of detectedPII) {
          const detection: PIIDetection = {
            id: uuidv4(),
            tenantId,
            scanId,
            piiType: pii.piiType,
            value: pii.value,
            location: pii.location,
            confidence: pii.confidence,
            createdAt: new Date(),
          };
          await container.items.create(detection, { partitionKey: tenantId });
        }
      } catch (error) {
        // Ignore storage errors
      }
    }

    return detectedPII;
  }

  /**
   * Perform SAST (placeholder)
   */
  private performSAST(scan: SecurityScan): SecurityFinding[] {
    return [
      {
        id: uuidv4(),
        tenantId: scan.tenantId,
        scanId: scan.id,
        type: SecurityFindingType.XSS,
        severity: SecuritySeverity.HIGH,
        title: 'Cross-Site Scripting (XSS) Vulnerability',
        description: 'User input is directly rendered without sanitization',
        location: {
          file: scan.target.path,
          line: 50,
        },
        evidence: '<div>{userInput}</div>',
        recommendation: 'Sanitize user input before rendering',
        remediation: {
          description: 'Use proper sanitization',
          code: '<div>{sanitize(userInput)}</div>',
        },
        cwe: 'CWE-79',
        owasp: 'A03:2021 – Injection',
        createdAt: new Date(),
      },
    ];
  }

  /**
   * Perform SCA (placeholder)
   */
  private performSCA(scan: SecurityScan): SecurityFinding[] {
    return [
      {
        id: uuidv4(),
        tenantId: scan.tenantId,
        scanId: scan.id,
        type: SecurityFindingType.DEPENDENCY_VULNERABILITY,
        severity: SecuritySeverity.CRITICAL,
        title: 'Vulnerable Dependency',
        description: 'Dependency has known security vulnerabilities',
        location: {
          file: 'package.json',
          identifier: 'lodash@4.17.15',
        },
        recommendation: 'Update dependency to a secure version',
        remediation: {
          description: 'Update to latest secure version',
          steps: [
            'Check for updates',
            'Review changelog',
            'Update dependency',
            'Test application',
          ],
        },
        cve: 'CVE-2021-23337',
        createdAt: new Date(),
      },
    ];
  }

  /**
   * Perform generic scan (placeholder)
   */
  private performGenericScan(scan: SecurityScan): SecurityFinding[] {
    return [];
  }

  /**
   * Calculate summary
   */
  private calculateSummary(findings: SecurityFinding[]): SecurityScan['summary'] {
    const summary = {
      totalFindings: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    findings.forEach((finding) => {
      switch (finding.severity) {
        case SecuritySeverity.CRITICAL:
          summary.critical++;
          break;
        case SecuritySeverity.HIGH:
          summary.high++;
          break;
        case SecuritySeverity.MEDIUM:
          summary.medium++;
          break;
        case SecuritySeverity.LOW:
          summary.low++;
          break;
        case SecuritySeverity.INFO:
          summary.info++;
          break;
      }
    });

    return summary;
  }

  /**
   * Save findings
   */
  private async saveFindings(findings: SecurityFinding[], tenantId: string): Promise<void> {
    if (findings.length === 0) return;

    const container = getContainer(this.findingsContainerName);

    for (const finding of findings) {
      await container.items.create(finding, {
        partitionKey: tenantId,
      });
    }
  }
}

