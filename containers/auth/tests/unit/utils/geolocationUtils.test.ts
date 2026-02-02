/**
 * Geolocation utilities unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocationFromIP, getGeolocationFromIp } from '../../../src/utils/geolocationUtils';

describe('getLocationFromIP', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should return empty for null or localhost', async () => {
    expect(await getLocationFromIP(null)).toEqual({});
    expect(await getLocationFromIP('127.0.0.1')).toEqual({});
    expect(await getLocationFromIP('::1')).toEqual({});
    expect(await getLocationFromIP('unknown')).toEqual({});
  });

  it('should return empty for private IPs', async () => {
    expect(await getLocationFromIP('192.168.1.1')).toEqual({});
    expect(await getLocationFromIP('10.0.0.1')).toEqual({});
    expect(await getLocationFromIP('172.16.0.1')).toEqual({});
  });

  it('should return empty when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));
    expect(await getLocationFromIP('8.8.8.8')).toEqual({});
  });

  it('should return empty when response not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    expect(await getLocationFromIP('8.8.8.8')).toEqual({});
  });
});

describe('getGeolocationFromIp', () => {
  it('should delegate to getLocationFromIP', async () => {
    expect(await getGeolocationFromIp(null)).toEqual({});
  });
});
