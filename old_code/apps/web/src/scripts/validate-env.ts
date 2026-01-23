#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 * 
 * Validates all required and optional environment variables for the Web service.
 * Can be run independently before starting the service to catch configuration errors early.
 * 
 * Usage:
 *   pnpm --filter @castiel/web run validate:env
 *   tsx src/scripts/validate-env.ts
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env or .env.local
dotenv.config();
dotenv.config({ path: '.env.local' });

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

/**
 * Validate environment variables
 */
function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production';
  const isProduction = nodeEnv === 'production';

  // Required environment variables
  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    if (isProduction) {
      errors.push('Missing required environment variable: NEXT_PUBLIC_API_BASE_URL (required in production)');
    } else {
      warnings.push('NEXT_PUBLIC_API_BASE_URL not set - using default http://localhost:3001');
    }
  } else {
    // Validate URL format
    try {
      const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`Invalid NEXT_PUBLIC_API_BASE_URL: "${process.env.NEXT_PUBLIC_API_BASE_URL}" - must use http:// or https://`);
      }
    } catch (e) {
      errors.push(`Invalid NEXT_PUBLIC_API_BASE_URL: "${process.env.NEXT_PUBLIC_API_BASE_URL}" - must be a valid URL`);
    }
  }

  // OAuth configuration (optional but recommended)
  const oauthClientId = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;
  const oauthRedirectUri = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI;
  const oauthScope = process.env.NEXT_PUBLIC_OAUTH_SCOPE;

  if (oauthClientId && !oauthRedirectUri) {
    warnings.push('NEXT_PUBLIC_OAUTH_CLIENT_ID set but NEXT_PUBLIC_OAUTH_REDIRECT_URI missing - OAuth login may not work');
  }
  if (oauthRedirectUri && !oauthClientId) {
    warnings.push('NEXT_PUBLIC_OAUTH_REDIRECT_URI set but NEXT_PUBLIC_OAUTH_CLIENT_ID missing - OAuth login may not work');
  }
  if (oauthClientId && oauthRedirectUri && !oauthScope) {
    warnings.push('OAuth client ID and redirect URI set but NEXT_PUBLIC_OAUTH_SCOPE missing - OAuth may not work correctly');
  }

  // Application Insights (optional)
  const appInsightsConnectionString = process.env.NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING;
  const appInsightsInstrumentationKey = process.env.NEXT_PUBLIC_APP_INSIGHTS_INSTRUMENTATION_KEY;
  const analyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

  if (analyticsEnabled) {
    if (!appInsightsConnectionString && !appInsightsInstrumentationKey) {
      warnings.push('Analytics enabled but Application Insights not configured - analytics will not work');
    }
  } else {
    info.push('Analytics is disabled (NEXT_PUBLIC_ENABLE_ANALYTICS not set to "true")');
  }

  // API Port (optional, used for Next.js rewrites)
  const apiPort = process.env.API_PORT;
  if (apiPort) {
    const portNum = parseInt(apiPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`Invalid API_PORT: "${apiPort}" - must be between 1 and 65535`);
    }
  } else if (!isProduction) {
    info.push('API_PORT not set - using default port 3001 for API rewrites');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/**
 * Main execution
 */
function main(): void {
  console.log('🔍 Validating environment variables for Web service...\n');

  const result = validateEnvironment();

  // Print info messages
  if (result.info.length > 0) {
    console.log('ℹ️  Information:');
    result.info.forEach(msg => console.log(`   ${msg}`));
    console.log();
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(msg => console.log(`   ${msg}`));
    console.log();
  }

  // Print errors
  if (result.errors.length > 0) {
    console.error('❌ Validation failed:');
    result.errors.forEach(msg => console.error(`   ${msg}`));
    console.error('\nPlease set the required environment variables and try again.');
    console.error('See apps/web/.env.example for a complete list of environment variables.\n');
    process.exit(1);
  }

  // Success
  if (result.warnings.length === 0 && result.info.length === 0) {
    console.log('✅ All environment variables are valid!\n');
  } else {
    console.log('✅ Required environment variables are valid.');
    console.log('   (Some optional variables are missing - see warnings above)\n');
  }

  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateEnvironment };


