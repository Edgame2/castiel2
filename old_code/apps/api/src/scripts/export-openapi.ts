#!/usr/bin/env tsx
// @ts-nocheck
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
  let server: any = null;
  let serverProcess: any = null;
  
  try {
    console.log('🚀 Generating OpenAPI spec...');
    
    // Try to fetch from running server first (if available)
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    try {
      const response = await fetch(`${apiUrl}/docs/json`);
      if (response.ok) {
        const spec = await response.json();
        await writeSpecFiles(spec);
        console.log('✅ OpenAPI spec exported from running server!');
        process.exit(0);
        return;
      }
    } catch (err) {
      console.log('ℹ️  Server not running, will generate spec from code...');
    }
    
    // If server is not running, create minimal server instance
    const Fastify = (await import('fastify')).default;
    const { registerSwagger } = await import('../plugins/swagger.js');
    
    server = Fastify({
      logger: false, // Disable logging for export
    });
    
    // Register Swagger first (minimal setup)
    await registerSwagger(server);
    
    // Try to register routes (may fail if dependencies are missing, but that's OK for basic spec)
    try {
      const { registerRoutes } = await import('../routes/index.js');
      await registerRoutes(server, null);
    } catch (routeError) {
      console.log('⚠️  Could not register all routes (some dependencies may be missing)');
      console.log('   Generating basic OpenAPI spec from Swagger configuration...');
    }
    
    // Ensure server is ready before accessing swagger spec
    await server.ready();
    
    // Get the OpenAPI spec
    const spec = (server as any).swagger();
    
    if (!spec) {
      throw new Error('OpenAPI spec not found. Ensure Swagger plugin is registered.');
    }
    
    await writeSpecFiles(spec);
    
    // Close server
    await server.close();
    
    console.log('✅ OpenAPI export complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to export OpenAPI spec:', error);
    if (server) {
      try {
        await server.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (e) {
        // Ignore kill errors
      }
    }
    process.exit(1);
  }
}

async function writeSpecFiles(spec: any) {
  // Ensure directory exists
  // From apps/api, go up 2 levels to monorepo root, then to docs/apidoc
  const specDir = path.resolve(process.cwd(), '../../docs/apidoc');
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
  } catch (err) {
    console.log('⚠️  YAML export skipped (js-yaml not available). JSON spec exported.');
    console.log('   Install js-yaml to generate YAML: pnpm add -D js-yaml @types/js-yaml');
  }
}

exportOpenAPI();

