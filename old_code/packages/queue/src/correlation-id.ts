/**
 * Correlation ID Utilities
 * 
 * Provides utilities for generating and managing correlation IDs
 * for distributed tracing across jobs and services
 */

import { randomUUID } from 'crypto';

/**
 * Generate a new correlation ID
 * Uses UUID v4 for uniqueness
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from job data
 * Supports various job message types
 */
export function extractCorrelationId(jobData: any): string | undefined {
  if (!jobData || typeof jobData !== 'object') {
    return undefined;
  }

  // Direct correlationId field
  if (jobData.correlationId && typeof jobData.correlationId === 'string') {
    return jobData.correlationId;
  }

  // Check nested objects
  if (jobData.data && typeof jobData.data === 'object') {
    if (jobData.data.correlationId && typeof jobData.data.correlationId === 'string') {
      return jobData.data.correlationId;
    }
  }

  return undefined;
}

/**
 * Ensure a correlation ID exists, generating one if needed
 */
export function ensureCorrelationId(jobData: any): string {
  const existing = extractCorrelationId(jobData);
  if (existing) {
    return existing;
  }

  const newId = generateCorrelationId();
  
  // Add to job data if it's an object
  if (jobData && typeof jobData === 'object') {
    jobData.correlationId = newId;
  }

  return newId;
}
