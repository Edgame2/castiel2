#!/usr/bin/env tsx
/**
 * Comprehensive AI Features Test Script
 * Tests: AI Model Catalog + System Connections + Tenant BYOK Connections
 * 
 * Prerequisites:
 * 1. API server running on http://localhost:3001
 * 2. Database initialized with aimodel and aiconnexion containers
 * 3. Azure Key Vault configured with service principal
 * 4. Super admin user authenticated
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const API_BASE_URL = process.env.AUTH_BROKER_URL || 'http://localhost:3001';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_GPT_51_CHAT!;

// You'll need to replace this with a real admin JWT token
// Get it by logging in as super admin via the frontend or auth endpoint
const ADMIN_TOKEN = process.env.ADMIN_JWT_TOKEN || 'YOUR_ADMIN_JWT_TOKEN_HERE';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(message: string, data?: any) {
  console.log(`\n📝 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(error.response?.data || error.message || error);
  }
}

async function apiCall(method: string, endpoint: string, data?: any, token?: string) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
  }

  return responseData;
}

// ============================================================================
// TEST 1: AI Model Catalog Management (Super Admin)
// ============================================================================

async function testAIModelCatalog() {
  log('🧪 TEST 1: AI Model Catalog Management');

  const modelIds: string[] = [];

  try {
    // 1.1: Create GPT-4o Model
    log('Creating GPT-4o model...');
    const gpt4Model = await apiCall('POST', '/api/v1/admin/ai/models', {
      name: 'GPT-4o',
      provider: 'OpenAI',
      type: 'LLM',
      hoster: 'Azure',
      allowTenantConnections: true,
      contextWindow: 128000,
      maxOutputs: 16384,
      streaming: true,
      vision: true,
      functions: true,
      jsonMode: true,
      description: 'GPT-4o with 128K context window',
      modelIdentifier: 'gpt-4o',
      pricing: {
        inputTokenPrice: 2.5,
        outputTokenPrice: 10.0,
        currency: 'USD',
      },
    }, ADMIN_TOKEN);
    
    modelIds.push(gpt4Model.model.id);
    logSuccess(`Created GPT-4o model: ${gpt4Model.model.id}`);
    results.push({ test: 'Create GPT-4o Model', status: 'PASS', message: 'Model created successfully', data: gpt4Model.model });

    // 1.2: Create Text Embedding Model
    log('Creating text-embedding-3-large model...');
    const embeddingModel = await apiCall('POST', '/api/v1/admin/ai/models', {
      name: 'Text Embedding 3 Large',
      provider: 'OpenAI',
      type: 'Embedding',
      hoster: 'Azure',
      allowTenantConnections: true,
      contextWindow: 8192,
      maxOutputs: 3072, // embedding dimensions
      streaming: false,
      vision: false,
      functions: false,
      jsonMode: false,
      description: 'OpenAI text-embedding-3-large for embeddings',
      modelIdentifier: 'text-embedding-3-large',
      pricing: {
        inputTokenPrice: 0.13,
        outputTokenPrice: 0.0,
        currency: 'USD',
      },
    }, ADMIN_TOKEN);
    
    modelIds.push(embeddingModel.model.id);
    logSuccess(`Created Embedding model: ${embeddingModel.model.id}`);
    results.push({ test: 'Create Embedding Model', status: 'PASS', message: 'Model created successfully', data: embeddingModel.model });

    // 1.3: List all models
    log('Listing all AI models...');
    const modelsList = await apiCall('GET', '/api/v1/admin/ai/models', null, ADMIN_TOKEN);
    logSuccess(`Found ${modelsList.models.length} models`);
    results.push({ test: 'List AI Models', status: 'PASS', message: `Found ${modelsList.models.length} models`, data: modelsList.models });

    // 1.4: Get specific model
    log(`Getting GPT-4o model details...`);
    const modelDetail = await apiCall('GET', `/api/v1/admin/ai/models/${modelIds[0]}`, null, ADMIN_TOKEN);
    logSuccess(`Retrieved model: ${modelDetail.model.name}`);
    results.push({ test: 'Get Model Details', status: 'PASS', message: 'Model retrieved successfully', data: modelDetail.model });

    // 1.5: Update model
    log('Updating GPT-4o model...');
    const updatedModel = await apiCall('PATCH', `/api/v1/admin/ai/models/${modelIds[0]}`, {
      description: 'GPT-4o with 128K context - UPDATED',
      contextWindow: 130000,
    }, ADMIN_TOKEN);
    logSuccess(`Updated model: ${updatedModel.model.name}`);
    results.push({ test: 'Update Model', status: 'PASS', message: 'Model updated successfully', data: updatedModel.model });

    return { modelIds, gpt4ModelId: modelIds[0], embeddingModelId: modelIds[1] };

  } catch (error: any) {
    logError('AI Model Catalog test failed', error);
    results.push({ test: 'AI Model Catalog', status: 'FAIL', message: error.message });
    throw error;
  }
}

// ============================================================================
// TEST 2: System-Wide AI Connections (Super Admin)
// ============================================================================

async function testSystemConnections(gpt4ModelId: string, embeddingModelId: string) {
  log('🧪 TEST 2: System-Wide AI Connections');

  const connectionIds: string[] = [];

  try {
    // 2.1: Create system-wide GPT-4o connection
    log('Creating system-wide GPT-4o connection...');
    const gpt4Connection = await apiCall('POST', '/api/v1/admin/ai/connections', {
      name: 'System GPT-4o Azure',
      modelId: gpt4ModelId,
      endpoint: 'https://castiel-openai.openai.azure.com/',
      version: '2024-10-01-preview',
      deploymentName: 'gpt-4o',
      contextWindow: 128000,
      isDefaultModel: true,
      apiKey: AZURE_OPENAI_KEY,
    }, ADMIN_TOKEN);
    
    connectionIds.push(gpt4Connection.connection.id);
    logSuccess(`Created system connection: ${gpt4Connection.connection.id}`);
    results.push({ test: 'Create System GPT-4o Connection', status: 'PASS', message: 'Connection created successfully', data: gpt4Connection.connection });

    // 2.2: Create system-wide embedding connection
    log('Creating system-wide embedding connection...');
    const embeddingConnection = await apiCall('POST', '/api/v1/admin/ai/connections', {
      name: 'System Embedding Azure',
      modelId: embeddingModelId,
      endpoint: 'https://castiel-openai.openai.azure.com/',
      version: '2024-10-01-preview',
      deploymentName: 'text-embedding-3-large',
      isDefaultModel: true,
      apiKey: AZURE_OPENAI_KEY,
    }, ADMIN_TOKEN);
    
    connectionIds.push(embeddingConnection.connection.id);
    logSuccess(`Created embedding connection: ${embeddingConnection.connection.id}`);
    results.push({ test: 'Create System Embedding Connection', status: 'PASS', message: 'Connection created successfully', data: embeddingConnection.connection });

    // 2.3: List system connections
    log('Listing system connections...');
    const connectionsList = await apiCall('GET', '/api/v1/admin/ai/connections', null, ADMIN_TOKEN);
    logSuccess(`Found ${connectionsList.connections.length} system connections`);
    results.push({ test: 'List System Connections', status: 'PASS', message: `Found ${connectionsList.connections.length} connections`, data: connectionsList.connections });

    // 2.4: Update connection
    log('Updating GPT-4o connection...');
    const updatedConnection = await apiCall('PATCH', `/api/v1/admin/ai/connections/${connectionIds[0]}`, {
      name: 'System GPT-4o Azure (Updated)',
      contextWindow: 130000,
    }, ADMIN_TOKEN);
    logSuccess(`Updated connection: ${updatedConnection.connection.name}`);
    results.push({ test: 'Update System Connection', status: 'PASS', message: 'Connection updated successfully', data: updatedConnection.connection });

    return { connectionIds };

  } catch (error: any) {
    logError('System Connections test failed', error);
    results.push({ test: 'System Connections', status: 'FAIL', message: error.message });
    throw error;
  }
}

// ============================================================================
// TEST 3: Tenant-Specific BYOK Connections
// ============================================================================

async function testTenantConnections(gpt4ModelId: string) {
  log('🧪 TEST 3: Tenant-Specific BYOK Connections');

  try {
    // 3.1: Get available models for tenant
    log('Getting available models for tenant...');
    const availableModels = await apiCall('GET', '/api/v1/tenant/ai/available-models', null, ADMIN_TOKEN);
    logSuccess(`Found ${availableModels.models.length} available models for tenant`);
    results.push({ test: 'Get Available Models for Tenant', status: 'PASS', message: `Found ${availableModels.models.length} models`, data: availableModels.models });

    // 3.2: Create tenant-specific connection (BYOK)
    log('Creating tenant-specific GPT-4o connection (BYOK)...');
    const tenantConnection = await apiCall('POST', '/api/v1/tenant/ai/connections', {
      name: 'Tenant Custom GPT-4o',
      modelId: gpt4ModelId,
      endpoint: 'https://tenant-specific-openai.openai.azure.com/',
      version: '2024-10-01-preview',
      deploymentName: 'gpt-4o-tenant',
      contextWindow: 100000,
      isDefaultModel: true,
      apiKey: AZURE_OPENAI_KEY, // Tenant's own API key
    }, ADMIN_TOKEN);
    
    logSuccess(`Created tenant connection: ${tenantConnection.connection.id}`);
    results.push({ test: 'Create Tenant BYOK Connection', status: 'PASS', message: 'Tenant connection created successfully', data: tenantConnection.connection });

    // 3.3: List tenant connections
    log('Listing tenant connections...');
    const tenantConnectionsList = await apiCall('GET', '/api/v1/tenant/ai/connections', null, ADMIN_TOKEN);
    logSuccess(`Found ${tenantConnectionsList.connections.length} tenant connections`);
    results.push({ test: 'List Tenant Connections', status: 'PASS', message: `Found ${tenantConnectionsList.connections.length} connections`, data: tenantConnectionsList.connections });

    // 3.4: Get default LLM connection
    log('Getting default LLM connection for tenant...');
    const defaultConnection = await apiCall('GET', '/api/v1/tenant/ai/connections/default/LLM', null, ADMIN_TOKEN);
    logSuccess(`Default LLM connection: ${defaultConnection.connection.name}`);
    results.push({ test: 'Get Default LLM Connection', status: 'PASS', message: 'Default connection retrieved', data: defaultConnection });

    // 3.5: Update tenant connection
    log('Updating tenant connection...');
    const updatedTenantConnection = await apiCall('PATCH', `/api/v1/tenant/ai/connections/${tenantConnection.connection.id}`, {
      name: 'Tenant Custom GPT-4o (Updated)',
      contextWindow: 120000,
    }, ADMIN_TOKEN);
    logSuccess(`Updated tenant connection: ${updatedTenantConnection.connection.name}`);
    results.push({ test: 'Update Tenant Connection', status: 'PASS', message: 'Tenant connection updated successfully', data: updatedTenantConnection.connection });

    return { tenantConnectionId: tenantConnection.connection.id };

  } catch (error: any) {
    logError('Tenant Connections test failed', error);
    results.push({ test: 'Tenant Connections', status: 'FAIL', message: error.message });
    throw error;
  }
}

// ============================================================================
// TEST 4: Azure Key Vault Integration
// ============================================================================

async function testKeyVaultIntegration() {
  log('🧪 TEST 4: Azure Key Vault Integration');

  try {
    log('Verifying Key Vault configuration...');
    console.log('Key Vault URL:', process.env.KEY_VAULT_URL);
    console.log('Azure Tenant ID:', process.env.AZURE_TENANT_ID);
    console.log('Azure Client ID:', process.env.AZURE_CLIENT_ID);
    console.log('Using Managed Identity:', process.env.USE_MANAGED_IDENTITY);

    if (!process.env.KEY_VAULT_URL) {
      logError('Key Vault URL not configured');
      results.push({ test: 'Key Vault Configuration', status: 'FAIL', message: 'KEY_VAULT_URL not set' });
      return;
    }

    if (process.env.USE_MANAGED_IDENTITY === 'false' && !process.env.AZURE_CLIENT_SECRET) {
      logError('Service principal credentials not configured');
      results.push({ test: 'Key Vault Configuration', status: 'FAIL', message: 'Service principal credentials missing' });
      return;
    }

    logSuccess('Key Vault configuration looks good');
    results.push({ test: 'Key Vault Configuration', status: 'PASS', message: 'Key Vault properly configured' });

  } catch (error: any) {
    logError('Key Vault test failed', error);
    results.push({ test: 'Key Vault Integration', status: 'FAIL', message: error.message });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 COMPREHENSIVE AI FEATURES TEST SUITE');
  console.log('='.repeat(80));

  // Check prerequisites
  if (ADMIN_TOKEN === 'YOUR_ADMIN_JWT_TOKEN_HERE') {
    logError('❌ ADMIN_JWT_TOKEN not set. Please set it in .env or pass as environment variable');
    console.log('\nTo get an admin token:');
    console.log('1. Start the API: pnpm --filter @castiel/api dev');
    console.log('2. Login as super admin via frontend or use auth endpoint');
    console.log('3. Copy the JWT token and set ADMIN_JWT_TOKEN environment variable');
    console.log('\nExample:');
    console.log('export ADMIN_JWT_TOKEN="your-jwt-token-here"');
    console.log('pnpm tsx scripts/test-ai-features.ts');
    process.exit(1);
  }

  if (!AZURE_OPENAI_KEY) {
    logError('❌ AZURE_OPENAI_GPT_51_CHAT not set in .env');
    process.exit(1);
  }

  try {
    // Test Key Vault first
    await testKeyVaultIntegration();

    // Test 1: AI Model Catalog
    const { gpt4ModelId, embeddingModelId } = await testAIModelCatalog();

    // Test 2: System Connections
    await testSystemConnections(gpt4ModelId, embeddingModelId);

    // Test 3: Tenant BYOK Connections
    await testTenantConnections(gpt4ModelId);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
    console.log('='.repeat(80) + '\n');

    if (failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
