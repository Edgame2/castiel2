/**
 * Prompt Injection Defense Service
 * Phase 3.3: Enhanced Prompt Injection Defense
 * 
 * Implements multi-layer defense against prompt injection attacks:
 * 1. Input sanitization (first layer)
 * 2. Pattern detection (second layer)
 * 3. Prompt structure enforcement (third layer)
 * 4. Output validation (fourth layer)
 * 5. Behavioral monitoring (ongoing)
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import type { LLMService } from './llm.service.js';
import {
  InjectionDetectionResult,
  DetectedPattern,
  InjectionPatternType,
  PromptStructureValidationResult,
  OutputValidationResult,
  PromptInjectionDefenseConfig,
  SanitizationResult,
  BehavioralMetrics,
} from '../types/prompt-injection-defense.types.js';

/**
 * Default defense configuration
 */
export const DEFAULT_DEFENSE_CONFIG: Omit<PromptInjectionDefenseConfig, 'tenantId' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  enabled: true,
  enableInputSanitization: true,
  sanitizationLevel: 'standard',
  enablePatternDetection: true,
  patternDatabase: 'extended',
  enableSemanticAnalysis: false, // Phase 3.3: Can be enabled when ML model is available
  enableStructureEnforcement: true,
  useDelimiters: true,
  delimiterType: 'xml',
  enableOutputValidation: true,
  outputValidationLevel: 'standard',
  enableBehavioralMonitoring: true,
  trackSanitizationSuccess: true,
  alertThreshold: 70, // Risk score threshold
  actionOnDetection: 'sanitize',
  actionOnOutputAnomaly: 'warn',
};

/**
 * Known injection patterns database
 */
const INJECTION_PATTERNS: Array<{
  type: InjectionPatternType;
  patterns: RegExp[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = [
  // System message injection
  {
    type: InjectionPatternType.SYSTEM_MESSAGE_INJECTION,
    patterns: [
      /\[SYSTEM\]/gi,
      /\[INST\]/gi,
      /\[\/INST\]/gi,
      /<\|system\|>/gi,
      /<\|assistant\|>/gi,
      /You are now/gi,
      /From now on/gi,
    ],
    severity: 'high',
  },
  // Instruction override
  {
    type: InjectionPatternType.INSTRUCTION_OVERRIDE,
    patterns: [
      /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi,
      /forget\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi,
      /disregard\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi,
      /new\s+(instructions?|prompts?|task)/gi,
      /override\s+(previous|above|all)\s+(instructions?|prompts?)/gi,
      /instead\s+of\s+(previous|above|all)/gi,
    ],
    severity: 'critical',
  },
  // Role confusion
  {
    type: InjectionPatternType.ROLE_CONFUSION,
    patterns: [
      /you are\s+(now|a|an)\s+/gi,
      /act as\s+(a|an)\s+/gi,
      /pretend to be/gi,
      /roleplay as/gi,
      /simulate being/gi,
    ],
    severity: 'high',
  },
  // Context poisoning
  {
    type: InjectionPatternType.CONTEXT_POISONING,
    patterns: [
      /remember\s+that/gi,
      /always\s+(remember|think|say|do)/gi,
      /never\s+(forget|say|do)/gi,
      /in the future/gi,
      /from now on/gi,
    ],
    severity: 'medium',
  },
  // Output manipulation
  {
    type: InjectionPatternType.OUTPUT_MANIPULATION,
    patterns: [
      /output\s+(only|just|exactly)/gi,
      /respond\s+(only|just|exactly)/gi,
      /say\s+(only|just|exactly)/gi,
      /format\s+your\s+response/gi,
      /structure\s+your\s+response/gi,
    ],
    severity: 'medium',
  },
  // Token exhaustion
  {
    type: InjectionPatternType.TOKEN_EXHAUSTION,
    patterns: [
      /repeat\s+\w+\s+\d+/gi,
      /say\s+\w+\s+\d+\s+times/gi,
      /output\s+\d+\s+times/gi,
    ],
    severity: 'low',
  },
  // Encoding bypass attempts
  {
    type: InjectionPatternType.ENCODING_BYPASS,
    patterns: [
      /%[0-9A-F]{2}/gi, // URL encoding
      /\\x[0-9A-F]{2}/gi, // Hex encoding
      /\\u[0-9A-F]{4}/gi, // Unicode encoding
      /&#\d+;/gi, // HTML entity
    ],
    severity: 'medium',
  },
];

export class PromptInjectionDefenseService {
  private configs: Map<string, PromptInjectionDefenseConfig> = new Map(); // tenantId -> config
  private behavioralMetrics: Map<string, BehavioralMetrics> = new Map(); // tenantId -> metrics

  constructor(
    private monitoring: IMonitoringProvider,
    private llmService?: LLMService // Optional, for semantic analysis
  ) {}

  /**
   * Configure defense for a tenant
   */
  async configureDefense(
    tenantId: string,
    config: Partial<PromptInjectionDefenseConfig>,
    userId: string
  ): Promise<void> {
    const existingConfig = this.configs.get(tenantId);
    const newConfig: PromptInjectionDefenseConfig = {
      tenantId,
      ...DEFAULT_DEFENSE_CONFIG,
      ...existingConfig,
      ...config,
      updatedAt: new Date(),
      updatedBy: userId,
      createdAt: existingConfig?.createdAt ?? new Date(),
    };

    this.configs.set(tenantId, newConfig);

    this.monitoring.trackEvent('prompt-injection-defense.config-updated', {
      tenantId,
      enabled: newConfig.enabled,
      sanitizationLevel: newConfig.sanitizationLevel,
    });
  }

  /**
   * Get defense configuration for a tenant
   */
  getConfig(tenantId: string): PromptInjectionDefenseConfig | null {
    return this.configs.get(tenantId) || null;
  }

  /**
   * Phase 3.3: Layer 1 - Sanitize input with enhanced patterns
   */
  sanitizeInput(input: string, tenantId: string): SanitizationResult {
    const config = this.getConfig(tenantId);
    
    if (!config || !config.enabled || !config.enableInputSanitization) {
      return {
        original: input,
        sanitized: input,
        removed: [],
        detected: {
          detected: false,
          confidence: 0,
          severity: 'low',
          patterns: [],
          riskScore: 0,
          recommendations: [],
        },
        sanitizedAt: new Date(),
      };
    }

    let sanitized = input.trim();
    const removed: string[] = [];
    const detectedPatterns: DetectedPattern[] = [];

    // Detect and remove injection patterns
    for (const patternGroup of INJECTION_PATTERNS) {
      for (const pattern of patternGroup.patterns) {
        const matches = sanitized.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            const matchedText = match[0];
            removed.push(matchedText);
            detectedPatterns.push({
              type: patternGroup.type,
              pattern: pattern.source,
              matchedText,
              position: match.index,
              confidence: 0.8, // High confidence for regex matches
            });
            // Remove the matched text
            sanitized = sanitized.replace(matchedText, '');
          }
        }
      }
    }

    // Remove code blocks (potential instruction hiding)
    const codeBlockMatches = sanitized.matchAll(/```[\s\S]*?```/g);
    for (const match of codeBlockMatches) {
      removed.push(match[0]);
      sanitized = sanitized.replace(match[0], '[code block removed]');
    }

    // Apply length limits based on sanitization level
    const maxLengths = {
      basic: 5000,
      standard: 4000,
      strict: 3000,
    };
    const maxLength = maxLengths[config.sanitizationLevel];
    if (sanitized.length > maxLength) {
      const removedText = sanitized.substring(maxLength);
      removed.push(`[truncated: ${removedText.length} chars]`);
      sanitized = sanitized.substring(0, maxLength);
    }

    // Detect injection
    const detection = this.detectInjection(input, tenantId);
    detection.patterns = detectedPatterns;

    // Update behavioral metrics
    this.updateBehavioralMetrics(tenantId, detection, removed.length > 0);

    return {
      original: input,
      sanitized: sanitized.trim(),
      removed,
      detected: detection,
      sanitizedAt: new Date(),
    };
  }

  /**
   * Phase 3.3: Layer 2 - Detect injection patterns
   */
  detectInjection(input: string, tenantId: string): InjectionDetectionResult {
    const config = this.getConfig(tenantId);
    
    if (!config || !config.enabled || !config.enablePatternDetection) {
      return {
        detected: false,
        confidence: 0,
        severity: 'low',
        patterns: [],
        riskScore: 0,
        recommendations: [],
      };
    }

    const detectedPatterns: DetectedPattern[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let totalConfidence = 0;

    // Check against known patterns
    for (const patternGroup of INJECTION_PATTERNS) {
      for (const pattern of patternGroup.patterns) {
        const matches = input.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            detectedPatterns.push({
              type: patternGroup.type,
              pattern: pattern.source,
              matchedText: match[0],
              position: match.index,
              confidence: 0.8,
            });
            totalConfidence += 0.8;
            
            // Update max severity
            if (patternGroup.severity === 'critical' || 
                (patternGroup.severity === 'high' && maxSeverity !== 'critical') ||
                (patternGroup.severity === 'medium' && !['critical', 'high'].includes(maxSeverity)) ||
                (patternGroup.severity === 'low' && maxSeverity === 'low')) {
              maxSeverity = patternGroup.severity;
            }
          }
        }
      }
    }

    // Semantic analysis (if enabled and LLM service available)
    if (config.enableSemanticAnalysis && this.llmService && detectedPatterns.length === 0) {
      // Phase 3.3: Can be enhanced with actual semantic analysis
      // For now, check for suspicious instruction-like patterns
      const suspiciousPatterns = [
        /\b(you must|you should|you need to|you have to)\b/gi,
        /\b(do not|don't|never)\s+(follow|obey|use)\s+(the|these|previous)\s+(instructions?|rules?|prompts?)/gi,
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(input)) {
          detectedPatterns.push({
            type: InjectionPatternType.SEMANTIC_INJECTION,
            pattern: pattern.source,
            matchedText: input.match(pattern)?.[0] || '',
            position: 0,
            confidence: 0.5, // Lower confidence for semantic detection
          });
          totalConfidence += 0.5;
          if (maxSeverity === 'low') {
            maxSeverity = 'medium';
          }
        }
      }
    }

    const detected = detectedPatterns.length > 0;
    const averageConfidence = detectedPatterns.length > 0 
      ? totalConfidence / detectedPatterns.length 
      : 0;

    // Calculate risk score (0-100)
    const severityWeights = { low: 20, medium: 50, high: 80, critical: 100 };
    const riskScore = detected
      ? Math.min(100, severityWeights[maxSeverity] * averageConfidence)
      : 0;

    const recommendations: string[] = [];
    if (detected) {
      recommendations.push(`Detected ${detectedPatterns.length} potential injection pattern(s)`);
      if (maxSeverity === 'critical' || maxSeverity === 'high') {
        recommendations.push('Input has been sanitized. Please review and resubmit if needed.');
      }
    }

    return {
      detected,
      confidence: averageConfidence,
      severity: maxSeverity,
      patterns: detectedPatterns,
      riskScore,
      recommendations,
    };
  }

  /**
   * Phase 3.3: Layer 3 - Enforce prompt structure
   */
  enforcePromptStructure(
    systemPrompt: string,
    userPrompt: string,
    tenantId: string
  ): PromptStructureValidationResult {
    const config = this.getConfig(tenantId);
    
    if (!config || !config.enabled || !config.enableStructureEnforcement) {
      return {
        valid: true,
        issues: [],
        enforced: false,
      };
    }

    const issues: PromptStructureValidationResult['issues'] = [];
    let enforcedSystemPrompt = systemPrompt;
    let enforcedUserPrompt = userPrompt;

    // Apply delimiters if enabled
    if (config.useDelimiters) {
      const delimiters = this.getDelimiters(config);
      
      // Ensure system prompt has delimiters
      if (!enforcedSystemPrompt.includes(delimiters.systemStart)) {
        enforcedSystemPrompt = `${delimiters.systemStart}\n${enforcedSystemPrompt}\n${delimiters.systemEnd}`;
        issues.push({
          type: 'missing_delimiter',
          severity: 'medium',
          message: 'System prompt missing delimiters - added automatically',
        });
      }

      // Ensure user prompt has delimiters
      if (!enforcedUserPrompt.includes(delimiters.userStart)) {
        enforcedUserPrompt = `${delimiters.userStart}\n${enforcedUserPrompt}\n${delimiters.userEnd}`;
        issues.push({
          type: 'missing_delimiter',
          severity: 'medium',
          message: 'User prompt missing delimiters - added automatically',
        });
      }
    }

    // Validate boundaries are clear
    if (enforcedSystemPrompt.includes(enforcedUserPrompt) || enforcedUserPrompt.includes(enforcedSystemPrompt)) {
      issues.push({
        type: 'unclear_boundary',
        severity: 'high',
        message: 'System and user prompts have unclear boundaries',
      });
    }

    const valid = issues.filter(i => i.severity === 'high').length === 0;
    const enforced = issues.length > 0;

    return {
      valid,
      issues,
      enforced,
      correctedPrompt: enforced ? `${enforcedSystemPrompt}\n\n${enforcedUserPrompt}` : undefined,
    };
  }

  /**
   * Phase 3.3: Layer 4 - Validate output for injection indicators
   */
  validateOutput(output: string, tenantId: string): OutputValidationResult {
    const config = this.getConfig(tenantId);
    
    if (!config || !config.enabled || !config.enableOutputValidation) {
      return {
        suspicious: false,
        indicators: [],
        riskScore: 0,
        action: 'allow',
      };
    }

    const indicators: OutputValidationResult['indicators'] = [];
    let riskScore = 0;

    // Check for instruction leakage
    const instructionPatterns = [
      /\[SYSTEM\]|\[INST\]|system\s+prompt|system\s+instructions?/gi,
      /ignore\s+(previous|above|all)\s+(instructions?|prompts?)/gi,
    ];
    for (const pattern of instructionPatterns) {
      if (pattern.test(output)) {
        indicators.push({
          type: 'instruction_leakage',
          severity: 'high',
          description: 'Output contains system instruction references',
          evidence: output.match(pattern)?.[0] || '',
        });
        riskScore += 30;
      }
    }

    // Check for role confusion
    const rolePatterns = [
      /I am (now|a|an)\s+/gi,
      /I will act as/gi,
      /I'm pretending to be/gi,
    ];
    for (const pattern of rolePatterns) {
      if (pattern.test(output)) {
        indicators.push({
          type: 'role_confusion',
          severity: 'medium',
          description: 'Output suggests role confusion',
          evidence: output.match(pattern)?.[0] || '',
        });
        riskScore += 20;
      }
    }

    // Check for format anomalies
    if (output.includes('```') && output.split('```').length > 3) {
      indicators.push({
        type: 'format_anomaly',
        severity: 'low',
        description: 'Unusual code block formatting',
        evidence: 'Multiple code blocks detected',
      });
      riskScore += 10;
    }

    // Check for unusual patterns (repetition, excessive length)
    if (output.length > 10000) {
      indicators.push({
        type: 'unusual_pattern',
        severity: 'medium',
        description: 'Output is unusually long',
        evidence: `Length: ${output.length} characters`,
      });
      riskScore += 15;
    }

    const suspicious = indicators.length > 0;
    const action = riskScore >= 50 
      ? (config.actionOnOutputAnomaly === 'block' ? 'block' : 'warn')
      : 'allow';

    return {
      suspicious,
      indicators,
      riskScore: Math.min(100, riskScore),
      action,
    };
  }

  /**
   * Get delimiters based on configuration
   */
  private getDelimiters(config: PromptInjectionDefenseConfig): {
    systemStart: string;
    systemEnd: string;
    userStart: string;
    userEnd: string;
  } {
    if (config.customDelimiters) {
      return config.customDelimiters;
    }

    switch (config.delimiterType) {
      case 'xml':
        return {
          systemStart: '<system>',
          systemEnd: '</system>',
          userStart: '<user>',
          userEnd: '</user>',
        };
      case 'markdown':
        return {
          systemStart: '## SYSTEM INSTRUCTIONS',
          systemEnd: '## END SYSTEM INSTRUCTIONS',
          userStart: '## USER INPUT',
          userEnd: '## END USER INPUT',
        };
      default:
        return {
          systemStart: '<system>',
          systemEnd: '</system>',
          userStart: '<user>',
          userEnd: '</user>',
        };
    }
  }

  /**
   * Update behavioral metrics
   */
  private updateBehavioralMetrics(
    tenantId: string,
    detection: InjectionDetectionResult,
    wasSanitized: boolean
  ): void {
    const config = this.getConfig(tenantId);
    if (!config || !config.enableBehavioralMonitoring) {
      return;
    }

    const metrics = this.behavioralMetrics.get(tenantId) || {
      totalRequests: 0,
      detections: 0,
      blockedRequests: 0,
      sanitizedRequests: 0,
      outputAnomalies: 0,
      successRate: 100,
      averageRiskScore: 0,
      patternFrequency: {} as Record<InjectionPatternType, number>,
      timestamp: new Date(),
    };

    metrics.totalRequests++;
    if (detection.detected) {
      metrics.detections++;
      if (wasSanitized) {
        metrics.sanitizedRequests++;
      }
      if (config.actionOnDetection === 'block') {
        metrics.blockedRequests++;
      }
      
      // Update pattern frequency
      for (const pattern of detection.patterns) {
        metrics.patternFrequency[pattern.type] = 
          (metrics.patternFrequency[pattern.type] || 0) + 1;
      }
    }

    // Update average risk score
    metrics.averageRiskScore = 
      (metrics.averageRiskScore * (metrics.totalRequests - 1) + detection.riskScore) / 
      metrics.totalRequests;

    // Update success rate
    metrics.successRate = 
      ((metrics.totalRequests - metrics.detections) / metrics.totalRequests) * 100;

    this.behavioralMetrics.set(tenantId, metrics);

    // Log metrics periodically
    if (metrics.totalRequests % 100 === 0) {
      this.monitoring.trackEvent('prompt-injection-defense.metrics', {
        tenantId,
        totalRequests: metrics.totalRequests,
        detections: metrics.detections,
        successRate: metrics.successRate,
        averageRiskScore: metrics.averageRiskScore,
      });
    }
  }

  /**
   * Get behavioral metrics for a tenant
   */
  getBehavioralMetrics(tenantId: string): BehavioralMetrics | null {
    return this.behavioralMetrics.get(tenantId) || null;
  }
}
