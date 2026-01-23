/**
 * Input Sanitization Utilities
 * 
 * Sanitizes user input to prevent prompt injection attacks and ensure
 * safe AI model interactions.
 */

/**
 * Sanitize user query to prevent prompt injection
 * Removes code blocks, system message markers, and limits length
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove code blocks that might contain instructions
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '[code block removed]');

  // Remove potential system message injections
  sanitized = sanitized.replace(/\[SYSTEM\]|\[INST\]|\[\/INST\]/gi, '');

  // Remove common prompt injection patterns
  sanitized = sanitized.replace(/ignore\s+(previous|above|all)\s+(instructions?|prompts?)/gi, '');
  sanitized = sanitized.replace(/forget\s+(previous|above|all)\s+(instructions?|prompts?)/gi, '');
  sanitized = sanitized.replace(/new\s+(instructions?|prompts?|task)/gi, '');

  // Limit length to prevent token exhaustion
  const MAX_LENGTH = 4000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}

/**
 * Sanitize context data before including in prompts
 * Removes sensitive identifiers and credentials
 */
export function sanitizeContextData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip system identifiers
    if (['id', 'tenantId', 'userId', 'createdBy', 'updatedBy'].includes(key)) {
      continue;
    }

    // Skip credential fields
    if (['password', 'apiKey', 'secret', 'token', 'connectionString', 'accessToken', 'refreshToken'].includes(key.toLowerCase())) {
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeContextData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Detect potential credential leakage in text
 */
export function detectCredentials(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const credentialPatterns = [
    /password["\s:]+[\w!@#$%^&*]+/i,
    /api[_-]?key["\s:]+[\w-]+/i,
    /secret["\s:]+[\w-]+/i,
    /Bearer\s+[\w-]+/i,
    /token["\s:]+[\w-]+/i,
    /connection[_-]?string["\s:]+[\w:;=]+/i,
  ];

  return credentialPatterns.some(pattern => pattern.test(text));
}

