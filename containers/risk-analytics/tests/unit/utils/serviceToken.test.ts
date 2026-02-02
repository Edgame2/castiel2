/**
 * Unit tests for generateServiceTokenForConsumer (Phase 11 – CAIS sync from consumer)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateServiceTokenForConsumer } from '../../../src/utils/serviceToken';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(),
}));

const loadConfig = (await import('../../../src/config')).loadConfig as ReturnType<typeof vi.fn>;

describe('generateServiceTokenForConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string when jwt.secret is not set', () => {
    loadConfig.mockReturnValue({ jwt: {} });
    expect(generateServiceTokenForConsumer('tenant-1')).toBe('');
  });

  it('returns a JWT string when jwt.secret is set', () => {
    loadConfig.mockReturnValue({ jwt: { secret: 'test-secret' } });
    const token = generateServiceTokenForConsumer('tenant-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('encodes tenantId in payload (decode without verify for structure)', () => {
    loadConfig.mockReturnValue({ jwt: { secret: 'test-secret' } });
    const token = generateServiceTokenForConsumer('tenant-42');
    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    expect(payload.tenantId).toBe('tenant-42');
    expect(payload.serviceId).toBe('risk-analytics');
    expect(payload.serviceName).toBe('risk-analytics');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
  });
});
