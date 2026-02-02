/**
 * String utilities unit tests
 */

import { describe, it, expect } from 'vitest';
import { slugify, isValidSlug, generateUsername, isValidUsername } from '../../../src/utils/stringUtils';

describe('slugify', () => {
  it('should convert to lowercase and replace spaces with hyphens', () => {
    expect(slugify('My Organization Name')).toBe('my-organization-name');
  });

  it('should remove non-alphanumeric except hyphens', () => {
    expect(slugify('Test & Development')).toBe('test-development');
  });

  it('should trim and collapse multiple hyphens', () => {
    expect(slugify('  hello   world  ')).toBe('hello-world');
  });
});

describe('isValidSlug', () => {
  it('should return true for valid slug', () => {
    expect(isValidSlug('my-slug')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
  });

  it('should return false for invalid slug', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Uppercase')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
  });
});

describe('generateUsername', () => {
  it('should use name when provided', () => {
    expect(generateUsername('a@b.com', 'John Doe')).toBe('john-doe');
  });

  it('should use email local part when no name', () => {
    expect(generateUsername('alice@example.com')).toBe('alice');
  });

  it('should ensure minimum length 3', () => {
    expect(generateUsername('a@b.com').length).toBeGreaterThanOrEqual(3);
  });

  it('should truncate to 39 chars', () => {
    const long = 'a'.repeat(50);
    expect(generateUsername('x@b.com', long).length).toBeLessThanOrEqual(39);
  });
});

describe('isValidUsername', () => {
  it('should return true for valid username', () => {
    expect(isValidUsername('alice')).toBe(true);
    expect(isValidUsername('user-name')).toBe(true);
  });

  it('should return false for too short or invalid', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('')).toBe(false);
  });
});
