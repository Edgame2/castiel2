/**
 * Security Check Service
 * Performs various security checks on documents:
 * - File type validation (magic bytes)
 * - File size validation
 * - Virus scan (Microsoft Defender for Cloud / Azure Security)
 * - Content filtering rules
 */

import { BlobClient } from '@azure/storage-blob';
import { InvocationContext } from '@azure/functions';
import {
  SecurityCheckResult,
  SecurityCheckType,
  SecurityCheckConfig,
} from '../types/document-check.types.js';
import { ClamAVService } from './clamav.service.js';

/**
 * Magic bytes signatures for common file types
 * Validates actual file content, not just extension
 */
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  'application/msword': [
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP (DOCX)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP (XLSX)
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // ZIP (PPTX)
  'text/plain': [Buffer.from([0xef, 0xbb, 0xbf])], // UTF-8 BOM (optional)
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
};

export class SecurityCheckService {
  private readonly context: InvocationContext;
  private readonly config: SecurityCheckConfig;

  constructor(context: InvocationContext, config: SecurityCheckConfig) {
    this.context = context;
    this.config = config;
  }

  /**
   * Perform all security checks on a document blob
   */
  async performAllSecurityChecks(
    blobClient: BlobClient,
    documentFileName: string
  ): Promise<SecurityCheckResult[]> {
    const results: SecurityCheckResult[] = [];

    try {
      // Get blob properties for size check
      const properties = await blobClient.getProperties();
      const fileSizeBytes = properties.contentLength || 0;

      // 1. File size validation
      const sizeCheckResult = this.validateFileSize(fileSizeBytes);
      results.push(sizeCheckResult);

      if (!sizeCheckResult.passed) {
        return results;
      }

      // 2. File type validation (magic bytes)
      const fileTypeResult = await this.validateFileType(
        blobClient,
        documentFileName,
        properties.contentType || 'application/octet-stream'
      );
      results.push(fileTypeResult);

      if (!fileTypeResult.passed) {
        return results;
      }

      // 3. Virus scan (Microsoft Defender for Cloud)
      if (this.config.enableVirusScan) {
        const virusScanResult = await this.performVirusScan(
          blobClient,
          documentFileName,
          fileSizeBytes
        );
        results.push(virusScanResult);

        if (!virusScanResult.passed) {
          return results;
        }
      }

      // 4. Content filtering
      if (this.config.enableContentFilter) {
        const contentFilterResult = await this.performContentFiltering(
          blobClient,
          documentFileName
        );
        results.push(contentFilterResult);
      }

      return results;
    } catch (error: any) {
      this.context.error(
        `Security check error for ${documentFileName}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Validate file size against configured limits
   */
  private validateFileSize(fileSizeBytes: number): SecurityCheckResult {
    const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;
    const passed = fileSizeBytes <= maxSizeBytes;

    return {
      checkType: 'file-size-validation',
      passed,
      timestamp: new Date().toISOString(),
      details: `File size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB, Limit: ${this.config.maxFileSizeMB}MB`,
      riskLevel: passed ? 'low' : 'high',
    };
  }

  /**
   * Validate file type using magic bytes (file signatures)
   * This prevents documents disguised with wrong extensions
   */
  private async validateFileType(
    blobClient: BlobClient,
    documentFileName: string,
    contentType: string
  ): Promise<SecurityCheckResult> {
    try {
      // Read first 8 bytes to check magic bytes
      const downloadResponse = await blobClient.download(0, 8);
      const blobReadableStream = downloadResponse.readableStreamBody;

      if (!blobReadableStream) {
        return {
          checkType: 'file-type-validation',
          passed: false,
          timestamp: new Date().toISOString(),
          details: 'Could not read file for type validation',
          riskLevel: 'medium',
        };
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of blobReadableStream as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      const fileBytes = buffer;

      // Check if content type is in allowed list
      if (!this.config.allowedFileTypes.includes(contentType)) {
        return {
          checkType: 'file-type-validation',
          passed: false,
          timestamp: new Date().toISOString(),
          details: `Content type ${contentType} not in allowed list`,
          riskLevel: 'high',
        };
      }

      // Verify magic bytes match content type
      const magicSignatures = MAGIC_BYTES[contentType];
      if (magicSignatures) {
        const matchesSignature = magicSignatures.some((signature) =>
          fileBytes.slice(0, signature.length).equals(signature)
        );

        if (!matchesSignature) {
          return {
            checkType: 'file-type-validation',
            passed: false,
            timestamp: new Date().toISOString(),
            details: `File magic bytes do not match content type ${contentType}. File may be disguised.`,
            riskLevel: 'high',
          };
        }
      }

      return {
        checkType: 'file-type-validation',
        passed: true,
        timestamp: new Date().toISOString(),
        details: `Content type validated: ${contentType}`,
        riskLevel: 'low',
      };
    } catch (error: any) {
      this.context.error(
        `File type validation error for ${documentFileName}: ${error.message}`
      );
      return {
        checkType: 'file-type-validation',
        passed: false,
        timestamp: new Date().toISOString(),
        details: `Validation error: ${error.message}`,
        riskLevel: 'medium',
      };
    }
  }

  /**
   * Perform virus scan using Microsoft Defender for Cloud
   * This integrates with Azure's built-in malware scanning capabilities
   *
   * Implementation notes:
   * - Microsoft Defender for Storage provides malware scanning for Azure Blob Storage
   * - Scans are performed asynchronously by Azure infrastructure
   * - Results are available through Azure Security Center API
   * - Cost: $0.15 per GB scanned
   *
   * For now, this method returns a placeholder result that indicates
   * the scan has been initiated. In production, you would poll the
   * Azure Security Center API for scan results.
   */
  private async performVirusScan(
    blobClient: BlobClient,
    documentFileName: string,
    _fileSizeBytes: number
  ): Promise<SecurityCheckResult> {
    try {
      const clam = new ClamAVService(this.context);
      return await clam.scanBlob(blobClient, documentFileName);
    } catch (error: any) {
      this.context.error(`Virus scan error for ${documentFileName}: ${error.message}`);
      return {
        checkType: 'virus-scan',
        passed: false,
        timestamp: new Date().toISOString(),
        details: `Virus scan failed: ${error.message}`,
        riskLevel: 'critical',
      };
    }
  }

  /**
   * Perform content filtering (basic rules)
   * This can be extended with more sophisticated content analysis
   */
  private async performContentFiltering(
    blobClient: BlobClient,
    documentFileName: string
  ): Promise<SecurityCheckResult> {
    try {
      // Basic content filtering rules
      const suspiciousPatterns = [
        /\.(exe|bat|cmd|sh|ps1|zip)$/i, // Executable files
        /\.(scr|vbs|vbe|js|jse|wsf)$/i, // Script files
      ];

      const fileName = documentFileName.toLowerCase();
      const isSuspicious = suspiciousPatterns.some((pattern) =>
        pattern.test(fileName)
      );

      if (isSuspicious) {
        return {
          checkType: 'content-filter',
          passed: false,
          timestamp: new Date().toISOString(),
          details: `File extension matched suspicious pattern`,
          riskLevel: 'high',
        };
      }

      return {
        checkType: 'content-filter',
        passed: true,
        timestamp: new Date().toISOString(),
        details: `Content filter passed`,
        riskLevel: 'low',
      };
    } catch (error: any) {
      this.context.error(
        `Content filter error for ${documentFileName}: ${error.message}`
      );
      return {
        checkType: 'content-filter',
        passed: false,
        timestamp: new Date().toISOString(),
        details: `Content filter error: ${error.message}`,
        riskLevel: 'medium',
      };
    }
  }

  /**
   * Determine overall risk level from individual check results
   */
  static getOverallRiskLevel(results: SecurityCheckResult[]): 'clean' | 'suspicious' | 'malicious' | 'unknown' {
    const riskLevels = results.map((r) => r.riskLevel || 'low');

    if (riskLevels.includes('critical')) return 'malicious';
    if (riskLevels.includes('high')) return 'suspicious';
    if (riskLevels.includes('medium')) return 'suspicious';
    return 'clean';
  }

  /**
   * Check if all security checks passed
   */
  static allChecksPassed(results: SecurityCheckResult[]): boolean {
    return results.every((result) => result.passed);
  }
}
