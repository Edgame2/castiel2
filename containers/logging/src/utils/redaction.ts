/**
 * Data Redaction Utilities
 * Per ModuleImplementationGuide Section 11.5
 */

/**
 * Sensitive field patterns that should be redacted
 */
const DEFAULT_SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /credential/i,
  /private_key/i,
  /access_key/i,
];

/**
 * Patterns for sensitive values (e.g., emails, credit cards)
 */
const VALUE_PATTERNS = [
  // Email
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REDACTED]' },
  // Credit card (basic pattern)
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD REDACTED]' },
  // SSN (basic pattern)
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
  // Phone number (basic pattern)
  { pattern: /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[PHONE REDACTED]' },
];

/**
 * Compile custom patterns from config
 */
export function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map(p => {
    try {
      return new RegExp(p, 'gi');
    } catch {
      // If pattern is invalid regex, treat as literal string
      return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    }
  });
}

/**
 * Check if a key is sensitive
 */
export function isSensitiveKey(key: string, customPatterns?: RegExp[]): boolean {
  const patterns = [...DEFAULT_SENSITIVE_PATTERNS, ...(customPatterns || [])];
  return patterns.some(pattern => pattern.test(key));
}

/**
 * Redact sensitive values in a string
 */
export function redactString(value: string, customPatterns?: Array<{ pattern: RegExp; replacement: string }>): string {
  let result = value;
  
  const patterns = [...VALUE_PATTERNS, ...(customPatterns || [])];
  
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Redact sensitive data from an object
 */
export function redactObject<T extends Record<string, any>>(
  obj: T,
  options: {
    keyPatterns?: RegExp[];
    valuePatterns?: Array<{ pattern: RegExp; replacement: string }>;
    maxDepth?: number;
  } = {}
): T {
  const { keyPatterns = [], valuePatterns = [], maxDepth = 10 } = options;
  
  function redact(value: any, depth: number): any {
    if (depth > maxDepth) {
      return '[MAX DEPTH EXCEEDED]';
    }
    
    if (value === null || value === undefined) {
      return value;
    }
    
    if (typeof value === 'string') {
      return redactString(value, valuePatterns);
    }
    
    if (Array.isArray(value)) {
      return value.map(item => redact(item, depth + 1));
    }
    
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      
      for (const key of Object.keys(value)) {
        if (isSensitiveKey(key, keyPatterns)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = redact(value[key], depth + 1);
        }
      }
      
      return result;
    }
    
    return value;
  }
  
  return redact(obj, 0) as T;
}

/**
 * Redact sensitive data from a message string
 */
export function redactMessage(
  message: string,
  customPatterns?: string[]
): string {
  let result = message;
  
  // Apply value patterns
  for (const { pattern, replacement } of VALUE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  
  // Apply custom patterns
  if (customPatterns) {
    const compiled = compilePatterns(customPatterns);
    for (const pattern of compiled) {
      result = result.replace(pattern, '[REDACTED]');
    }
  }
  
  return result;
}



