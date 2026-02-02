/**
 * Device detection utilities unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectDeviceType,
  extractDeviceName,
  getDeviceInfo,
} from '../../../src/utils/deviceUtils';

describe('detectDeviceType', () => {
  it('should return unknown for null user agent', () => {
    expect(detectDeviceType(null)).toBe('unknown');
  });

  it('should detect mobile', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe('mobile');
    expect(detectDeviceType('Android Mobile')).toBe('mobile');
  });

  it('should detect tablet', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('tablet');
  });

  it('should detect desktop', () => {
    expect(detectDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(detectDeviceType('Macintosh')).toBe('desktop');
  });
});

describe('extractDeviceName', () => {
  it('should return Unknown Device for null', () => {
    expect(extractDeviceName(null)).toBe('Unknown Device');
  });

  it('should extract OS and browser', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
    expect(extractDeviceName(ua)).toContain('Windows');
    expect(extractDeviceName(ua)).toContain('Chrome');
  });
});

describe('getDeviceInfo', () => {
  it('should return type and name', () => {
    const info = getDeviceInfo('Mozilla/5.0 (Windows NT 10.0)');
    expect(info.type).toBeDefined();
    expect(info.name).toBeDefined();
  });

  it('should return unknown for null', () => {
    const info = getDeviceInfo(null);
    expect(info.type).toBe('unknown');
    expect(info.name).toBe('Unknown Device');
  });
});
