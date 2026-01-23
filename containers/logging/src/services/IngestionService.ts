/**
 * Ingestion Service
 * Handles log ingestion via API and events
 */

import { randomUUID } from 'crypto';
import { IStorageProvider } from './providers/storage/IStorageProvider';
import {
  AuditLog,
  CreateLogInput,
  LogCategory,
  LogSeverity,
  OrganizationConfig,
} from '../types';
import { generateLogHash } from '../utils/hash';
import { redactMessage, redactObject, compilePatterns } from '../utils/redaction';
import { log } from '../utils/logger';
import { getConfig } from '../config';
import { ISIEMProvider } from './providers/siem/ISIEMProvider';

export interface IngestionServiceDeps {
  storageProvider: IStorageProvider;
  getOrganizationConfig: (orgId: string) => Promise<OrganizationConfig | null>;
  siemProvider?: ISIEMProvider; // Optional SIEM provider for external log forwarding
}

export class IngestionService {
  private storage: IStorageProvider;
  private getOrgConfig: (orgId: string) => Promise<OrganizationConfig | null>;
  private siemProvider: ISIEMProvider | null;
  private buffer: AuditLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastHash: string | null = null;
  private lastHashOrg: string | null = null;
  
  constructor(deps: IngestionServiceDeps) {
    this.storage = deps.storageProvider;
    this.getOrgConfig = deps.getOrganizationConfig;
    this.siemProvider = deps.siemProvider || null;
    
    // Start flush timer
    this.startFlushTimer();
  }
  
  /**
   * Ingest a single log entry
   */
  async ingest(input: CreateLogInput, context?: {
    organizationId?: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const config = getConfig();
    
    // Merge context with input
    const organizationId = input.organizationId || context?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    
    // Get organization config for redaction settings
    const orgConfig = await this.getOrgConfig(organizationId);
    
    // Process the log entry
    const processedLog = await this.processLogEntry(
      {
        ...input,
        organizationId,
        userId: input.userId || context?.userId,
        sessionId: input.sessionId || context?.sessionId,
        ipAddress: input.ipAddress || context?.ipAddress,
        userAgent: input.userAgent || context?.userAgent,
      },
      orgConfig,
      config
    );
    
    // Store immediately or buffer based on config
    if (config.ingestion.buffer.enabled) {
      this.buffer.push(processedLog);
      
      // Flush if buffer is full
      if (this.buffer.length >= config.ingestion.batch_size) {
        await this.flush();
      }
      
      // Send to SIEM if enabled (after buffering, will be sent on flush)
      return processedLog;
    }
    
    // Store immediately
    const storedLog = await this.storage.store(processedLog);
    
    // Send to SIEM if enabled
    await this.sendToSIEM(storedLog);
    
    return storedLog;
  }
  
  /**
   * Ingest multiple log entries
   */
  async ingestBatch(inputs: CreateLogInput[], context?: {
    organizationId?: string;
    userId?: string;
    sessionId?: string;
  }): Promise<AuditLog[]> {
    const config = getConfig();
    const results: AuditLog[] = [];
    
    for (const input of inputs) {
      const organizationId = input.organizationId || context?.organizationId;
      if (!organizationId) {
        log.warn('Skipping log entry without organization ID', { action: input.action });
        continue;
      }
      
      const orgConfig = await this.getOrgConfig(organizationId);
      
      const processedLog = await this.processLogEntry(
        {
          ...input,
          organizationId,
          userId: input.userId || context?.userId,
          sessionId: input.sessionId || context?.sessionId,
        },
        orgConfig,
        config
      );
      
      results.push(processedLog);
    }
    
    // Store batch
    if (results.length > 0) {
      if (config.ingestion.buffer.enabled) {
        this.buffer.push(...results);
        
        if (this.buffer.length >= config.ingestion.batch_size) {
          await this.flush();
        }
      } else {
        await this.storage.storeBatch(results);
        // Send to SIEM if enabled (batch mode)
        await this.sendBatchToSIEM(results);
      }
    }
    
    return results;
  }
  
  /**
   * Process a log entry (redaction, hash generation)
   */
  private async processLogEntry(
    input: CreateLogInput & { organizationId: string },
    orgConfig: OrganizationConfig | null,
    config: ReturnType<typeof getConfig>
  ): Promise<AuditLog> {
    const id = randomUUID();
    const now = new Date();
    
    // Determine capture settings
    const captureIp = orgConfig?.captureIpAddress ?? config.defaults.capture.ip_address;
    const captureUserAgent = orgConfig?.captureUserAgent ?? config.defaults.capture.user_agent;
    const captureGeolocation = orgConfig?.captureGeolocation ?? config.defaults.capture.geolocation;
    
    // Apply redaction if enabled
    let message = input.message;
    let metadata = input.metadata || {};
    
    const shouldRedact = orgConfig?.redactSensitiveData ?? config.defaults.redaction.enabled;
    if (shouldRedact) {
      const patterns = orgConfig?.redactionPatterns || config.defaults.redaction.patterns;
      message = redactMessage(message, patterns);
      metadata = redactObject(metadata, {
        keyPatterns: compilePatterns(patterns),
      });
    }
    
    // Get previous hash for hash chain
    const hashChainEnabled = orgConfig?.hashChainEnabled ?? config.defaults.hash_chain.enabled;
    let previousHash: string | null = null;
    
    if (hashChainEnabled) {
      // If same org as last hash, use cached value
      if (this.lastHashOrg === input.organizationId && this.lastHash) {
        previousHash = this.lastHash;
      } else {
        // Fetch from storage
        const lastLog = await this.storage.getLastLog(input.organizationId);
        previousHash = lastLog?.hash || null;
      }
    }
    
    // Build the log entry
    const logEntry: Omit<AuditLog, 'hash' | 'createdAt'> = {
      id,
      organizationId: input.organizationId,
      timestamp: now,
      receivedAt: now,
      userId: input.userId || null,
      sessionId: input.sessionId || null,
      ipAddress: captureIp ? (input.ipAddress || null) : null,
      userAgent: captureUserAgent ? (input.userAgent || null) : null,
      geolocation: captureGeolocation ? (input.geolocation || null) : null,
      action: input.action,
      category: input.category || LogCategory.ACTION,
      severity: input.severity || LogSeverity.INFO,
      resourceType: input.resourceType || null,
      resourceId: input.resourceId || null,
      message,
      metadata,
      previousHash,
      source: input.source || 'api',
      correlationId: input.correlationId || null,
    };
    
    // Generate hash
    const hash = hashChainEnabled
      ? generateLogHash(logEntry, previousHash, config.defaults.hash_chain.algorithm)
      : randomUUID(); // Use UUID as placeholder if hash chain disabled
    
    // Update cached hash
    if (hashChainEnabled) {
      this.lastHash = hash;
      this.lastHashOrg = input.organizationId;
    }
    
    return {
      ...logEntry,
      hash,
      createdAt: now,
    };
  }
  
  /**
   * Flush buffered logs to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    
    const toFlush = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.storage.storeBatch(toFlush);
      log.info('Flushed buffered logs', { count: toFlush.length });
      
      // Send to SIEM after successful storage
      await this.sendBatchToSIEM(toFlush);
    } catch (error) {
      log.error('Failed to flush logs, re-buffering', error, { count: toFlush.length });
      // Re-add to buffer (at the front to maintain order)
      this.buffer = [...toFlush, ...this.buffer];
      throw error;
    }
  }
  
  /**
   * Send log to SIEM provider if enabled
   */
  private async sendToSIEM(logEntry: AuditLog): Promise<void> {
    if (!this.siemProvider) {
      return;
    }
    
    try {
      await this.siemProvider.sendLog(logEntry);
    } catch (error) {
      // Don't fail ingestion if SIEM fails - log error but continue
      log.error('Failed to send log to SIEM', error, { logId: logEntry.id });
    }
  }
  
  /**
   * Send batch of logs to SIEM provider if enabled
   */
  private async sendBatchToSIEM(logs: AuditLog[]): Promise<void> {
    if (!this.siemProvider || logs.length === 0) {
      return;
    }
    
    try {
      await this.siemProvider.sendBatch(logs);
    } catch (error) {
      // Don't fail ingestion if SIEM fails - log error but continue
      log.error('Failed to send batch logs to SIEM', error, { count: logs.length });
    }
  }
  
  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    const config = getConfig();
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        log.error('Periodic flush failed', error);
      }
    }, config.ingestion.flush_interval_ms);
  }
  
  /**
   * Stop the flush timer and flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Final flush
    await this.flush();
  }
  
  /**
   * Get buffer size (for monitoring)
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

