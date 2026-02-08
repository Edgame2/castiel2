/**
 * Unit tests for data collection filter (isCollectionEnabled)
 */

import { describe, it, expect } from 'vitest';
import { isCollectionEnabled } from '../../../src/events/dataCollectionFilter';
import { LogCategory, LogSeverity, type CreateLogInput } from '../../../src/types/log.types';

const baseLogInput: CreateLogInput = {
  action: 'auth.login.success',
  message: 'User logged in',
  category: LogCategory.ACCESS,
  severity: LogSeverity.INFO,
  resourceType: 'user',
};

describe('isCollectionEnabled', () => {
  it('returns true when data_collection is absent', () => {
    expect(isCollectionEnabled(baseLogInput, undefined)).toBe(true);
  });

  it('returns false when severity is denied', () => {
    expect(
      isCollectionEnabled(
        baseLogInput,
        { severity: { [LogSeverity.INFO]: false } }
      )
    ).toBe(false);
  });

  it('returns true when severity is not listed (default collect)', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        severity: { [LogSeverity.DEBUG]: false },
      })
    ).toBe(true);
  });

  it('returns false when category is denied', () => {
    expect(
      isCollectionEnabled(
        baseLogInput,
        { category: { [LogCategory.ACCESS]: false } }
      )
    ).toBe(false);
  });

  it('returns false when resource_type is denied for the resource', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        resource_type: { user: false },
      })
    ).toBe(false);
  });

  it('returns true when resource_type default is true and resourceType is null', () => {
    expect(
      isCollectionEnabled(
        { ...baseLogInput, resourceType: undefined },
        { resource_type: { default: true } }
      )
    ).toBe(true);
  });

  it('returns false when resource_type default is false and resourceType is null', () => {
    expect(
      isCollectionEnabled(
        { ...baseLogInput, resourceType: undefined },
        { resource_type: { default: false } }
      )
    ).toBe(false);
  });

  it('denylist: returns false when event type matches deny pattern', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        event_type: { mode: 'denylist', deny: ['auth.#'] },
      })
    ).toBe(false);
  });

  it('denylist: returns true when no deny pattern matches', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        event_type: { mode: 'denylist', deny: ['user.#'] },
      })
    ).toBe(true);
  });

  it('allowlist: returns true when event type matches allow pattern', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        event_type: { mode: 'allowlist', allow: ['auth.#'] },
      })
    ).toBe(true);
  });

  it('allowlist: returns false when no allow pattern matches', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        event_type: { mode: 'allowlist', allow: ['user.#'] },
      })
    ).toBe(false);
  });

  it('wildcard * matches one segment', () => {
    expect(
      isCollectionEnabled(
        { ...baseLogInput, action: 'auth.login.success' },
        { event_type: { mode: 'allowlist', allow: ['auth.*.success'] } }
      )
    ).toBe(true);
    expect(
      isCollectionEnabled(
        { ...baseLogInput, action: 'auth.login.failed' },
        { event_type: { mode: 'denylist', deny: ['auth.*.failed'] } }
      )
    ).toBe(false);
  });

  it('AND of dimensions: all must pass', () => {
    expect(
      isCollectionEnabled(baseLogInput, {
        severity: { [LogSeverity.INFO]: true },
        category: { [LogCategory.ACCESS]: false },
      })
    ).toBe(false);
    expect(
      isCollectionEnabled(baseLogInput, {
        severity: { [LogSeverity.INFO]: true },
        category: { [LogCategory.ACCESS]: true },
        resource_type: { user: true },
        event_type: { mode: 'denylist', deny: [] },
      })
    ).toBe(true);
  });
});
