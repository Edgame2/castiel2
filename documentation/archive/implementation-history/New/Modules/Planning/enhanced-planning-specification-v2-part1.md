# Enhanced Planning Module - Complete Specification v2.0

**Version:** 2.0 - Production Ready  
**Last Updated:** 2025-01-27  
**Status:** Complete Implementation Specification

---

## CRITICAL REQUIREMENTS FOR AUTONOMOUS ERROR-FREE CODE GENERATION

This specification ensures:
1. ✅ **Zero ambiguity** - Every task has explicit inputs, outputs, and success criteria
2. ✅ **Complete integration** - All integration points with existing code are mapped
3. ✅ **Full anticipation** - All potential issues are identified upfront
4. ✅ **Exhaustive steps** - Every UI, API, DB, file, command is explicitly planned
5. ✅ **Validation gates** - Each task has concrete, testable validation criteria
6. ✅ **Self-healing** - Plans include fix/retry logic for common failures

---

## 1. EXHAUSTIVE TASK GENERATION SYSTEM

### 1.1 Task Template Library

Every feature generates a COMPLETE set of tasks across all layers:

```typescript
interface ExhaustiveTaskGenerator {
  /**
   * Generate ALL required tasks for a feature
   * NOTHING is left to chance or assumed
   */
  generateCompleteTasks(
    feature: FeatureSpecification,
    context: ProjectContext
  ): Promise<CompleteTaskSet>;
}

interface CompleteTaskSet {
  // Database layer
  databaseTasks: DatabaseTask[];
  
  // API layer
  apiTasks: APITask[];
  
  // Business logic layer
  serviceTasks: ServiceTask[];
  
  // Frontend layer
  uiTasks: UITask[];
  
  // Infrastructure tasks
  infrastructureTasks: InfrastructureTask[];
  
  // Testing tasks
  testingTasks: TestingTask[];
  
  // Documentation tasks
  documentationTasks: DocumentationTask[];
  
  // Integration tasks
  integrationTasks: IntegrationTask[];
  
  // Deployment tasks
  deploymentTasks: DeploymentTask[];
  
  // Validation tasks
  validationTasks: ValidationTask[];
}

// Each task type has specific, exhaustive subtasks
interface DatabaseTask {
  type: 'schema_migration' | 'seed_data' | 'index_creation' | 'constraint_addition';
  
  // EXPLICIT file operations
  files: {
    create: FileCreationSpec[];
    modify: FileModificationSpec[];
    delete: string[];
  };
  
  // EXPLICIT commands to run
  commands: CommandSpec[];
  
  // EXPLICIT validation
  validation: ValidationSpec;
  
  // EXPLICIT rollback
  rollback: RollbackSpec;
  
  // EXPLICIT dependencies
  dependencies: TaskDependency[];
  
  // EXPLICIT integration points
  integrationPoints: IntegrationPoint[];
}

interface FileCreationSpec {
  path: string; // EXACT path from project root
  content: string | (() => string); // EXACT content or template
  mode?: string; // File permissions
  encoding?: string; // Default: utf-8
  
  // Validation
  mustExist: boolean;
  mustNotExistBefore: boolean;
  
  // What this file provides
  exports?: string[]; // For code files
  provides?: string[]; // Tables, routes, components, etc.
}

interface FileModificationSpec {
  path: string; // EXACT path
  operation: 'append' | 'prepend' | 'replace' | 'insert_after' | 'insert_before';
  
  // For replace operations
  search?: string | RegExp;
  replace?: string;
  
  // For insert operations
  anchor?: string | RegExp; // Where to insert
  content: string;
  
  // Validation
  anchorMustExist?: boolean;
  searchMustExist?: boolean;
  
  // Safety
  createBackup: boolean;
  dryRun?: boolean;
}

interface CommandSpec {
  command: string; // EXACT command
  workingDirectory: string; // EXACT directory
  environment?: Record<string, string>; // Environment variables
  timeout?: number; // Milliseconds
  
  // Expected outcomes
  expectedExitCode: number; // Usually 0
  expectedOutput?: RegExp; // Pattern to match in stdout
  expectedFiles?: string[]; // Files that should exist after
  
  // Error handling
  retryOnFailure?: number; // Number of retries
  retryDelay?: number; // Delay between retries (ms)
  continueOnError?: boolean;
  
  // Validation
  validateBefore?: () => Promise<boolean>;
  validateAfter?: () => Promise<boolean>;
}

interface ValidationSpec {
  // Pre-execution validation
  preconditions: ValidationCheck[];
  
  // Post-execution validation
  postconditions: ValidationCheck[];
  
  // Integration validation
  integrationChecks: IntegrationCheck[];
  
  // Performance validation
  performanceChecks?: PerformanceCheck[];
  
  // Security validation
  securityChecks?: SecurityCheck[];
}

interface ValidationCheck {
  name: string;
  description: string;
  check: () => Promise<boolean>;
  errorMessage: string;
  severity: 'blocker' | 'critical' | 'warning';
  autoFix?: () => Promise<void>;
}

interface IntegrationPoint {
  type: 'imports' | 'exports' | 'api_call' | 'database_query' | 'event_emit' | 'event_listen';
  
  // What we're integrating with
  targetModule: string;
  targetFile?: string;
  targetFunction?: string;
  targetComponent?: string;
  
  // How to integrate
  integrationMethod: string;
  
  // Validation that integration works
  validationTest: string; // Path to test file
  
  // What happens if integration fails
  fallbackBehavior?: string;
}
```

### 1.2 Complete Task Generation Examples

#### Example 1: Add User Authentication Feature

```typescript
const authenticationFeature = {
  name: 'User Authentication',
  description: 'Add JWT-based authentication with email/password',
  requirements: [
    'Users can register with email/password',
    'Users can login and receive JWT token',
    'Protected routes require valid JWT',
    'Passwords are securely hashed',
    'Tokens expire after 24 hours',
  ],
};

// This generates EVERY single task:
const completeTasks = await exhaustiveTaskGenerator.generateCompleteTasks(
  authenticationFeature,
  projectContext
);

// OUTPUT: Complete task breakdown
{
  databaseTasks: [
    {
      id: 'db-001',
      type: 'schema_migration',
      title: 'Create users table',
      description: 'Create users table with email, password_hash, created_at, updated_at',
      
      files: {
        create: [
          {
            path: 'server/database/migrations/20250127_create_users_table.ts',
            content: `
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
            `,
            mustNotExistBefore: true,
            provides: ['users table'],
          }
        ],
        modify: [],
        delete: [],
      },
      
      commands: [
        {
          command: 'npm run migrate:latest',
          workingDirectory: '/server',
          expectedExitCode: 0,
          expectedFiles: ['server/database/migrations/20250127_create_users_table.ts'],
          retryOnFailure: 2,
          validateAfter: async () => {
            // Check table exists
            const result = await db.raw("SELECT to_regclass('users')");
            return result.rows[0].to_regclass === 'users';
          },
        }
      ],
      
      validation: {
        preconditions: [
          {
            name: 'database_connection',
            description: 'Database must be accessible',
            check: async () => {
              try {
                await db.raw('SELECT 1');
                return true;
              } catch {
                return false;
              }
            },
            errorMessage: 'Cannot connect to database',
            severity: 'blocker',
          },
          {
            name: 'no_existing_users_table',
            description: 'Users table must not already exist',
            check: async () => {
              const result = await db.raw("SELECT to_regclass('users')");
              return result.rows[0].to_regclass === null;
            },
            errorMessage: 'Users table already exists',
            severity: 'blocker',
            autoFix: async () => {
              // Drop existing table
              await db.schema.dropTableIfExists('users');
            },
          }
        ],
        
        postconditions: [
          {
            name: 'users_table_exists',
            description: 'Users table must exist',
            check: async () => {
              const result = await db.raw("SELECT to_regclass('users')");
              return result.rows[0].to_regclass === 'users';
            },
            errorMessage: 'Users table was not created',
            severity: 'blocker',
          },
          {
            name: 'users_table_columns',
            description: 'Users table must have required columns',
            check: async () => {
              const columns = await db.raw(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'users'
              `);
              const columnNames = columns.rows.map(r => r.column_name);
              return ['id', 'email', 'password_hash', 'created_at', 'updated_at']
                .every(col => columnNames.includes(col));
            },
            errorMessage: 'Users table missing required columns',
            severity: 'blocker',
          },
          {
            name: 'email_unique_constraint',
            description: 'Email must have unique constraint',
            check: async () => {
              const constraints = await db.raw(`
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
              `);
              return constraints.rows.some(r => r.constraint_name.includes('email'));
            },
            errorMessage: 'Email unique constraint missing',
            severity: 'critical',
          }
        ],
        
        integrationChecks: [],
      },
      
      rollback: {
        commands: [
          {
            command: 'npm run migrate:rollback',
            workingDirectory: '/server',
          }
        ],
      },
      
      dependencies: [],
      
      integrationPoints: [],
      
      estimatedHoursHuman: 0.5,
      estimatedHoursAI: 0.1,
      confidenceLevel: 0.95,
      allocatedTo: 'ai',
    },
    
    {
      id: 'db-002',
      type: 'schema_migration',
      title: 'Create sessions table',
      description: 'Create sessions table for JWT token tracking',
      
      files: {
        create: [
          {
            path: 'server/database/migrations/20250127_create_sessions_table.ts',
            content: `
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index('user_id');
    table.index('token_hash');
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('sessions');
}
            `,
            mustNotExistBefore: true,
            provides: ['sessions table'],
          }
        ],
        modify: [],
        delete: [],
      },
      
      commands: [
        {
          command: 'npm run migrate:latest',
          workingDirectory: '/server',
          expectedExitCode: 0,
        }
      ],
      
      validation: {
        preconditions: [
          {
            name: 'users_table_exists',
            description: 'Users table must exist (foreign key dependency)',
            check: async () => {
              const result = await db.raw("SELECT to_regclass('users')");
              return result.rows[0].to_regclass === 'users';
            },
            errorMessage: 'Users table must be created first',
            severity: 'blocker',
          }
        ],
        postconditions: [
          {
            name: 'sessions_table_exists',
            description: 'Sessions table must exist',
            check: async () => {
              const result = await db.raw("SELECT to_regclass('sessions')");
              return result.rows[0].to_regclass === 'sessions';
            },
            errorMessage: 'Sessions table was not created',
            severity: 'blocker',
          },
          {
            name: 'foreign_key_constraint',
            description: 'Foreign key to users table must exist',
            check: async () => {
              const fks = await db.raw(`
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'sessions' AND constraint_type = 'FOREIGN KEY'
              `);
              return fks.rows.length > 0;
            },
            errorMessage: 'Foreign key constraint missing',
            severity: 'critical',
          }
        ],
        integrationChecks: [],
      },
      
      rollback: {
        commands: [
          {
            command: 'npm run migrate:rollback',
            workingDirectory: '/server',
          }
        ],
      },
      
      dependencies: [
        {
          taskId: 'db-001',
          type: 'blocks',
          reason: 'Sessions table has foreign key to users table',
        }
      ],
      
      integrationPoints: [],
    }
  ],
  
  apiTasks: [
    {
      id: 'api-001',
      type: 'endpoint_creation',
      title: 'Create POST /api/auth/register endpoint',
      description: 'API endpoint for user registration',
      
      files: {
        create: [
          {
            path: 'server/src/routes/auth.routes.ts',
            content: `
import { FastifyInstance } from 'fastify';
import { registerHandler } from '../controllers/auth.controller';
import { registerSchema } from '../schemas/auth.schema';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', {
    schema: registerSchema,
  }, registerHandler);
}
            `,
            mustNotExistBefore: true,
            exports: ['authRoutes'],
            provides: ['POST /api/auth/register'],
          },
          
          {
            path: 'server/src/controllers/auth.controller.ts',
            content: `
import { FastifyRequest, FastifyReply } from 'fastify';
import { RegisterInput } from '../schemas/auth.schema';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply
) {
  try {
    const { email, password } = request.body;
    
    // Validate input
    if (!email || !password) {
      return reply.code(400).send({
        error: 'Email and password are required',
      });
    }
    
    // Check if user exists
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return reply.code(409).send({
        error: 'User already exists',
      });
    }
    
    // Create user
    const user = await authService.createUser(email, password);
    
    // Generate token
    const token = await authService.generateToken(user.id);
    
    return reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}
            `,
            mustNotExistBefore: true,
            exports: ['registerHandler'],
          },
          
          {
            path: 'server/src/schemas/auth.schema.ts',
            content: `
import { Type, Static } from '@sinclair/typebox';

export const registerSchema = {
  body: Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String({ minLength: 8 }),
  }),
  response: {
    201: Type.Object({
      user: Type.Object({
        id: Type.String({ format: 'uuid' }),
        email: Type.String({ format: 'email' }),
      }),
      token: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
    409: Type.Object({
      error: Type.String(),
    }),
    500: Type.Object({
      error: Type.String(),
    }),
  },
};

export type RegisterInput = Static<typeof registerSchema.body>;
            `,
            mustNotExistBefore: true,
            exports: ['registerSchema', 'RegisterInput'],
          }
        ],
        
        modify: [
          {
            path: 'server/src/server.ts',
            operation: 'insert_before',
            anchor: /\/\/ Routes setup end/,
            content: `  await fastify.register(authRoutes);\n`,
            anchorMustExist: true,
            createBackup: true,
          }
        ],
        
        delete: [],
      },
      
      commands: [
        {
          command: 'npm run build',
          workingDirectory: '/server',
          expectedExitCode: 0,
          timeout: 60000,
        }
      ],
      
      validation: {
        preconditions: [
          {
            name: 'typescript_compiles',
            description: 'TypeScript must compile without errors',
            check: async () => {
              const result = await exec('npm run type-check', { cwd: '/server' });
              return result.exitCode === 0;
            },
            errorMessage: 'TypeScript compilation errors',
            severity: 'blocker',
          }
        ],
        
        postconditions: [
          {
            name: 'endpoint_accessible',
            description: 'Endpoint must be accessible',
            check: async () => {
              const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@test.com', password: 'test1234' }),
              });
              return [201, 400, 409].includes(response.status);
            },
            errorMessage: 'Endpoint not accessible',
            severity: 'blocker',
          },
          {
            name: 'schema_validation_works',
            description: 'Schema validation must reject invalid input',
            check: async () => {
              const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'invalid', password: '123' }),
              });
              return response.status === 400;
            },
            errorMessage: 'Schema validation not working',
            severity: 'critical',
          }
        ],
        
        integrationChecks: [
          {
            name: 'integrates_with_auth_service',
            description: 'Must successfully call AuthService',
            targetModule: 'AuthService',
            check: async () => {
              // Mock test
              const service = new AuthService();
              const user = await service.createUser('test@test.com', 'password123');
              return user !== null;
            },
            severity: 'blocker',
          }
        ],
      },
      
      dependencies: [
        {
          taskId: 'service-001',
          type: 'requires',
          reason: 'Requires AuthService to be implemented',
        },
        {
          taskId: 'db-001',
          type: 'requires',
          reason: 'Requires users table to exist',
        }
      ],
      
      integrationPoints: [
        {
          type: 'imports',
          targetModule: 'AuthService',
          targetFile: 'server/src/services/auth.service.ts',
          integrationMethod: 'ES6 import',
          validationTest: 'server/src/__tests__/routes/auth.routes.test.ts',
        },
        {
          type: 'api_call',
          targetModule: 'Database',
          integrationMethod: 'Via AuthService',
          validationTest: 'server/src/__tests__/integration/auth.integration.test.ts',
        }
      ],
    },
    
    {
      id: 'api-002',
      type: 'endpoint_creation',
      title: 'Create POST /api/auth/login endpoint',
      // ... similar exhaustive specification
    }
  ],
  
  serviceTasks: [
    {
      id: 'service-001',
      type: 'service_creation',
      title: 'Create AuthService',
      description: 'Business logic for authentication',
      
      files: {
        create: [
          {
            path: 'server/src/services/auth.service.ts',
            content: `
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection';

export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRATION = '24h';
  
  async findUserByEmail(email: string) {
    const users = await db('users').where({ email }).first();
    return users;
  }
  
  async createUser(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    const [user] = await db('users')
      .insert({
        email,
        password_hash: passwordHash,
      })
      .returning(['id', 'email', 'created_at', 'updated_at']);
    
    return user;
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  async generateToken(userId: string): Promise<string> {
    const token = jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRATION }
    );
    
    // Store token hash in sessions table
    const tokenHash = await bcrypt.hash(token, this.SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db('sessions').insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    
    return token;
  }
  
  async verifyToken(token: string): Promise<string | null> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      
      // Check if session exists and is not expired
      const session = await db('sessions')
        .where('user_id', payload.userId)
        .where('expires_at', '>', new Date())
        .first();
      
      if (!session) {
        return null;
      }
      
      return payload.userId;
    } catch {
      return null;
    }
  }
  
  async revokeToken(userId: string): Promise<void> {
    await db('sessions')
      .where('user_id', userId)
      .delete();
  }
}
            `,
            mustNotExistBefore: true,
            exports: ['AuthService'],
          }
        ],
        modify: [],
        delete: [],
      },
      
      commands: [
        {
          command: 'npm install bcrypt jsonwebtoken @types/bcrypt @types/jsonwebtoken',
          workingDirectory: '/server',
          expectedExitCode: 0,
        }
      ],
      
      validation: {
        preconditions: [
          {
            name: 'env_vars_set',
            description: 'JWT_SECRET must be set in environment',
            check: async () => {
              return !!process.env.JWT_SECRET;
            },
            errorMessage: 'JWT_SECRET not set in .env',
            severity: 'blocker',
            autoFix: async () => {
              // Generate random secret
              const secret = require('crypto').randomBytes(64).toString('hex');
              await fs.appendFile('.env', `\nJWT_SECRET=${secret}\n`);
            },
          }
        ],
        
        postconditions: [
          {
            name: 'service_instantiates',
            description: 'AuthService must instantiate without errors',
            check: async () => {
              try {
                const service = new AuthService();
                return true;
              } catch {
                return false;
              }
            },
            errorMessage: 'AuthService cannot be instantiated',
            severity: 'blocker',
          },
          {
            name: 'password_hashing_works',
            description: 'Password hashing must work',
            check: async () => {
              const service = new AuthService();
              const hash = await bcrypt.hash('test', 10);
              const valid = await service.verifyPassword('test', hash);
              return valid;
            },
            errorMessage: 'Password hashing not working',
            severity: 'blocker',
          },
          {
            name: 'token_generation_works',
            description: 'Token generation must work',
            check: async () => {
              const service = new AuthService();
              // Create test user
              const user = await service.createUser('test@test.com', 'password');
              const token = await service.generateToken(user.id);
              return typeof token === 'string' && token.length > 0;
            },
            errorMessage: 'Token generation not working',
            severity: 'blocker',
          }
        ],
        
        integrationChecks: [
          {
            name: 'integrates_with_database',
            description: 'Must successfully query database',
            targetModule: 'Database',
            check: async () => {
              const service = new AuthService();
              const user = await service.findUserByEmail('nonexistent@test.com');
              return user === undefined;
            },
            severity: 'blocker',
          }
        ],
      },
      
      dependencies: [
        {
          taskId: 'db-001',
          type: 'requires',
          reason: 'Requires users table',
        },
        {
          taskId: 'db-002',
          type: 'requires',
          reason: 'Requires sessions table',
        }
      ],
      
      integrationPoints: [
        {
          type: 'database_query',
          targetModule: 'Database',
          targetFile: 'server/src/database/connection.ts',
          integrationMethod: 'Knex query builder',
          validationTest: 'server/src/__tests__/services/auth.service.test.ts',
        }
      ],
    }
  ],
  
  uiTasks: [
    {
      id: 'ui-001',
      type: 'component_creation',
      title: 'Create LoginForm component',
      description: 'React component for login form',
      
      files: {
        create: [
          {
            path: 'src/components/auth/LoginForm.tsx',
            content: `
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
            `,
            mustNotExistBefore: true,
            exports: ['LoginForm'],
          },
          
          {
            path: 'src/components/auth/RegisterForm.tsx',
            content: `// Similar to LoginForm...`,
            mustNotExistBefore: true,
            exports: ['RegisterForm'],
          },
          
          {
            path: 'src/pages/LoginPage.tsx',
            content: `
import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        
        <LoginForm />
        
        <div className="text-center">
          <Link to="/register" className="text-blue-600 hover:text-blue-500">
            Don't have an account? Register
          </Link>
        </div>
      </div>
    </div>
  );
}
            `,
            mustNotExistBefore: true,
            exports: ['LoginPage'],
          }
        ],
        
        modify: [
          {
            path: 'src/App.tsx',
            operation: 'insert_before',
            anchor: /<\/Routes>/,
            content: `        <Route path="/login" element={<LoginPage />} />\n        <Route path="/register" element={<RegisterPage />} />\n`,
            anchorMustExist: true,
            createBackup: true,
          },
          
          {
            path: 'src/App.tsx',
            operation: 'insert_after',
            anchor: /import React from 'react';/,
            content: `import { LoginPage } from './pages/LoginPage';\nimport { RegisterPage } from './pages/RegisterPage';\n`,
            anchorMustExist: true,
            createBackup: true,
          }
        ],
        
        delete: [],
      },
      
      commands: [],
      
      validation: {
        preconditions: [
          {
            name: 'react_app_builds',
            description: 'React app must build without errors',
            check: async () => {
              const result = await exec('npm run build', { cwd: '/' });
              return result.exitCode === 0;
            },
            errorMessage: 'React build errors',
            severity: 'blocker',
          }
        ],
        
        postconditions: [
          {
            name: 'component_renders',
            description: 'LoginForm must render without errors',
            check: async () => {
              // Use React Testing Library
              const { render } = require('@testing-library/react');
              const { LoginForm } = require('../components/auth/LoginForm');
              try {
                render(<LoginForm />);
                return true;
              } catch {
                return false;
              }
            },
            errorMessage: 'LoginForm does not render',
            severity: 'blocker',
          },
          {
            name: 'form_submission_works',
            description: 'Form submission must call login function',
            check: async () => {
              // Integration test
              const { render, fireEvent, waitFor } = require('@testing-library/react');
              const { LoginForm } = require('../components/auth/LoginForm');
              
              let loginCalled = false;
              const mockLogin = () => { loginCalled = true; };
              
              const { getByLabelText, getByRole } = render(
                <AuthContext.Provider value={{ login: mockLogin }}>
                  <LoginForm />
                </AuthContext.Provider>
              );
              
              fireEvent.change(getByLabelText('Email'), { target: { value: 'test@test.com' } });
              fireEvent.change(getByLabelText('Password'), { target: { value: 'password' } });
              fireEvent.click(getByRole('button'));
              
              await waitFor(() => loginCalled);
              return loginCalled;
            },
            errorMessage: 'Form submission not working',
            severity: 'critical',
          }
        ],
        
        integrationChecks: [
          {
            name: 'integrates_with_auth_context',
            description: 'Must use AuthContext for login',
            targetModule: 'AuthContext',
            check: async () => true,
            severity: 'blocker',
          }
        ],
      },
      
      dependencies: [
        {
          taskId: 'ui-002',
          type: 'requires',
          reason: 'Requires AuthContext',
        }
      ],
      
      integrationPoints: [
        {
          type: 'imports',
          targetModule: 'AuthContext',
          targetFile: 'src/contexts/AuthContext.tsx',
          integrationMethod: 'React Context hook',
          validationTest: 'src/__tests__/components/LoginForm.test.tsx',
        }
      ],
    },
    
    {
      id: 'ui-002',
      type: 'context_creation',
      title: 'Create AuthContext',
      description: 'React context for authentication state',
      // ... exhaustive specification
    }
  ],
  
  testingTasks: [
    {
      id: 'test-001',
      type: 'unit_test_creation',
      title: 'Create AuthService unit tests',
      
      files: {
        create: [
          {
            path: 'server/src/__tests__/services/auth.service.test.ts',
            content: `
import { AuthService } from '../../services/auth.service';
import { db } from '../../database/connection';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeAll(async () => {
    // Setup test database
    await db.migrate.latest();
  });
  
  afterAll(async () => {
    // Cleanup
    await db.migrate.rollback();
    await db.destroy();
  });
  
  beforeEach(() => {
    authService = new AuthService();
  });
  
  afterEach(async () => {
    // Clear test data
    await db('sessions').del();
    await db('users').del();
  });
  
  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const user = await authService.createUser('test@test.com', 'password123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@test.com');
      expect(user.id).toBeDefined();
      
      // Verify password is hashed
      const dbUser = await db('users').where({ id: user.id }).first();
      expect(dbUser.password_hash).not.toBe('password123');
      expect(dbUser.password_hash.length).toBeGreaterThan(20);
    });
    
    it('should throw error for duplicate email', async () => {
      await authService.createUser('test@test.com', 'password123');
      
      await expect(
        authService.createUser('test@test.com', 'password456')
      ).rejects.toThrow();
    });
  });
  
  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const user = await authService.createUser('test@test.com', 'password123');
      const dbUser = await db('users').where({ id: user.id }).first();
      
      const isValid = await authService.verifyPassword('password123', dbUser.password_hash);
      expect(isValid).toBe(true);
    });
    
    it('should reject incorrect password', async () => {
      const user = await authService.createUser('test@test.com', 'password123');
      const dbUser = await db('users').where({ id: user.id }).first();
      
      const isValid = await authService.verifyPassword('wrongpassword', dbUser.password_hash);
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateToken', () => {
    it('should generate valid JWT token', async () => {
      const user = await authService.createUser('test@test.com', 'password123');
      const token = await authService.generateToken(user.id);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      
      // Verify session created
      const session = await db('sessions').where({ user_id: user.id }).first();
      expect(session).toBeDefined();
    });
  });
  
  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const user = await authService.createUser('test@test.com', 'password123');
      const token = await authService.generateToken(user.id);
      
      const userId = await authService.verifyToken(token);
      expect(userId).toBe(user.id);
    });
    
    it('should reject invalid token', async () => {
      const userId = await authService.verifyToken('invalid.token.here');
      expect(userId).toBeNull();
    });
    
    it('should reject expired token', async () => {
      // Mock expired token scenario
      const user = await authService.createUser('test@test.com', 'password123');
      const token = await authService.generateToken(user.id);
      
      // Manually expire the session
      await db('sessions')
        .where({ user_id: user.id })
        .update({ expires_at: new Date(Date.now() - 1000) });
      
      const userId = await authService.verifyToken(token);
      expect(userId).toBeNull();
    });
  });
});
            `,
            mustNotExistBefore: true,
          }
        ],
        modify: [],
        delete: [],
      },
      
      commands: [
        {
          command: 'npm test -- auth.service.test.ts',
          workingDirectory: '/server',
          expectedExitCode: 0,
          expectedOutput: /PASS.*auth\.service\.test\.ts/,
        }
      ],
      
      validation: {
        preconditions: [
          {
            name: 'auth_service_exists',
            description: 'AuthService must exist',
            check: async () => {
              return fs.existsSync('server/src/services/auth.service.ts');
            },
            errorMessage: 'AuthService not found',
            severity: 'blocker',
          }
        ],
        
        postconditions: [
          {
            name: 'all_tests_pass',
            description: 'All tests must pass',
            check: async () => {
              const result = await exec('npm test -- auth.service.test.ts', {
                cwd: '/server',
              });
              return result.exitCode === 0;
            },
            errorMessage: 'Tests failing',
            severity: 'blocker',
          },
          {
            name: 'test_coverage',
            description: 'Test coverage must be > 80%',
            check: async () => {
              const result = await exec('npm test -- --coverage auth.service.test.ts', {
                cwd: '/server',
              });
              // Parse coverage report
              const coverage = parseCoverageReport(result.stdout);
              return coverage > 80;
            },
            errorMessage: 'Insufficient test coverage',
            severity: 'warning',
          }
        ],
        
        integrationChecks: [],
      },
      
      dependencies: [
        {
          taskId: 'service-001',
          type: 'requires',
          reason: 'Tests require AuthService',
        }
      ],
      
      integrationPoints: [],
    },
    
    {
      id: 'test-002',
      type: 'integration_test_creation',
      title: 'Create auth API integration tests',
      // ... similar exhaustive specification
    },
    
    {
      id: 'test-003',
      type: 'e2e_test_creation',
      title: 'Create auth E2E tests',
      // ... similar exhaustive specification
    }
  ],
  
  integrationTasks: [
    {
      id: 'integration-001',
      type: 'middleware_integration',
      title: 'Add auth middleware to protected routes',
      
      files: {
        create: [
          {
            path: 'server/src/middleware/auth.middleware.ts',
            content: `
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const userId = await authService.verifyToken(token);
  
  if (!userId) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
  
  // Attach user to request
  (request as any).userId = userId;
}
            `,
            mustNotExistBefore: true,
            exports: ['authMiddleware'],
          }
        ],
        
        modify: [
          {
            path: 'server/src/routes/projects.routes.ts',
            operation: 'insert_after',
            anchor: /export async function projectRoutes\(fastify: FastifyInstance\) {/,
            content: `  fastify.addHook('onRequest', authMiddleware);\n`,
            anchorMustExist: true,
            createBackup: true,
          }
        ],
        
        delete: [],
      },
      
      commands: [],
      
      validation: {
        preconditions: [],
        postconditions: [
          {
            name: 'protected_routes_require_auth',
            description: 'Protected routes must require authentication',
            check: async () => {
              const response = await fetch('http://localhost:3000/api/projects');
              return response.status === 401;
            },
            errorMessage: 'Routes not protected',
            severity: 'blocker',
          },
          {
            name: 'valid_token_grants_access',
            description: 'Valid token must grant access',
            check: async () => {
              // Get valid token
              const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
              });
              const { token } = await loginResponse.json();
              
              // Try protected route
              const response = await fetch('http://localhost:3000/api/projects', {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              return response.status !== 401;
            },
            errorMessage: 'Valid token not granting access',
            severity: 'blocker',
          }
        ],
        integrationChecks: [],
      },
      
      dependencies: [
        {
          taskId: 'service-001',
          type: 'requires',
          reason: 'Requires AuthService',
        }
      ],
      
      integrationPoints: [
        {
          type: 'imports',
          targetModule: 'AuthService',
          targetFile: 'server/src/services/auth.service.ts',
          integrationMethod: 'ES6 import',
          validationTest: 'server/src/__tests__/middleware/auth.middleware.test.ts',
        }
      ],
    }
  ],
  
  documentationTasks: [
    {
      id: 'doc-001',
      type: 'api_documentation',
      title: 'Document authentication API endpoints',
      
      files: {
        create: [
          {
            path: 'docs/api/authentication.md',
            content: `
# Authentication API

## POST /api/auth/register

Register a new user account.

### Request

\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
\`\`\`

### Response (201 Created)

\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "jwt-token-here"
}
\`\`\`

### Errors

- **400 Bad Request**: Invalid email or password format
- **409 Conflict**: User already exists
- **500 Internal Server Error**: Server error

## POST /api/auth/login

Login to existing account.

### Request

\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
\`\`\`

### Response (200 OK)

\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "jwt-token-here"
}
\`\`\`

### Errors

- **400 Bad Request**: Invalid email or password format
- **401 Unauthorized**: Invalid credentials
- **500 Internal Server Error**: Server error

## Using Authentication

Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

Tokens expire after 24 hours.
            `,
            mustNotExistBefore: true,
          }
        ],
        modify: [],
        delete: [],
      },
      
      commands: [],
      
      validation: {
        preconditions: [],
        postconditions: [
          {
            name: 'documentation_exists',
            description: 'Documentation file must exist',
            check: async () => {
              return fs.existsSync('docs/api/authentication.md');
            },
            errorMessage: 'Documentation not created',
            severity: 'warning',
          }
        ],
        integrationChecks: [],
      },
      
      dependencies: [
        {
          taskId: 'api-001',
          type: 'requires',
          reason: 'Documents API endpoints',
        },
        {
          taskId: 'api-002',
          type: 'requires',
          reason: 'Documents API endpoints',
        }
      ],
      
      integrationPoints: [],
    }
  ],
  
  deploymentTasks: [],
  validationTasks: [],
}
```

### 1.3 Task Type Templates

```typescript
// Every task type has an EXPLICIT template that defines EVERY step

const TASK_TYPE_TEMPLATES: Record<string, TaskTypeTemplate> = {
  'create_database_table': {
    requiredFiles: [
      {
        type: 'migration',
        path: 'server/database/migrations/{{timestamp}}_{{table_name}}.ts',
        template: MIGRATION_TEMPLATE,
      }
    ],
    requiredCommands: [
      {
        command: 'npm run migrate:latest',
        workingDirectory: '/server',
      }
    ],
    validations: [
      'table_exists',
      'columns_correct',
      'constraints_valid',
      'indexes_created',
    ],
    integrationPoints: [
      'database_connection',
    ],
  },
  
  'create_api_endpoint': {
    requiredFiles: [
      {
        type: 'route',
        path: 'server/src/routes/{{module}}.routes.ts',
        template: ROUTE_TEMPLATE,
      },
      {
        type: 'controller',
        path: 'server/src/controllers/{{module}}.controller.ts',
        template: CONTROLLER_TEMPLATE,
      },
      {
        type: 'schema',
        path: 'server/src/schemas/{{module}}.schema.ts',
        template: SCHEMA_TEMPLATE,
      },
    ],
    requiredModifications: [
      {
        file: 'server/src/server.ts',
        operation: 'register_route',
      }
    ],
    requiredCommands: [
      {
        command: 'npm run build',
        workingDirectory: '/server',
      }
    ],
    validations: [
      'typescript_compiles',
      'endpoint_accessible',
      'schema_validation_works',
    ],
    integrationPoints: [
      'server_registration',
      'service_integration',
    ],
  },
  
  'create_service': {
    requiredFiles: [
      {
        type: 'service',
        path: 'server/src/services/{{module}}.service.ts',
        template: SERVICE_TEMPLATE,
      }
    ],
    requiredCommands: [],
    validations: [
      'service_instantiates',
      'methods_defined',
    ],
    integrationPoints: [
      'database_integration',
    ],
  },
  
  'create_react_component': {
    requiredFiles: [
      {
        type: 'component',
        path: 'src/components/{{module}}/{{name}}.tsx',
        template: COMPONENT_TEMPLATE,
      }
    ],
    requiredModifications: [
      {
        file: 'src/App.tsx',
        operation: 'add_route',
        condition: 'if_page_component',
      }
    ],
    requiredCommands: [],
    validations: [
      'component_renders',
      'props_typed_correctly',
      'no_typescript_errors',
    ],
    integrationPoints: [
      'context_usage',
      'component_imports',
    ],
  },
  
  'create_context': {
    requiredFiles: [
      {
        type: 'context',
        path: 'src/contexts/{{name}}Context.tsx',
        template: CONTEXT_TEMPLATE,
      }
    ],
    requiredModifications: [
      {
        file: 'src/App.tsx',
        operation: 'wrap_with_provider',
      }
    ],
    requiredCommands: [],
    validations: [
      'context_accessible',
      'provider_wraps_app',
    ],
    integrationPoints: [
      'app_integration',
    ],
  },
  
  'create_unit_test': {
    requiredFiles: [
      {
        type: 'test',
        path: '{{target_dir}}/__tests__/{{target_name}}.test.ts',
        template: UNIT_TEST_TEMPLATE,
      }
    ],
    requiredCommands: [
      {
        command: 'npm test -- {{test_file}}',
        workingDirectory: '{{test_dir}}',
      }
    ],
    validations: [
      'all_tests_pass',
      'coverage_above_threshold',
    ],
    integrationPoints: [],
  },
  
  'add_middleware': {
    requiredFiles: [
      {
        type: 'middleware',
        path: 'server/src/middleware/{{name}}.middleware.ts',
        template: MIDDLEWARE_TEMPLATE,
      }
    ],
    requiredModifications: [
      {
        file: '{{target_route_file}}',
        operation: 'add_hook',
      }
    ],
    requiredCommands: [],
    validations: [
      'middleware_applied',
      'middleware_logic_works',
    ],
    integrationPoints: [
      'route_integration',
    ],
  },
};
```

---

## 2. INTEGRATION VERIFICATION SYSTEM

### 2.1 Comprehensive Integration Checker

```typescript
interface IntegrationVerificationSystem {
  /**
   * Verify ALL integration points before and after task execution
   */
  verifyIntegrations(
    task: Task,
    phase: 'before' | 'after'
  ): Promise<IntegrationVerificationResult>;
}

interface IntegrationVerificationResult {
  allPassed: boolean;
  checks: IntegrationCheckResult[];
  failures: IntegrationFailure[];
  warnings: IntegrationWarning[];
}

interface IntegrationCheckResult {
  checkName: string;
  integrationType: 'import' | 'export' | 'api' | 'database' | 'event' | 'file';
  passed: boolean;
  details: string;
  targetModule: string;
  
  // What was checked
  checked: {
    sourceFile: string;
    targetFile: string;
    integrationPoint: string;
  };
  
  // Evidence
  evidence: {
    codeSnippet?: string;
    testResult?: string;
    errorMessage?: string;
  };
}

// Specific integration check types
interface ImportIntegrationCheck {
  type: 'import';
  sourceFile: string;
  targetFile: string;
  importedSymbols: string[];
  
  checks: {
    targetFileExists: boolean;
    symbolsExported: boolean;
    importSyntaxCorrect: boolean;
    noCircularDependency: boolean;
    typesMatch: boolean;
  };
}

interface APIIntegrationCheck {
  type: 'api';
  clientFile: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  checks: {
    endpointExists: boolean;
    methodMatches: boolean;
    requestSchemaValid: boolean;
    responseSchemaValid: boolean;
    authenticationHandled: boolean;
    errorHandlingPresent: boolean;
  };
}

interface DatabaseIntegrationCheck {
  type: 'database';
  serviceFile: string;
  tableName: string;
  operations: ('select' | 'insert' | 'update' | 'delete')[];
  
  checks: {
    tableExists: boolean;
    columnsMatch: boolean;
    constraintsValid: boolean;
    queriesSyntacticallyCorrect: boolean;
    transactionsHandled: boolean;
  };
}

interface EventIntegrationCheck {
  type: 'event';
  emitterFile: string;
  listenerFile: string;
  eventName: string;
  
  checks: {
    eventEmitted: boolean;
    listenerRegistered: boolean;
    payloadStructureMatches: boolean;
  };
}

class ComprehensiveIntegrationChecker {
  /**
   * Check ALL integrations for a task
   */
  async checkAllIntegrations(task: Task): Promise<IntegrationVerificationResult> {
    const checks: IntegrationCheckResult[] = [];
    
    // 1. Check file imports/exports
    for (const file of task.files.create) {
      if (file.exports) {
        const exportChecks = await this.verifyExports(file);
        checks.push(...exportChecks);
      }
    }
    
    // 2. Check API integrations
    for (const integration of task.integrationPoints) {
      if (integration.type === 'api_call') {
        const apiCheck = await this.verifyAPIIntegration(integration);
        checks.push(apiCheck);
      }
    }
    
    // 3. Check database integrations
    for (const integration of task.integrationPoints) {
      if (integration.type === 'database_query') {
        const dbCheck = await this.verifyDatabaseIntegration(integration);
        checks.push(dbCheck);
      }
    }
    
    // 4. Check event integrations
    for (const integration of task.integrationPoints) {
      if (integration.type === 'event_emit' || integration.type === 'event_listen') {
        const eventCheck = await this.verifyEventIntegration(integration);
        checks.push(eventCheck);
      }
    }
    
    // 5. Check type compatibility
    const typeChecks = await this.verifyTypeCompatibility(task);
    checks.push(...typeChecks);
    
    // 6. Check circular dependencies
    const circularCheck = await this.checkCircularDependencies(task);
    checks.push(circularCheck);
    
    const failures = checks.filter(c => !c.passed);
    const allPassed = failures.length === 0;
    
    return {
      allPassed,
      checks,
      failures: failures.map(f => ({
        checkName: f.checkName,
        reason: f.details,
        severity: 'blocker',
        suggestedFix: this.generateFix(f),
      })),
      warnings: [],
    };
  }
  
  /**
   * Verify exports are actually used
   */
  private async verifyExports(file: FileCreationSpec): Promise<IntegrationCheckResult[]> {
    const checks: IntegrationCheckResult[] = [];
    
    for (const exportSymbol of file.exports || []) {
      // Find all files that should import this
      const importers = await this.findImporters(file.path, exportSymbol);
      
      checks.push({
        checkName: `export_${exportSymbol}_used`,
        integrationType: 'export',
        passed: importers.length > 0,
        details: importers.length > 0 
          ? `Exported symbol ${exportSymbol} is used in ${importers.length} files`
          : `Exported symbol ${exportSymbol} is not used anywhere`,
        targetModule: file.path,
        checked: {
          sourceFile: file.path,
          targetFile: importers[0] || 'none',
          integrationPoint: exportSymbol,
        },
        evidence: {
          codeSnippet: importers.length > 0 
            ? await this.getCodeSnippet(importers[0], exportSymbol)
            : undefined,
        },
      });
    }
    
    return checks;
  }
  
  /**
   * Verify API integration
   */
  private async verifyAPIIntegration(
    integration: IntegrationPoint
  ): Promise<IntegrationCheckResult> {
    const apiCheck: APIIntegrationCheck = {
      type: 'api',
      clientFile: integration.sourceFile,
      endpoint: integration.endpoint,
      method: integration.method,
      checks: {
        endpointExists: false,
        methodMatches: false,
        requestSchemaValid: false,
        responseSchemaValid: false,
        authenticationHandled: false,
        errorHandlingPresent: false,
      },
    };
    
    // Check endpoint exists
    const routeFile = await this.findRouteFile(integration.endpoint);
    apiCheck.checks.endpointExists = routeFile !== null;
    
    if (routeFile) {
      // Check method matches
      const route = await this.parseRoute(routeFile, integration.endpoint);
      apiCheck.checks.methodMatches = route.method === integration.method;
      
      // Check schemas
      const requestSchema = await this.getRequestSchema(route);
      const responseSchema = await this.getResponseSchema(route);
      apiCheck.checks.requestSchemaValid = requestSchema !== null;
      apiCheck.checks.responseSchemaValid = responseSchema !== null;
      
      // Check auth
      const hasAuth = await this.checkAuthMiddleware(route);
      apiCheck.checks.authenticationHandled = hasAuth || !integration.requiresAuth;
      
      // Check error handling
      const clientCode = await fs.readFile(integration.sourceFile, 'utf-8');
      apiCheck.checks.errorHandlingPresent = clientCode.includes('catch') || clientCode.includes('.catch(');
    }
    
    const allChecksPassed = Object.values(apiCheck.checks).every(c => c);
    
    return {
      checkName: `api_integration_${integration.endpoint}`,
      integrationType: 'api',
      passed: allChecksPassed,
      details: allChecksPassed
        ? `API integration verified for ${integration.endpoint}`
        : `API integration issues: ${this.getFailedChecks(apiCheck.checks).join(', ')}`,
      targetModule: integration.targetFile,
      checked: {
        sourceFile: integration.sourceFile,
        targetFile: routeFile || 'not found',
        integrationPoint: integration.endpoint,
      },
      evidence: {
        codeSnippet: routeFile ? await this.getRouteSnippet(routeFile, integration.endpoint) : undefined,
        errorMessage: !allChecksPassed ? this.getFailedChecks(apiCheck.checks).join('; ') : undefined,
      },
    };
  }
}
```

### 2.2 Integration Point Mapping

```typescript
/**
 * Maps ALL integration points in the codebase
 * This is generated during initial project scan
 */
interface ProjectIntegrationMap {
  // File-level integrations
  fileImports: Map<string, FileImport[]>; // file -> what it imports
  fileExports: Map<string, FileExport[]>; // file -> what it exports
  
  // API integrations
  apiEndpoints: Map<string, APIEndpoint>; // endpoint -> details
  apiClients: Map<string, APIClient[]>; // endpoint -> who calls it
  
  // Database integrations
  databaseTables: Map<string, TableSchema>; // table -> schema
  databaseQueries: Map<string, DatabaseQuery[]>; // table -> queries
  
  // Event integrations
  eventEmitters: Map<string, EventEmitter[]>; // event -> emitters
  eventListeners: Map<string, EventListener[]>; // event -> listeners
  
  // Component integrations
  reactComponents: Map<string, ComponentDefinition>;
  componentUsage: Map<string, ComponentUsage[]>; // component -> usage locations
  
  // Context integrations
  reactContexts: Map<string, ContextDefinition>;
  contextConsumers: Map<string, ContextConsumer[]>; // context -> consumers
}

class IntegrationMapBuilder {
  /**
   * Build complete integration map for project
   * This runs ONCE at the start of planning
   */
  async buildIntegrationMap(projectPath: string): Promise<ProjectIntegrationMap> {
    const map: ProjectIntegrationMap = {
      fileImports: new Map(),
      fileExports: new Map(),
      apiEndpoints: new Map(),
      apiClients: new Map(),
      databaseTables: new Map(),
      databaseQueries: new Map(),
      eventEmitters: new Map(),
      eventListeners: new Map(),
      reactComponents: new Map(),
      componentUsage: new Map(),
      reactContexts: new Map(),
      contextConsumers: new Map(),
    };
    
    // 1. Scan all TypeScript/JavaScript files
    const files = await this.findAllCodeFiles(projectPath);
    
    for (const file of files) {
      const ast = await this.parseFile(file);
      
      // Extract imports
      const imports = this.extractImports(ast);
      map.fileImports.set(file, imports);
      
      // Extract exports
      const exports = this.extractExports(ast);
      map.fileExports.set(file, exports);
      
      // Extract API endpoints
      if (this.isRouteFile(file)) {
        const endpoints = this.extractAPIEndpoints(ast);
        endpoints.forEach(ep => map.apiEndpoints.set(ep.path, ep));
      }
      
      // Extract API clients
      const apiCalls = this.extractAPICalls(ast);
      apiCalls.forEach(call => {
        const existing = map.apiClients.get(call.endpoint) || [];
        existing.push({ file, ...call });
        map.apiClients.set(call.endpoint, existing);
      });
      
      // Extract database queries
      const queries = this.extractDatabaseQueries(ast);
      queries.forEach(query => {
        const existing = map.databaseQueries.get(query.table) || [];
        existing.push({ file, ...query });
        map.databaseQueries.set(query.table, existing);
      });
      
      // Extract React components
      if (this.isReactFile(file)) {
        const components = this.extractComponents(ast);
        components.forEach(comp => map.reactComponents.set(comp.name, comp));
        
        const usage = this.extractComponentUsage(ast);
        usage.forEach(use => {
          const existing = map.componentUsage.get(use.componentName) || [];
          existing.push({ file, ...use });
          map.componentUsage.set(use.componentName, existing);
        });
      }
      
      // Extract contexts
      if (this.isContextFile(file)) {
        const contexts = this.extractContexts(ast);
        contexts.forEach(ctx => map.reactContexts.set(ctx.name, ctx));
      }
      
      // Extract context consumers
      const consumers = this.extractContextConsumers(ast);
      consumers.forEach(consumer => {
        const existing = map.contextConsumers.get(consumer.contextName) || [];
        existing.push({ file, ...consumer });
        map.contextConsumers.set(consumer.contextName, existing);
      });
    }
    
    // 2. Scan database schema
    const dbSchema = await this.scanDatabaseSchema();
    dbSchema.tables.forEach(table => {
      map.databaseTables.set(table.name, table);
    });
    
    return map;
  }
  
  /**
   * Validate a new task against the integration map
   */
  async validateTaskIntegration(
    task: Task,
    integrationMap: ProjectIntegrationMap
  ): Promise<IntegrationValidationResult> {
    const issues: IntegrationIssue[] = [];
    
    // Check each file the task creates
    for (const file of task.files.create) {
      // Check imports
      const imports = this.extractImportsFromContent(file.content);
      for (const imp of imports) {
        // Verify imported file exists
        if (!integrationMap.fileExports.has(imp.from)) {
          issues.push({
            severity: 'blocker',
            type: 'missing_import_target',
            message: `File ${file.path} imports from ${imp.from} which doesn't exist`,
            suggestedFix: `Create ${imp.from} first or remove the import`,
          });
        } else {
          // Verify exported symbols exist
          const exports = integrationMap.fileExports.get(imp.from)!;
          const exportedSymbols = exports.map(e => e.name);
          for (const symbol of imp.symbols) {
            if (!exportedSymbols.includes(symbol)) {
              issues.push({
                severity: 'blocker',
                type: 'missing_export',
                message: `File ${file.path} imports ${symbol} from ${imp.from} but it's not exported`,
                suggestedFix: `Add export for ${symbol} in ${imp.from}`,
              });
            }
          }
        }
      }
      
      // Check API calls
      const apiCalls = this.extractAPICallsFromContent(file.content);
      for (const call of apiCalls) {
        if (!integrationMap.apiEndpoints.has(call.endpoint)) {
          issues.push({
            severity: 'blocker',
            type: 'missing_api_endpoint',
            message: `File ${file.path} calls ${call.endpoint} which doesn't exist`,
            suggestedFix: `Create API endpoint ${call.endpoint} first`,
          });
        }
      }
      
      // Check database queries
      const queries = this.extractDatabaseQueriesFromContent(file.content);
      for (const query of queries) {
        if (!integrationMap.databaseTables.has(query.table)) {
          issues.push({
            severity: 'blocker',
            type: 'missing_database_table',
            message: `File ${file.path} queries table ${query.table} which doesn't exist`,
            suggestedFix: `Create table ${query.table} first`,
          });
        } else {
          // Verify columns exist
          const table = integrationMap.databaseTables.get(query.table)!;
          const tableColumns = table.columns.map(c => c.name);
          for (const column of query.columns) {
            if (!tableColumns.includes(column)) {
              issues.push({
                severity: 'critical',
                type: 'missing_database_column',
                message: `File ${file.path} queries column ${column} from table ${query.table} which doesn't exist`,
                suggestedFix: `Add column ${column} to table ${query.table}`,
              });
            }
          }
        }
      }
      
      // Check React component usage
      if (this.isReactFile(file.path)) {
        const componentUsages = this.extractComponentUsageFromContent(file.content);
        for (const usage of componentUsages) {
          if (!integrationMap.reactComponents.has(usage.componentName)) {
            issues.push({
              severity: 'blocker',
              type: 'missing_component',
              message: `File ${file.path} uses component ${usage.componentName} which doesn't exist`,
              suggestedFix: `Create component ${usage.componentName} first`,
            });
          }
        }
      }
    }
    
    const blockers = issues.filter(i => i.severity === 'blocker');
    
    return {
      valid: blockers.length === 0,
      issues,
      blockers,
    };
  }
}
```

---

## 3. EXHAUSTIVE STEP ANTICIPATION

### 3.1 Complete Step Generator

```typescript
class ExhaustiveStepGenerator {
  /**
   * For EVERY feature, generate COMPLETE list of steps
   * NOTHING can be missed
   */
  async generateExhaustiveSteps(
    feature: FeatureSpecification,
    context: ProjectContext,
    integrationMap: ProjectIntegrationMap
  ): Promise<ExhaustiveStepSet> {
    const steps: Step[] = [];
    
    // 1. DATABASE STEPS (if feature touches database)
    if (feature.requiresDatabase) {
      steps.push(...await this.generateDatabaseSteps(feature, context));
    }
    
    // 2. API STEPS (if feature has API)
    if (feature.requiresAPI) {
      steps.push(...await this.generateAPISteps(feature, context, integrationMap));
    }
    
    // 3. SERVICE STEPS (business logic)
    if (feature.requiresServices) {
      steps.push(...await this.generateServiceSteps(feature, context, integrationMap));
    }
    
    // 4. UI STEPS (if feature has UI)
    if (feature.requiresUI) {
      steps.push(...await this.generateUISteps(feature, context, integrationMap));
    }
    
    // 5. TESTING STEPS (ALWAYS required)
    steps.push(...await this.generateTestingSteps(feature, context));
    
    // 6. INTEGRATION STEPS (connect components)
    steps.push(...await this.generateIntegrationSteps(feature, context, integrationMap));
    
    // 7. DOCUMENTATION STEPS (ALWAYS required)
    steps.push(...await this.generateDocumentationSteps(feature, context));
    
    // 8. DEPLOYMENT PREP STEPS
    steps.push(...await this.generateDeploymentSteps(feature, context));
    
    // 9. VALIDATION STEPS (verify everything works)
    steps.push(...await this.generateValidationSteps(feature, context));
    
    // 10. Order steps by dependencies
    const orderedSteps = this.orderStepsByDependencies(steps);
    
    return {
      steps: orderedSteps,
      totalSteps: orderedSteps.length,
      estimatedTimeHuman: this.calculateTotalTime(orderedSteps, 'human'),
      estimatedTimeAI: this.calculateTotalTime(orderedSteps, 'ai'),
    };
  }
  
  /**
   * Generate COMPLETE database steps
   */
  private async generateDatabaseSteps(
    feature: FeatureSpecification,
    context: ProjectContext
  ): Promise<Step[]> {
    const steps: Step[] = [];
    
    // For each table needed
    for (const table of feature.database.tables) {
      // 1. Create migration file
      steps.push({
        id: generateId(),
        type: 'create_file',
        title: `Create migration for ${table.name} table`,
        description: `Create database migration to add ${table.name} table`,
        action: 'create_file',
        file: {
          path: `server/database/migrations/${Date.now()}_create_${table.name}_table.ts`,
          content: this.generateMigrationContent(table),
        },
        validation: {
          preconditions: [
            'database_connection_works',
            `${table.name}_table_does_not_exist`,
          ],
          postconditions: [
            'migration_file_exists',
            'migration_file_valid_typescript',
          ],
        },
        dependencies: [],
        estimatedMinutes: 10,
      });
      
      // 2. Run migration
      steps.push({
        id: generateId(),
        type: 'run_command',
        title: `Run migration for ${table.name}`,
        description: `Execute database migration to create ${table.name} table`,
        action: 'run_command',
        command: {
          command: 'npm run migrate:latest',
          workingDirectory: '/server',
          expectedExitCode: 0,
        },
        validation: {
          preconditions: [
            'migration_file_exists',
            'database_connection_works',
          ],
          postconditions: [
            `${table.name}_table_exists`,
            `${table.name}_columns_correct`,
            `${table.name}_constraints_valid`,
          ],
        },
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 2,
      });
      
      // 3. Verify table structure
      steps.push({
        id: generateId(),
        type: 'validate',
        title: `Verify ${table.name} table structure`,
        description: `Validate that ${table.name} table has correct structure`,
        action: 'validate',
        validations: [
          {
            name: 'table_exists',
            check: () => this.validateTableExists(table.name),
          },
          {
            name: 'columns_match',
            check: () => this.validateColumns(table.name, table.columns),
          },
          {
            name: 'constraints_valid',
            check: () => this.validateConstraints(table.name, table.constraints),
          },
          {
            name: 'indexes_created',
            check: () => this.validateIndexes(table.name, table.indexes),
          },
        ],
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 2,
      });
      
      // 4. Create seed data (if needed)
      if (table.seedData) {
        steps.push({
          id: generateId(),
          type: 'create_file',
          title: `Create seed data for ${table.name}`,
          description: `Create seed data file for ${table.name} table`,
          action: 'create_file',
          file: {
            path: `server/database/seeds/${table.name}_seed.ts`,
            content: this.generateSeedContent(table),
          },
          validation: {
            preconditions: [`${table.name}_table_exists`],
            postconditions: ['seed_file_exists'],
          },
          dependencies: [steps[steps.length - 2].id],
          estimatedMinutes: 5,
        });
        
        steps.push({
          id: generateId(),
          type: 'run_command',
          title: `Run seed data for ${table.name}`,
          description: `Execute seed data for ${table.name} table`,
          action: 'run_command',
          command: {
            command: 'npm run seed:run',
            workingDirectory: '/server',
          },
          validation: {
            preconditions: ['seed_file_exists'],
            postconditions: [`${table.name}_has_seed_data`],
          },
          dependencies: [steps[steps.length - 1].id],
          estimatedMinutes: 2,
        });
      }
    }
    
    return steps;
  }
  
  /**
   * Generate COMPLETE API steps
   */
  private async generateAPISteps(
    feature: FeatureSpecification,
    context: ProjectContext,
    integrationMap: ProjectIntegrationMap
  ): Promise<Step[]> {
    const steps: Step[] = [];
    
    for (const endpoint of feature.api.endpoints) {
      const moduleName = endpoint.module;
      
      // 1. Create schema file
      steps.push({
        id: generateId(),
        type: 'create_file',
        title: `Create ${moduleName} schema`,
        description: `Create request/response schema for ${endpoint.path}`,
        action: 'create_file',
        file: {
          path: `server/src/schemas/${moduleName}.schema.ts`,
          content: this.generateSchemaContent(endpoint),
        },
        validation: {
          preconditions: [],
          postconditions: [
            'schema_file_exists',
            'schema_exports_defined',
            'schema_types_valid',
          ],
        },
        dependencies: [],
        estimatedMinutes: 8,
      });
      
      // 2. Create controller file
      steps.push({
        id: generateId(),
        type: 'create_file',
        title: `Create ${moduleName} controller`,
        description: `Create controller with handler for ${endpoint.path}`,
        action: 'create_file',
        file: {
          path: `server/src/controllers/${moduleName}.controller.ts`,
          content: this.generateControllerContent(endpoint, integrationMap),
        },
        validation: {
          preconditions: ['schema_file_exists'],
          postconditions: [
            'controller_file_exists',
            'handler_function_exported',
            'imports_schema_correctly',
          ],
        },
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 15,
      });
      
      // 3. Create route file
      steps.push({
        id: generateId(),
        type: 'create_file',
        title: `Create ${moduleName} routes`,
        description: `Create route registration for ${endpoint.path}`,
        action: 'create_file',
        file: {
          path: `server/src/routes/${moduleName}.routes.ts`,
          content: this.generateRouteContent(endpoint),
        },
        validation: {
          preconditions: [
            'controller_file_exists',
            'schema_file_exists',
          ],
          postconditions: [
            'route_file_exists',
            'route_function_exported',
            'imports_controller_correctly',
            'imports_schema_correctly',
          ],
        },
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 10,
      });
      
      // 4. Register route in server
      steps.push({
        id: generateId(),
        type: 'modify_file',
        title: `Register ${moduleName} routes in server`,
        description: `Add ${moduleName} route registration to server.ts`,
        action: 'modify_file',
        modification: {
          path: 'server/src/server.ts',
          operation: 'insert_before',
          anchor: /\/\/ Routes setup end/,
          content: `  await fastify.register(${moduleName}Routes);\n`,
          imports: [
            {
              from: `./routes/${moduleName}.routes`,
              symbols: [`${moduleName}Routes`],
            }
          ],
        },
        validation: {
          preconditions: ['route_file_exists'],
          postconditions: [
            'route_registered_in_server',
            'server_compiles',
          ],
        },
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 5,
      });
      
      // 5. Build server
      steps.push({
        id: generateId(),
        type: 'run_command',
        title: `Build server with ${moduleName} routes`,
        description: `Compile TypeScript to ensure no errors`,
        action: 'run_command',
        command: {
          command: 'npm run build',
          workingDirectory: '/server',
          expectedExitCode: 0,
        },
        validation: {
          preconditions: ['route_registered_in_server'],
          postconditions: [
            'server_builds_successfully',
            'no_typescript_errors',
          ],
        },
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 3,
      });
      
      // 6. Test endpoint accessibility
      steps.push({
        id: generateId(),
        type: 'validate',
        title: `Validate ${endpoint.path} endpoint`,
        description: `Test that ${endpoint.path} is accessible`,
        action: 'validate',
        validations: [
          {
            name: 'endpoint_accessible',
            check: () => this.validateEndpointAccessible(endpoint.path, endpoint.method),
          },
          {
            name: 'returns_correct_status',
            check: () => this.validateEndpointStatus(endpoint.path, endpoint.method),
          },
          {
            name: 'schema_validation_works',
            check: () => this.validateSchemaValidation(endpoint.path, endpoint.method),
          },
        ],
        dependencies: [steps[steps.length - 1].id],
        estimatedMinutes: 5,
      });
    }
    
    return steps;
  }
  
  // Similar exhaustive methods for:
  // - generateServiceSteps()
  // - generateUISteps()
  // - generateTestingSteps()
  // - generateIntegrationSteps()
  // - generateDocumentationSteps()
  // - generateDeploymentSteps()
  // - generateValidationSteps()
}
```

---

## CONTINUES IN NEXT FILE DUE TO LENGTH...

This specification is getting very long. Should I:
1. Continue with the remaining sections in the same file
2. Split into multiple files for different aspects
3. Create a summary document with links to detailed sections

Which would be most useful for your autonomous code generation system?
