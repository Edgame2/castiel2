/**
 * JWT Setup Utilities
 * @module @coder/shared/auth
 */
import fastifyJwt from '@fastify/jwt';
/**
 * Setup JWT authentication on Fastify instance
 * Registers @fastify/jwt plugin with configured options
 */
export async function setupJWT(server, options) {
    if (!options.secret) {
        throw new Error('JWT secret is required');
    }
    const jwtSignOptions = {
        expiresIn: options.expiresIn || process.env.JWT_EXPIRATION || '7d',
    };
    const jwtVerifyOptions = {};
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
        secret: options.secret,
        sign: jwtSignOptions,
        verify: jwtVerifyOptions,
    });
    server.log.info('JWT authentication configured');
}
/**
 * Generate JWT token
 */
export function signToken(server, payload) {
    return server.jwt.sign(payload);
}
/**
 * Verify JWT token
 */
export function verifyToken(server, token) {
    return server.jwt.verify(token);
}
//# sourceMappingURL=jwt.js.map