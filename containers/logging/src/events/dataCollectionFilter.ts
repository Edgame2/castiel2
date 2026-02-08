/**
 * Data collection filter: determine if an event should be stored in the main audit log
 * based on config.data_collection (AND of severity, category, resource_type, event_type).
 * When data_collection is absent, collection is enabled (collect all).
 */

import { CreateLogInput, LogCategory, LogSeverity } from '../types/log.types';
import type { LoggingConfig } from '../types/config.types';

/** Convert AMQP-style pattern to regex: * = one segment, # = zero or more segments */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^.]+')
    .replace(/#/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** Match event type against pattern (supports * and #). Most specific = longest pattern first. */
function matchEventType(eventType: string, patterns: string[]): string | null {
  const sorted = [...patterns].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    const re = patternToRegex(p);
    if (re.test(eventType)) return p;
  }
  return null;
}

/** Evaluate event_type dimension: allowlist, denylist, or explicit. Default when not listed = collect (true). */
function eventTypeAllowed(
  eventType: string,
  eventTypeConfig: NonNullable<LoggingConfig['data_collection']>['event_type']
): boolean {
  if (!eventTypeConfig) return true;
  const { mode, allow = [], deny = [], explicit = {} } = eventTypeConfig;

  if (mode === 'denylist') {
    const matched = matchEventType(eventType, deny);
    return !matched;
  }
  if (mode === 'allowlist') {
    const matched = matchEventType(eventType, allow);
    return !!matched;
  }
  if (mode === 'explicit') {
    const keys = Object.keys(explicit).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const re = patternToRegex(key);
      if (re.test(eventType)) return explicit[key] === true;
    }
    return true;
  }
  return true;
}

/** Evaluate severity: if listed and false, disable; otherwise collect. */
function severityAllowed(
  severity: LogSeverity | undefined,
  severityConfig: Record<string, boolean> | undefined
): boolean {
  if (!severityConfig) return true;
  const key = severity ?? LogSeverity.INFO;
  if (severityConfig[key] === false) return false;
  return true;
}

/** Evaluate category: if listed and false, disable; otherwise collect. */
function categoryAllowed(
  category: LogCategory | undefined,
  categoryConfig: Record<string, boolean> | undefined
): boolean {
  if (!categoryConfig) return true;
  const key = category ?? LogCategory.SYSTEM;
  if (categoryConfig[key] === false) return false;
  return true;
}

/** Evaluate resource_type: use default for null/empty; otherwise lookup. Not listed = collect. */
function resourceTypeAllowed(
  resourceType: string | null | undefined,
  resourceTypeConfig: NonNullable<LoggingConfig['data_collection']>['resource_type']
): boolean {
  if (!resourceTypeConfig) return true;
  const key = resourceType?.toLowerCase() ?? null;
  if (key === null || key === '') {
    return resourceTypeConfig.default !== false;
  }
  if (resourceTypeConfig[key] === false) return false;
  return true;
}

/**
 * Returns true if the log input should be collected (stored in main audit log).
 * When data_collection config is absent, returns true (collect all).
 * Evaluation: AND of severity, category, resource_type, event_type; default when not listed = collect.
 */
export function isCollectionEnabled(
  logInput: CreateLogInput,
  dataCollection: LoggingConfig['data_collection']
): boolean {
  if (!dataCollection) return true;

  if (!severityAllowed(logInput.severity, dataCollection.severity)) return false;
  if (!categoryAllowed(logInput.category, dataCollection.category)) return false;
  if (!resourceTypeAllowed(logInput.resourceType ?? null, dataCollection.resource_type)) return false;
  if (!eventTypeAllowed(logInput.action, dataCollection.event_type)) return false;

  return true;
}
