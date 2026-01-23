/**
 * Prompt Injection Defense Service
 * Detects and prevents prompt injection attacks
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface InjectionDetection {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patterns: string[];
  sanitized: string;
}

export class PromptInjectionDefenseService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;

  // Common prompt injection patterns
  private readonly INJECTION_PATTERNS = [
    /ignore\s+(previous|above|all)\s+instructions/i,
    /system\s*:\s*you\s+are/i,
    /\[INST\]|\[/INST\]/i,
    /<\|im_start\|>|<\|im_end\|>/i,
  ];

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Detect prompt injection
   */
  async detectInjection(tenantId: string, input: string): Promise<InjectionDetection> {
    try {
      const patterns: string[] = [];
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // Check for injection patterns
      for (const pattern of this.INJECTION_PATTERNS) {
        if (pattern.test(input)) {
          patterns.push(pattern.source);
          if (severity === 'low') severity = 'medium';
        }
      }

      // Check for suspicious length (very long inputs might be injection attempts)
      if (input.length > 10000) {
        patterns.push('excessive_length');
        severity = severity === 'low' ? 'medium' : severity;
      }

      // Sanitize input
      let sanitized = input;
      if (patterns.length > 0) {
        // Remove injection patterns
        for (const pattern of this.INJECTION_PATTERNS) {
          sanitized = sanitized.replace(pattern, '');
        }
        // Trim excessive whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
      }

      return {
        detected: patterns.length > 0,
        severity,
        patterns,
        sanitized,
      };
    } catch (error: any) {
      log.error('Failed to detect prompt injection', error, {
        tenantId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }
}
