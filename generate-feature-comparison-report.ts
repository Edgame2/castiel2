#!/usr/bin/env tsx
/**
 * Feature Comparison Report Generator
 * Compares features implemented in containers/ vs old_code/
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';

interface ServiceInfo {
  name: string;
  path: string;
  hasReadme: boolean;
  hasOpenApi: boolean;
  hasDockerfile: boolean;
  hasConfig: boolean;
  features: string[];
}

interface ComparisonResult {
  containers: ServiceInfo[];
  oldCode: ServiceInfo[];
  migrated: Array<{ container: string; oldCode: string; status: string }>;
  newInContainers: string[];
  missingFromContainers: string[];
}

async function getDirectories(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => !name.startsWith('.'));
  } catch {
    return [];
  }
}

async function readServiceInfo(basePath: string, serviceName: string): Promise<ServiceInfo> {
  const servicePath = join(basePath, serviceName);
  const readmePath = join(servicePath, 'README.md');
  const openApiPath = join(servicePath, 'openapi.yaml');
  const dockerfilePath = join(servicePath, 'Dockerfile');
  const configPath = join(servicePath, 'config', 'default.yaml');

  const [hasReadme, hasOpenApi, hasDockerfile, hasConfig] = await Promise.all([
    stat(readmePath).then(() => true).catch(() => false),
    stat(openApiPath).then(() => true).catch(() => false),
    stat(dockerfilePath).then(() => true).catch(() => false),
    stat(configPath).then(() => true).catch(() => false),
  ]);

  let features: string[] = [];
  if (hasReadme) {
    try {
      const readmeContent = await readFile(readmePath, 'utf-8');
      // Extract features section
      const featuresMatch = readmeContent.match(/## Features?\s*\n([\s\S]*?)(?=\n## |$)/i);
      if (featuresMatch) {
        features = featuresMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map(line => line.replace(/^[-*]\s*/, '').trim())
          .filter(f => f.length > 0);
      }
    } catch {
      // Ignore read errors
    }
  }

  return {
    name: serviceName,
    path: servicePath,
    hasReadme,
    hasOpenApi,
    hasDockerfile,
    hasConfig,
    features,
  };
}

function normalizeServiceName(name: string): string {
  // Normalize service names for comparison
  return name
    .toLowerCase()
    .replace(/-/g, '')
    .replace(/_/g, '')
    .replace(/service$/, '')
    .replace(/manager$/, '')
    .trim();
}

function findMatchingService(containerName: string, oldCodeServices: ServiceInfo[]): ServiceInfo | null {
  const normalized = normalizeServiceName(containerName);
  return oldCodeServices.find(old => normalizeServiceName(old.name) === normalized) || null;
}

async function analyzeOldCodeServices(): Promise<ServiceInfo[]> {
  const servicesPath = join(process.cwd(), 'old_code', 'apps', 'api', 'src', 'services');
  const services: ServiceInfo[] = [];

  // Get top-level service files
  try {
    const entries = await readdir(servicesPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.service.ts')) {
        const serviceName = entry.name.replace('.service.ts', '');
        services.push({
          name: serviceName,
          path: join(servicesPath, entry.name),
          hasReadme: false,
          hasOpenApi: false,
          hasDockerfile: false,
          hasConfig: false,
          features: [],
        });
      } else if (entry.isDirectory() && !entry.name.startsWith('_')) {
        // Directory-based services
        services.push({
          name: entry.name,
          path: join(servicesPath, entry.name),
          hasReadme: false,
          hasOpenApi: false,
          hasDockerfile: false,
          hasConfig: false,
          features: [],
        });
      }
    }
  } catch {
    // Ignore errors
  }

  return services;
}

async function generateReport(): Promise<void> {
  const containersPath = join(process.cwd(), 'containers');
  const oldCodePath = join(process.cwd(), 'old_code');

  console.log('🔍 Analyzing containers/ directory...');
  const containerDirs = await getDirectories(containersPath);
  const containerServices = await Promise.all(
    containerDirs.map(dir => readServiceInfo(containersPath, dir))
  );

  console.log('🔍 Analyzing old_code/ directory...');
  const oldCodeServices = await analyzeOldCodeServices();

  console.log('📊 Generating comparison...');

  const comparison: ComparisonResult = {
    containers: containerServices,
    oldCode: oldCodeServices,
    migrated: [],
    newInContainers: [],
    missingFromContainers: [],
  };

  // Find migrated services
  for (const container of containerServices) {
    const match = findMatchingService(container.name, oldCodeServices);
    if (match) {
      comparison.migrated.push({
        container: container.name,
        oldCode: match.name,
        status: 'migrated',
      });
    } else {
      comparison.newInContainers.push(container.name);
    }
  }

  // Find missing services
  for (const oldCode of oldCodeServices) {
    const match = findMatchingService(oldCode.name, containerServices);
    if (!match) {
      comparison.missingFromContainers.push(oldCode.name);
    }
  }

  // Generate markdown report
  const report = generateMarkdownReport(comparison);
  
  const reportPath = join(process.cwd(), 'FEATURE_COMPARISON_REPORT.md');
  await require('fs').promises.writeFile(reportPath, report, 'utf-8');
  
  console.log(`\n✅ Report generated: ${reportPath}`);
  console.log(`\n📈 Summary:`);
  console.log(`   - Containers services: ${containerServices.length}`);
  console.log(`   - Old code services: ${oldCodeServices.length}`);
  console.log(`   - Migrated: ${comparison.migrated.length}`);
  console.log(`   - New in containers: ${comparison.newInContainers.length}`);
  console.log(`   - Missing from containers: ${comparison.missingFromContainers.length}`);
}

function generateMarkdownReport(comparison: ComparisonResult): string {
  const now = new Date().toISOString().split('T')[0];
  
  return `# Feature Comparison Report: containers/ vs old_code/

**Generated:** ${now}

## Executive Summary

This report compares the features and services implemented in the new \`containers/\` directory structure versus the legacy \`old_code/\` implementation.

### Statistics

- **Total Services in containers/:** ${comparison.containers.length}
- **Total Services in old_code/:** ${comparison.oldCode.length}
- **Migrated Services:** ${comparison.migrated.length}
- **New Services in containers/:** ${comparison.newInContainers.length}
- **Services Missing from containers/:** ${comparison.missingFromContainers.length}

---

## 1. Services in containers/ (New Architecture)

${comparison.containers.map(service => {
  const badges = [];
  if (service.hasReadme) badges.push('📄 README');
  if (service.hasOpenApi) badges.push('📋 OpenAPI');
  if (service.hasDockerfile) badges.push('🐳 Docker');
  if (service.hasConfig) badges.push('⚙️ Config');
  
  const badgeStr = badges.length > 0 ? ` ${badges.join(' ')}` : '';
  const featuresStr = service.features.length > 0 
    ? `\n   - Features: ${service.features.slice(0, 5).join(', ')}${service.features.length > 5 ? '...' : ''}`
    : '';
  
  return `### ${service.name}${badgeStr}${featuresStr}`;
}).join('\n\n')}

---

## 2. Services in old_code/ (Legacy Architecture)

${comparison.oldCode.slice(0, 50).map(service => {
  return `### ${service.name}`;
}).join('\n\n')}

${comparison.oldCode.length > 50 ? `\n_... and ${comparison.oldCode.length - 50} more services_\n` : ''}

---

## 3. Migration Status

### ✅ Migrated Services (${comparison.migrated.length})

These services have been migrated from old_code/ to containers/:

${comparison.migrated.map(m => `- **${m.container}** ← ${m.oldCode}`).join('\n')}

### 🆕 New Services in containers/ (${comparison.newInContainers.length})

These services are new in the containers/ architecture:

${comparison.newInContainers.map(name => `- **${name}**`).join('\n')}

### ⚠️ Services Missing from containers/ (${comparison.missingFromContainers.length})

These services exist in old_code/ but are not yet migrated to containers/:

${comparison.missingFromContainers.slice(0, 100).map(name => `- **${name}**`).join('\n')}

${comparison.missingFromContainers.length > 100 ? `\n_... and ${comparison.missingFromContainers.length - 100} more services_\n` : ''}

---

## 4. Feature Comparison by Category

### Authentication & Authorization
- **containers/:** ${comparison.containers.filter(s => s.name.includes('auth') || s.name.includes('user')).map(s => s.name).join(', ')}
- **old_code/:** ${comparison.oldCode.filter(s => s.name.includes('auth') || s.name.includes('user')).map(s => s.name).join(', ')}

### AI & Machine Learning
- **containers/:** ${comparison.containers.filter(s => s.name.includes('ai') || s.name.includes('ml') || s.name.includes('adaptive') || s.name.includes('insight')).map(s => s.name).join(', ')}
- **old_code/:** ${comparison.oldCode.filter(s => s.name.includes('ai') || s.name.includes('ml') || s.name.includes('adaptive') || s.name.includes('insight')).map(s => s.name).join(', ')}

### Data Management
- **containers/:** ${comparison.containers.filter(s => s.name.includes('shard') || s.name.includes('document') || s.name.includes('cache')).map(s => s.name).join(', ')}
- **old_code/:** ${comparison.oldCode.filter(s => s.name.includes('shard') || s.name.includes('document') || s.name.includes('cache')).map(s => s.name).join(', ')}

### Integration & Content
- **containers/:** ${comparison.containers.filter(s => s.name.includes('integration') || s.name.includes('content') || s.name.includes('template')).map(s => s.name).join(', ')}
- **old_code/:** ${comparison.oldCode.filter(s => s.name.includes('integration') || s.name.includes('content') || s.name.includes('template')).map(s => s.name).join(', ')}

### Security & Compliance
- **containers/:** ${comparison.containers.filter(s => s.name.includes('security') || s.name.includes('compliance') || s.name.includes('secret')).map(s => s.name).join(', ')}
- **old_code/:** ${comparison.oldCode.filter(s => s.name.includes('security') || s.name.includes('compliance') || s.name.includes('secret')).map(s => s.name).join(', ')}

---

## 5. Architecture Differences

### containers/ Architecture
- ✅ Microservices architecture with independent modules
- ✅ Each service has its own Dockerfile, config, and OpenAPI spec
- ✅ Standardized module structure (config/, src/, routes/, services/)
- ✅ Shared utilities in \`containers/shared/\`
- ✅ Configuration-driven service URLs (no hardcoded ports/URLs)
- ✅ Tenant isolation enforced at all layers

### old_code/ Architecture
- Monolithic API structure in \`apps/api/\`
- Services organized in \`src/services/\` directory
- Shared packages in \`packages/\`
- Mixed initialization patterns
- Some hardcoded service references

---

## 6. Recommendations

### High Priority Migrations
Based on the analysis, consider prioritizing migration of:

${comparison.missingFromContainers.slice(0, 20).map(name => `1. **${name}**`).join('\n')}

### New Features to Review
The following new services in containers/ should be reviewed for feature parity:

${comparison.newInContainers.map(name => `- **${name}**`).join('\n')}

---

## Notes

- This report is generated automatically and may not capture all nuances
- Service name matching uses fuzzy logic and may have false positives/negatives
- Feature extraction is based on README.md files and may be incomplete
- Some services in old_code/ may be deprecated or planned for removal

---

_Report generated by feature-comparison-report.ts_
`;
}

// Run the report generation
generateReport().catch(console.error);
