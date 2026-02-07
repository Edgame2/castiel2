/**
 * JWT Setup Utilities
 * @module @coder/shared/auth
 */

import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';

/**
 * JWT configuration options
 */
export interface JWTSetupOptions {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  refreshExpiration?: string;
}

/**
 * Setup JWT authentication on Fastify instance
 * Registers @fastify/jwt plugin with configured options
 */
const DEV_JWT_SECRET = 'dev-jwt-secret-min-32-chars-for-local-compose';

export async function setupJWT(
  server: FastifyInstance,
  options: JWTSetupOptions
): Promise<void> {
  const secret = options.secret || process.env.JWT_SECRET;
  const effectiveSecret = secret || (process.env.NODE_ENV === 'development' ? DEV_JWT_SECRET : '');
  if (!effectiveSecret) {
    throw new Error('JWT secret is required (set JWT_SECRET in production)');
  }

  const jwtSignOptions: any = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRATION || '7d',
  };

  const jwtVerifyOptions: any = {};

  // Set issuer if provided
  const issuer = options.issuer || process.env.JWT_ISSUER || 'coder';
  jwtSignOptions.issuer = issuer;
  jwtVerifyOptions.issuer = issuer;

  // Set audience if provided
  if (options.audience || process.env.JWT_AUDIENCE) {
    const audience = options.audience || process.env.JWT_AUDIENCE;
    jwtSignOptions.audience = audience;
    jwtVerifyOptions.audience = audience;
  }

  await server.register(fastifyJwt, {
    secret: effectiveSecret,
    sign: jwtSignOptions,
    verify: jwtVerifyOptions,
  });

  server.log.info('JWT authentication configured');
}

/**
 * Generate JWT token
 */
export function signToken(server: FastifyInstance, payload: Record<string, any>): string {
  return server.jwt.sign(payload);
}

/**
 * Verify JWT token
 */
export function verifyToken(server: FastifyInstance, token: string): any {
  return server.jwt.verify(token);
}

