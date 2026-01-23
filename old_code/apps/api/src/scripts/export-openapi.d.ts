#!/usr/bin/env tsx
/**
 * Export OpenAPI Specification
 *
 * Exports the canonical OpenAPI 3.0 specification from the Fastify server
 * to docs/apidoc/openapi.yaml for version control and external tooling.
 *
 * This script starts the server briefly to generate the OpenAPI spec,
 * then exports it and shuts down.
 *
 * Usage:
 *   pnpm --filter @castiel/api run export:openapi
 *
 * Prerequisites:
 *   - Server must be able to start (for schema generation)
 *   - All routes must be registered
 */
export {};
//# sourceMappingURL=export-openapi.d.ts.map