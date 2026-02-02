/**
 * Service token for outbound calls when Fastify app is not available (e.g. event consumer).
 * Produces a JWT with the same payload shape as generateServiceToken from @coder/shared
 * so adaptive-learning (and auth) can verify it.
 */

import jwt from 'jsonwebtoken';
import { loadConfig } from '../config';

const SERVICE_ID = 'risk-analytics';
const SERVICE_NAME = 'risk-analytics';
const EXPIRES_IN_SEC = 15 * 60; // 15 minutes, same as shared serviceAuth

/**
 * Generate a service JWT for tenant-scoped outbound calls (e.g. adaptive-learning).
 * Use when Fastify instance is not available (consumer context).
 */
export function generateServiceTokenForConsumer(tenantId: string): string {
  const config = loadConfig();
  const secret = config.jwt?.secret;
  if (!secret) {
    return '';
  }
  const payload = {
    serviceId: SERVICE_ID,
    serviceName: SERVICE_NAME,
    tenantId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + EXPIRES_IN_SEC,
  };
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}
