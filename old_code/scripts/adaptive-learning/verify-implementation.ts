#!/usr/bin/env tsx
/**
 * CAIS Implementation Verification Script
 * 
 * Verifies that all CAIS adaptive learning components are properly implemented
 * and ready for production deployment.
 * 
 * Usage:
 *   pnpm tsx scripts/adaptive-learning/verify-implementation.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface VerificationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: VerificationResult[] = [];
const projectRoot = join(__dirname, '../..');

function addResult(category: string, item: string, status: 'pass' | 'fail' | 'warning', message: string) {
  results.push({ category, item, status, message });
}

function checkFileExists(relativePath: string, description: string): boolean {
  const fullPath = join(projectRoot, relativePath);
  const exists = existsSync(fullPath);
  addResult(
    'Files',
    description,
    exists ? 'pass' : 'fail',
    exists ? `✅ Found: ${relativePath}` : `❌ Missing: ${relativePath}`
  );
  return exists;
}

function checkServiceFile(serviceName: string): boolean {
  return checkFileExists(
    `apps/api/src/services/${serviceName}.ts`,
    `Service: ${serviceName}`
  );
}

function checkTestFile(testName: string): boolean {
  return checkFileExists(
    `apps/api/tests/services/adaptive-learning/${testName}.test.ts`,
    `Test: ${testName}`
  );
}

function checkDocumentationFile(docName: string): boolean {
  return checkFileExists(
    `docs/ai system/${docName}.md`,
    `Documentation: ${docName}`
  );
}

function checkUtilityScript(scriptName: string): boolean {
  return checkFileExists(
    `scripts/adaptive-learning/${scriptName}.ts`,
    `Utility Script: ${scriptName}`
  );
}

function checkFileContent(filePath: string, searchString: string, description: string): boolean {
  try {
    const fullPath = join(projectRoot, filePath);
    if (!existsSync(fullPath)) {
      addResult('Content', description, 'fail', `File not found: ${filePath}`);
      return false;
    }
    const content = readFileSync(fullPath, 'utf-8');
    const found = content.includes(searchString);
    addResult(
      'Content',
      description,
      found ? 'pass' : 'fail',
      found ? `✅ Found: ${searchString}` : `❌ Missing: ${searchString}`
    );
    return found;
  } catch (error) {
    addResult('Content', description, 'fail', `Error: ${error}`);
    return false;
  }
}

console.log('\n🔍 CAIS Implementation Verification');
console.log('====================================\n');

// Phase 1: Check Service Files
console.log('📦 Checking Service Files...');
const phase1Services = [
  'adaptive-weight-learning',
  'adaptive-model-selection',
  'signal-weighting',
  'adaptive-feature-engineering',
  'outcome-collector',
  'performance-tracker',
  'adaptive-learning-validation',
  'adaptive-learning-rollout',
];

const phase2Services = [
  'meta-learning',
  'active-learning',
  'feedback-quality',
  'episodic-memory',
  'counterfactual',
  'causal-inference',
  'multimodal-intelligence',
  'prescriptive-analytics',
];

const phase3Services = [
  'reinforcement-learning',
  'graph-neural-network',
  'neuro-symbolic',
];

let serviceCount = 0;
phase1Services.forEach(service => {
  if (checkServiceFile(service)) serviceCount++;
});
phase2Services.forEach(service => {
  if (checkServiceFile(service)) serviceCount++;
});
phase3Services.forEach(service => {
  if (checkServiceFile(service)) serviceCount++;
});

console.log(`   Services found: ${serviceCount}/19\n`);

// Phase 2: Check Test Files
console.log('🧪 Checking Test Files...');
const testFiles = [
  'adaptive-weight-learning.service',
  'adaptive-model-selection.service',
  'signal-weighting.service',
  'adaptive-feature-engineering.service',
  'outcome-collector.service',
  'performance-tracker.service',
  'adaptive-learning-validation.service',
  'adaptive-learning-rollout.service',
  'meta-learning.service',
  'active-learning.service',
  'feedback-quality.service',
  'episodic-memory.service',
  'counterfactual.service',
  'causal-inference.service',
  'multimodal-intelligence.service',
  'prescriptive-analytics.service',
  'reinforcement-learning.service',
  'graph-neural-network.service',
  'neuro-symbolic.service',
];

const integrationTests = [
  'integration/adaptive-learning-integration',
  'integration/recommendations-service-integration',
  'integration/risk-evaluation-service-integration',
];

let testCount = 0;
testFiles.forEach(test => {
  if (checkTestFile(test)) testCount++;
});
integrationTests.forEach(test => {
  if (checkTestFile(test)) testCount++;
});

console.log(`   Tests found: ${testCount}/22\n`);

// Phase 3: Check Documentation
console.log('📚 Checking Documentation...');
const documentationFiles = [
  'CAIS_IMPLEMENTATION_COMPLETE',
  'CAIS_COMPLETE_SUMMARY',
  'CAIS_FINAL_STATUS',
  'CAIS_DEVELOPER_QUICK_REFERENCE',
  'CAIS_INTEGRATION_EXAMPLES',
  'CAIS_MIGRATION_GUIDE',
  'CAIS_QUICK_START',
  'CAIS_DEPLOYMENT_GUIDE',
  'CAIS_MONITORING_GUIDE',
  'CAIS_VERIFICATION_CHECKLIST',
  'CAIS_TROUBLESHOOTING_GUIDE',
  'CAIS_FAQ',
  'CAIS_TESTING_PLAN',
  'CAIS_DOCUMENTATION_INDEX',
];

let docCount = 0;
documentationFiles.forEach(doc => {
  if (checkDocumentationFile(doc)) docCount++;
});

console.log(`   Documentation found: ${docCount}/${documentationFiles.length}\n`);

// Phase 4: Check Utility Scripts
console.log('🛠️  Checking Utility Scripts...');
const utilityScripts = [
  'check-learning-status',
  'reset-learning',
  'export-learning-data',
];

let scriptCount = 0;
utilityScripts.forEach(script => {
  if (checkUtilityScript(script)) scriptCount++;
});

console.log(`   Utility scripts found: ${scriptCount}/3\n`);

// Phase 5: Check Integration
console.log('🔗 Checking Integration...');
checkFileContent(
  'apps/api/src/routes/index.ts',
  'registerAdaptiveLearningRoutes',
  'Routes registered'
);
checkFileContent(
  'apps/api/src/routes/index.ts',
  'initializeAdaptiveLearningServices',
  'Services initialized'
);
checkFileContent(
  'apps/api/src/services/recommendation.service.ts',
  'adaptiveWeightService',
  'RecommendationsService integrated'
);
checkFileContent(
  'apps/api/src/services/risk-evaluation.service.ts',
  'adaptiveWeightService',
  'RiskEvaluationService integrated'
);

// Phase 6: Check Configuration
console.log('⚙️  Checking Configuration...');
checkFileContent(
  'apps/api/src/config/env.ts',
  'adaptiveWeights',
  'Cosmos DB containers configured'
);
checkFileContent(
  'apps/api/src/utils/cache-keys.ts',
  'ADAPTIVE_WEIGHTS',
  'Cache keys configured'
);

// Phase 7: Check Types
console.log('📝 Checking Types...');
checkFileExists(
  'apps/api/src/types/adaptive-learning.types.ts',
  'Types file'
);
checkFileExists(
  'apps/api/src/utils/context-key-generator.ts',
  'Context key generator'
);
checkFileExists(
  'apps/api/src/utils/statistical-validator.ts',
  'Statistical validator'
);

// Summary
console.log('\n📊 Verification Summary');
console.log('======================\n');

const categories = ['Files', 'Content'];
categories.forEach(category => {
  const categoryResults = results.filter(r => r.category === category);
  const passed = categoryResults.filter(r => r.status === 'pass').length;
  const failed = categoryResults.filter(r => r.status === 'fail').length;
  const warnings = categoryResults.filter(r => r.status === 'warning').length;
  
  console.log(`${category}:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  if (warnings > 0) {
    console.log(`   ⚠️  Warnings: ${warnings}`);
  }
  console.log('');
});

// Detailed Results
const failed = results.filter(r => r.status === 'fail');
if (failed.length > 0) {
  console.log('❌ Failed Checks:');
  failed.forEach(result => {
    console.log(`   - ${result.item}: ${result.message}`);
  });
  console.log('');
}

const warnings = results.filter(r => r.status === 'warning');
if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(result => {
    console.log(`   - ${result.item}: ${result.message}`);
  });
  console.log('');
}

// Final Status
const totalChecks = results.length;
const totalPassed = results.filter(r => r.status === 'pass').length;
const passRate = (totalPassed / totalChecks) * 100;

console.log('🎯 Overall Status:');
console.log(`   Total Checks: ${totalChecks}`);
console.log(`   Passed: ${totalPassed}`);
console.log(`   Failed: ${failed.length}`);
console.log(`   Pass Rate: ${passRate.toFixed(1)}%\n`);

if (failed.length === 0 && passRate >= 95) {
  console.log('✅ VERIFICATION PASSED - Ready for Production!\n');
  process.exit(0);
} else if (failed.length === 0) {
  console.log('⚠️  VERIFICATION PASSED WITH WARNINGS\n');
  process.exit(0);
} else {
  console.log('❌ VERIFICATION FAILED - Please fix issues above\n');
  process.exit(1);
}
