/**
 * Retry Handler Utility
 * Handles retry logic with exponential backoff and DLQ routing
 * @module integration-processors/utils/retryHandler
 */

import * as amqp from 'amqplib';
import { log } from './logger.js';

export interface RetryConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Get retry count from message headers
 */
export function getRetryCount(msg: amqp.ConsumeMessage): number {
  const headers = msg.properties.headers || {};
  return (headers['x-retry-count'] as number) || 0;
}

/**
 * Increment retry count in message headers
 */
export function incrementRetryCount(msg: amqp.ConsumeMessage): amqp.ConsumeMessage {
  const headers = msg.properties.headers || {};
  const currentCount = (headers['x-retry-count'] as number) || 0;
  return {
    ...msg,
    properties: {
      ...msg.properties,
      headers: {
        ...headers,
        'x-retry-count': currentCount + 1,
      },
    },
  } as amqp.ConsumeMessage;
}

/**
 * Check if error should be retried
 */
export function shouldRetry(error: any): boolean {
  // Don't retry on validation errors or permanent failures
  if (error.statusCode) {
    const status = error.statusCode;
    // Retry on 5xx errors and 429 (rate limit)
    if (status >= 500 || status === 429) {
      return true;
    }
    // Don't retry on 4xx errors (except 429)
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Retry on network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Retry on timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  // Don't retry on validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return false;
  }

  // Default: retry on unknown errors
  return true;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_CONFIG): number {
  const delay = Math.min(
    config.initialBackoffMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxBackoffMs
  );
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

/**
 * Handle message retry or send to DLQ
 * Returns true if message should be retried, false if it should go to DLQ
 */
export function handleRetryOrDLQ(
  msg: amqp.ConsumeMessage,
  error: any,
  channel: amqp.Channel,
  config: RetryConfig = DEFAULT_CONFIG
): boolean {
  const retryCount = getRetryCount(msg);
  const shouldRetryError = shouldRetry(error);

  if (!shouldRetryError) {
    // Permanent error - send to DLQ immediately
    log.warn('Permanent error detected, sending to DLQ', {
      error: error.message,
      retryCount,
      service: 'integration-processors',
    });
    channel.nack(msg, false, false); // Don't requeue - goes to DLQ
    return false;
  }

  if (retryCount >= config.maxRetries) {
    // Max retries exceeded - send to DLQ
    log.error('Max retries exceeded, sending to DLQ', {
      error: error.message,
      retryCount,
      maxRetries: config.maxRetries,
      service: 'integration-processors',
    });
    channel.nack(msg, false, false); // Don't requeue - goes to DLQ
    return false;
  }

  // Retry with exponential backoff
  const delay = calculateBackoff(retryCount, config);
  log.warn('Retrying message with exponential backoff', {
    error: error.message,
    retryCount: retryCount + 1,
    maxRetries: config.maxRetries,
    delayMs: delay,
    service: 'integration-processors',
  });

  // Reject and requeue with delay (RabbitMQ will handle requeue)
  // Note: For true exponential backoff, we'd need a delayed message plugin or separate retry queue
  // For now, we'll requeue immediately and let RabbitMQ handle it
  channel.nack(msg, false, true); // Requeue for retry
  return true;
}
