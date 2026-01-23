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
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
// Load env
const rootEnv = path.resolve(process.cwd(), '../../.env');
const localEnv = path.resolve(process.cwd(), '../../.env.local');
dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });
async function exportOpenAPI() {
    let server = null;
    try {
        console.log('🚀 Starting server to generate OpenAPI spec...');
        // Import and start the server (this registers all routes and generates the spec)
        // We'll need to modify the start function to allow getting the spec without listening
        const { default: startServer } = await import('../index.js');
        // Create a minimal server instance to get the spec
        // Since we can't easily extract the server, we'll use a different approach:
        // Start the server, get the spec via HTTP, then shut down
        // Alternative: Create server instance directly
        const Fastify = (await import('fastify')).default;
        const { registerSwagger } = await import('../plugins/swagger.js');
        const { registerRoutes } = await import('../routes/index.js');
        server = Fastify({
            logger: false, // Disable logging for export
        });
        // Register Swagger first
        await registerSwagger(server);
        // Register routes (this will populate the OpenAPI spec)
        await registerRoutes(server, null);
        // Get the OpenAPI spec
        const spec = (server).swagger();
        if (!spec) {
            throw new Error('OpenAPI spec not found. Ensure Swagger plugin is registered.');
        }
        // Ensure directory exists
        const specDir = path.resolve(process.cwd(), '../../../docs/apidoc');
        if (!fs.existsSync(specDir)) {
            fs.mkdirSync(specDir, { recursive: true });
        }
        // Write JSON spec
        const jsonPath = path.join(specDir, 'openapi.json');
        fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
        console.log(`✅ OpenAPI spec (JSON) exported to: ${jsonPath}`);
        // Try to write YAML version if js-yaml is available
        try {
            const yaml = await import('js-yaml');
            const yamlPath = path.join(specDir, 'openapi.yaml');
            const yamlContent = yaml.dump(spec, {
                indent: 2,
                lineWidth: 120,
                noRefs: false,
            });
            fs.writeFileSync(yamlPath, yamlContent);
            console.log(`✅ OpenAPI spec (YAML) exported to: ${yamlPath}`);
        }
        catch (err) {
            console.log('⚠️  YAML export skipped (js-yaml not available). JSON spec exported.');
            console.log('   Install js-yaml to generate YAML: pnpm add -D js-yaml @types/js-yaml');
        }
        // Close server
        await server.close();
        console.log('✅ OpenAPI export complete!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Failed to export OpenAPI spec:', error);
        if (server) {
            try {
                await server.close();
            }
            catch (e) {
                // Ignore close errors
            }
        }
        process.exit(1);
    }
}
exportOpenAPI();
//# sourceMappingURL=export-openapi.js.map