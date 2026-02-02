/**
 * String utils unit tests
 */

import { describe, it, expect } from 'vitest';
import { slugify, isValidSlug } from '../../../src/utils/stringUtils';

describe('slugify', () => {
  it('converts text to lowercase hyphenated slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('My Organization')).toBe('my-organization');
  });

  it('replaces spaces and underscores with hyphens', () => {
    expect(slugify('foo bar_baz')).toBe('foo-bar-baz');
  });

  it('removes non-alphanumeric characters except hyphens', () => {
    expect(slugify('Test@Org!')).toBe('testorg');
    expect(slugify('a-b-c')).toBe('a-b-c');
  });

  it('collapses multiple hyphens to one', () => {
    expect(slugify('a---b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
    expect(slugify('--hello--')).toBe('hello');
  });

  it('returns empty string for empty or only-special input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('!!!')).toBe('');
  });
});

describe('isValidSlug', () => {
  it('returns true for valid slugs', () => {
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('abc')).toBe(true);
    expect(isValidSlug('a-b-c')).toBe(true);
    expect(isValidSlug('my-org-name')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('returns false for slugs starting or ending with hyphen', () => {
    expect(isValidSlug('-abc')).toBe(false);
    expect(isValidSlug('abc-')).toBe(false);
  });

  it('returns false for slugs with uppercase', () => {
    expect(isValidSlug('Abc')).toBe(false);
  });

  it('returns false for slugs with invalid characters', () => {
    expect(isValidSlug('a_b')).toBe(false);
    expect(isValidSlug('a b')).toBe(false);
    expect(isValidSlug('a.b')).toBe(false);
  });

  it('returns false for slugs over 100 characters', () => {
    const long = 'a'.repeat(101);
    expect(isValidSlug(long)).toBe(false);
  });

  it('returns true for slug of exactly 100 characters', () => {
    const hundred = 'a'.repeat(100);
    expect(isValidSlug(hundred)).toBe(true);
  });
});
