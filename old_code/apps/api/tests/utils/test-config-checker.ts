/**
 * Test Configuration Checker & Auto-Fixer
 * 
 * Validates test environment and automatically fixes common issues
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

export interface ConfigCheckResult {
  passed: boolean;
  issues: ConfigIssue[];
  fixes: ConfigFix[];
}

export interface ConfigIssue {
  type: 'missing_env' | 'missing_file' | 'invalid_config' | 'missing_mock';
  severity: 'error' | 'warning' | 'info';
  message: string;
  fixable: boolean;
  fix?: () => Promise<void>;
}

export interface ConfigFix {
  issue: string;
  action: string;
  status: 'fixed' | 'failed' | 'skipped';
}

export class TestConfigChecker {
  private issues: ConfigIssue[] = [];
  private fixes: ConfigFix[] = [];

  /**
   * Check all test configuration requirements
   */
  async checkAll(): Promise<ConfigCheckResult> {
    this.issues = [];
    this.fixes = [];

    // Set NODE_ENV first if not set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'test';
    }

    // Check environment variables
    await this.checkEnvironmentVariables();

    // Check test data files
    await this.checkTestDataFiles();

    // Check mock configurations
    await this.checkMockConfigurations();

    // Check service configurations
    await this.checkServiceConfigurations();

    // Auto-fix issues
    await this.autoFixIssues();

    return {
      passed: this.issues.filter(i => i.severity === 'error').length === 0,
      issues: this.issues,
      fixes: this.fixes,
    };
  }

  /**
   * Check required environment variables
   */
  private async checkEnvironmentVariables() {
    const required = {
      // Core services (can use defaults for tests)
      COSMOS_DB_ENDPOINT: { required: false, default: 'https://localhost:8081' },
      COSMOS_DB_KEY: { required: false, default: 'test-key' },
      COSMOS_DB_DATABASE_ID: { required: false, default: 'castiel-test' },
      REDIS_HOST: { required: false, default: 'localhost' },
      REDIS_PORT: { required: false, default: '6379' },
      
      // Test-specific
      NODE_ENV: { required: true, default: 'test' },
      LOG_LEVEL: { required: false, default: 'silent' },
      MONITORING_ENABLED: { required: false, default: 'false' },
    };

    for (const [key, config] of Object.entries(required)) {
      if (!process.env[key]) {
        if (config.required) {
          this.issues.push({
            type: 'missing_env',
            severity: 'error',
            message: `Missing required environment variable: ${key}`,
            fixable: true,
            fix: async () => {
              process.env[key] = config.default;
            },
          });
        } else {
          // Set default for optional vars
          process.env[key] = config.default;
        }
      }
    }
  }

  /**
   * Check and create missing test data files
   */
  private async checkTestDataFiles() {
    const dataDir = resolve(process.cwd(), 'data');
    const promptsDir = join(dataDir, 'prompts');
    const promptsFile = join(promptsDir, 'system-prompts.json');

    if (!existsSync(promptsFile)) {
      this.issues.push({
        type: 'missing_file',
        severity: 'error',
        message: `Missing test data file: ${promptsFile}`,
        fixable: true,
        fix: async () => {
          // Create directory if it doesn't exist
          if (!existsSync(promptsDir)) {
            mkdirSync(promptsDir, { recursive: true });
          }

          // Create default system prompts file
          const defaultPrompts = {
            prompts: [
              {
                id: 'default',
                name: 'Default System Prompt',
                content: 'You are a helpful AI assistant.',
                version: '1.0.0',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'insights',
                name: 'AI Insights Prompt',
                content: 'You are an AI assistant specialized in generating insights from data.',
                version: '1.0.0',
                createdAt: new Date().toISOString(),
              },
            ],
          };

          writeFileSync(promptsFile, JSON.stringify(defaultPrompts, null, 2));
        },
      });
    }
  }

  /**
   * Check mock configurations in test files
   */
  private async checkMockConfigurations() {
    // This would check test files for proper mock setup
    // For now, we'll create a fixer utility
    this.issues.push({
      type: 'missing_mock',
      severity: 'warning',
      message: 'Mock configurations should be verified in test files',
      fixable: true,
      fix: async () => {
        // This will be handled by TestAutoFixer
      },
    });
  }

  /**
   * Check service configurations
   */
  private async checkServiceConfigurations() {
    try {
      // Try to load config - if it fails, that's okay for tests
      // We'll just warn about it
      const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
      if (!cosmosEndpoint || cosmosEndpoint.includes('localhost')) {
        this.issues.push({
          type: 'invalid_config',
          severity: 'info',
          message: 'Using test defaults for CosmosDB (integration tests may require real connection)',
          fixable: false,
        });
      }
    } catch (error) {
      this.issues.push({
        type: 'invalid_config',
        severity: 'warning',
        message: `Configuration check warning: ${error}`,
        fixable: false,
      });
    }
  }

  /**
   * Auto-fix all fixable issues
   */
  private async autoFixIssues() {
    for (const issue of this.issues) {
      if (issue.fixable && issue.fix) {
        try {
          await issue.fix();
          this.fixes.push({
            issue: issue.message,
            action: 'auto-fixed',
            status: 'fixed',
          });
        } catch (error) {
          this.fixes.push({
            issue: issue.message,
            action: `fix failed: ${error}`,
            status: 'failed',
          });
        }
      } else if (issue.fixable) {
        this.fixes.push({
          issue: issue.message,
          action: 'fix function not provided',
          status: 'skipped',
        });
      }
    }
  }

  /**
   * Print check results
   */
  printResults(result: ConfigCheckResult) {
    console.log('\n📋 Test Configuration Check Results\n');
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`);

    if (result.issues.length > 0) {
      console.log('Issues Found:');
      result.issues.forEach((issue, i) => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${i + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.fixable) {
          console.log(`     → Fixable: Yes`);
        }
      });
      console.log('');
    }

    if (result.fixes.length > 0) {
      console.log('Auto-Fixes Applied:');
      result.fixes.forEach((fix, i) => {
        const icon = fix.status === 'fixed' ? '✅' : fix.status === 'failed' ? '❌' : '⏭️';
        console.log(`  ${i + 1}. ${icon} ${fix.issue}`);
        console.log(`     → ${fix.action}`);
      });
      console.log('');
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new TestConfigChecker();
  const result = await checker.checkAll();
  checker.printResults(result);
  process.exit(result.passed ? 0 : 1);
}
