import Fastify from 'fastify';
import { initializeDatabase, connectDatabase, disconnectDatabase, setupHealthCheck, setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { secretRoutes } from './routes/secrets';
import { vaultRoutes } from './routes/vaults';
import { auditRoutes } from './routes/audit';
import { importExportRoutes } from './routes/import-export';
import { requestLoggingMiddleware } from './middleware/requestLogging';
import { errorHandler } from './middleware/errorHandler';
import { SchedulerService } from './services/scheduler/SchedulerService';
import { loadConfig } from './config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { dump } from 'js-yaml';

const server = Fastify({
  logger: true,
});

// Register Swagger/OpenAPI
server.register(swagger, {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'Secret Management Service API',
      description: `
        Centralized, secure, and auditable system for storing, managing, and accessing sensitive credentials.
        
        ## Authentication
        All endpoints (except health checks) require JWT authentication via Bearer token:
        \`\`\`
        Authorization: Bearer <token>
        \`\`\`
        
        ## Secret Scopes
        Secrets can be scoped at multiple levels:
        - **GLOBAL**: Platform-wide secrets (Super Admin only)
        - **ORGANIZATION**: Organization-level secrets
        - **TEAM**: Team-level secrets
        - **PROJECT**: Project-level secrets
        - **USER**: Personal/user-level secrets
        
        ## Secret Types
        Supported secret types:
        - API_KEY: Simple string API key
        - OAUTH2_TOKEN: OAuth2 access and refresh tokens
        - USERNAME_PASSWORD: Username/password pair
        - CERTIFICATE: TLS/SSL certificate
        - SSH_KEY: SSH private/public key pair
        - CONNECTION_STRING: Database connection string
        - JSON_CREDENTIAL: JSON-formatted credentials (e.g., GCP service account)
        - ENV_VARIABLE_SET: Set of environment variables
        - GENERIC: Generic secret string
        
        ## Storage Backends
        Secrets can be stored in:
        - LOCAL_ENCRYPTED: Local AES-256-GCM encrypted storage
        - AZURE_KEY_VAULT: Azure Key Vault
        - AWS_SECRETS_MANAGER: AWS Secrets Manager
        - HASHICORP_VAULT: HashiCorp Vault
        - GCP_SECRET_MANAGER: GCP Secret Manager
      `,
      version: '1.0.0',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API Version 1',
      },
    ],
    tags: [
      { name: 'Secrets', description: 'Secret CRUD operations' },
      { name: 'Access', description: 'Access grant management' },
      { name: 'Lifecycle', description: 'Secret lifecycle (rotation, expiration, versioning)' },
      { name: 'Vaults', description: 'Vault configuration management' },
      { name: 'Audit', description: 'Audit log viewing' },
      { name: 'Import/Export', description: 'Secret import and export' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

server.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Register error handler
server.setErrorHandler(errorHandler);

// Register request logging middleware
server.addHook('onRequest', requestLoggingMiddleware);

// Register routes
server.register(secretRoutes, { prefix: '/api/secrets' });
server.register(vaultRoutes, { prefix: '/api/vaults' });
server.register(auditRoutes, { prefix: '/api/secrets/audit' });
server.register(importExportRoutes, { prefix: '/api/secrets' });

// Setup health check endpoints
setupHealthCheck(server);

const start = async () => {
  try {
    // Load configuration (validates required env vars and schema)
    const config = loadConfig();
    
    // Setup JWT for authentication
    await setupJWT(server);
    
    // Initialize database with config
    initializeDatabase({
      endpoint: config.cosmos_db.endpoint,
      key: config.cosmos_db.key,
      database: config.cosmos_db.database_id,
      containers: config.cosmos_db.containers,
    });
    
    // Connect to database
    await connectDatabase();
    
    // Initialize encryption key (ensure active key exists)
    const { KeyManager } = await import('./services/encryption/KeyManager');
    const keyManager = new KeyManager();
    await keyManager.getActiveKey();
    
    // Use port from config (no hardcoded default)
    await server.listen({ port: config.server.port, host: config.server.host });
    console.log(`Secret Management Service listening on port ${config.server.port}`);
    console.log(`Environment: ${config.server.env}`);
    if (config.services.logging?.url || config.logging.serviceUrl) {
      console.log(`Logging Service: ${config.services.logging?.url || config.logging.serviceUrl}`);
    }
    
    // Export OpenAPI spec to YAML file (after server is ready)
    server.ready().then(() => {
      try {
        const openApiSpec = server.swagger();
        const yamlSpec = dump(openApiSpec, { indent: 2 });
        const docsDir = join(__dirname, '../docs');
        const specPath = join(docsDir, 'openapi.yaml');
        
        // Ensure docs directory exists (create if needed)
        try {
          mkdirSync(docsDir, { recursive: true });
        } catch (e) {
          // Directory might already exist, ignore error
        }
        
        writeFileSync(specPath, yamlSpec, 'utf8');
        console.log(`OpenAPI specification exported to ${specPath}`);
      } catch (error: any) {
        console.warn('Failed to export OpenAPI spec:', error.message);
        // Don't fail startup if spec export fails
      }
    }).catch((error) => {
      console.warn('Failed to export OpenAPI spec:', error.message);
    });
    
    // Start scheduler service
    const scheduler = new SchedulerService();
    scheduler.start();
    
    // Store scheduler for graceful shutdown
    (server as any).scheduler = scheduler;
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Secret Management Service...');
  
  // Stop scheduler
  const scheduler = (server as any).scheduler as SchedulerService | undefined;
  if (scheduler) {
    scheduler.stop();
  }
  
  await server.close();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
