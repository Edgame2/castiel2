/**
 * Test Environment Setup
 * 
 * This file runs before all tests to set up the test environment
 */

import { TestConfig } from './config/test-config';

// Configure test timeouts
if (typeof global !== 'undefined') {
  // Increase global timeout for slow connections
  (global as any).testTimeout = TestConfig.defaultTimeout;
}

// Log test configuration in verbose mode
if (TestConfig.verbose) {
  console.log('='.repeat(80));
  console.log('Test Configuration:');
  console.log('='.repeat(80));
  console.log('Main API URL:', TestConfig.mainApiUrl);
  console.log('Default Tenant:', TestConfig.defaultTenantId);
  console.log('Cleanup After Tests:', TestConfig.cleanupAfterTests);
  console.log('Email Verification Required:', TestConfig.features.emailVerificationRequired);
  console.log('MFA Enabled:', TestConfig.features.mfaEnabled);
  console.log('Rate Limiting Enabled:', TestConfig.features.rateLimitingEnabled);
  console.log('='.repeat(80));
  console.log();
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests, let the test framework handle it
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process in tests, let the test framework handle it
});

// Cleanup function for graceful shutdown
async function cleanup() {
  if (TestConfig.verbose) {
    console.log('Cleaning up test environment...');
  }

  // Add any global cleanup logic here
  // For example, closing database connections, Redis connections, etc.
}

// Register cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (TestConfig.verbose) {
      console.log('Test process exiting...');
    }
  });

  // Handle graceful shutdown signals
  const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];

  shutdownSignals.forEach((signal) => {
    process.on(signal, async () => {
      if (TestConfig.verbose) {
        console.log(`Received ${signal}, cleaning up...`);
      }

      await cleanup();
      process.exit(0);
    });
  });
}

// Export cleanup for use in tests
export { cleanup };
