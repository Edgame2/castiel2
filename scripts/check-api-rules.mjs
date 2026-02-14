#!/usr/bin/env node
/**
 * Check API rules: client path = /api/v1/... (documentation/endpoints/API_RULES.md).
 * - ENDPOINTS.md: Path column should be /api/v1/... (or service-relative /health, /ready, /metrics).
 * - Gateway: Every /api/v1/... prefix used in ENDPOINTS must be covered by a gateway route.
 * - UI: No apiFetch or fetch path starting with /api/ that is not /api/v1/.
 * Exit code 1 if any violation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const endpointsPath = path.join(root, 'documentation/endpoints/ENDPOINTS.md');
const gatewayRoutesPath = path.join(root, 'containers/api-gateway/src/routes/index.ts');
const uiSrcPath = path.join(root, 'ui/src');

let hasError = false;

// --- Extract path prefixes from ENDPOINTS.md (client paths = /api/v1/...) ---
function extractEndpointsPaths(content) {
  const paths = new Set();
  // Table rows: | METHOD | /path | Status | Notes |
  const rowRe = /^\|\s*(?:GET|POST|PUT|DELETE|PATCH|\*)\s+\|\s+(\/[^\s|]+)\s*\|/gm;
  let m;
  while ((m = rowRe.exec(content)) !== null) {
    const p = m[1].trim();
    if (p.startsWith('/api/v1/')) paths.add(p);
  }
  return paths;
}

// Reduce paths to prefixes: /api/v1/auth/login -> /api/v1/auth; /api/v1/logs -> /api/v1/logs
function toPrefixes(paths) {
  const prefixes = new Set();
  for (const p of paths) {
    const parts = p.slice('/api/v1/'.length).split('/');
    let acc = '/api/v1';
    prefixes.add(acc);
    for (const segment of parts) {
      if (segment && !segment.startsWith(':')) {
        acc += '/' + segment;
        prefixes.add(acc);
      }
    }
  }
  return prefixes;
}

// --- Extract gateway route paths from routes/index.ts ---
function extractGatewayRoutes(content) {
  const routes = [];
  const re = /path:\s*['"`](\/[^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(content)) !== null) routes.push(m[1]);
  return routes;
}

// Check: for each required prefix, some gateway route must be a prefix of it
function checkGatewayCoverage(requiredPrefixes, gatewayRoutes) {
  const missing = [];
  for (const prefix of requiredPrefixes) {
    const covered = gatewayRoutes.some((r) => prefix === r || prefix.startsWith(r + '/'));
    if (!covered) missing.push(prefix);
  }
  return missing;
}

// --- UI: find any /api/ path that is not /api/v1/ ---
function checkUIPaths(dir, violations = []) {
  if (!fs.existsSync(dir)) return violations;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') checkUIPaths(full, violations);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // apiFetch('/api/... or apiFetch("/api/... or `${base}/api/... or '${base}/api/...
      if (/apiFetch\s*\(\s*['"`]\/api\//.test(line) && !/apiFetch\s*\(\s*['"`]\/api\/v1\//.test(line))
        violations.push({ file: path.relative(root, full), line: i + 1, content: line.trim() });
      if (/\$\{.*\}\s*\/api\/(?!v1\/)/.test(line)) violations.push({ file: path.relative(root, full), line: i + 1, content: line.trim() });
    }
  }
  return violations;
}

// --- ENDPOINTS: flag paths that start with /api/ but are not /api/v1/ (client path rule) ---
function checkEndpointsPaths(content) {
  const violations = [];
  const rowRe = /^\|\s*(?:GET|POST|PUT|DELETE|PATCH|\*)\s+\|\s+(\/[^\s|]+)\s*\|/gm;
  let m;
  while ((m = rowRe.exec(content)) !== null) {
    const p = m[1].trim();
    if (p.startsWith('/api/v1/')) continue;
    if (p.startsWith('/api/') && !p.startsWith('/api/v1')) violations.push(p);
  }
  return violations;
}

// --- Main ---
console.log('Checking API rules (client path = /api/v1/...)...\n');

const endpointsContent = fs.readFileSync(endpointsPath, 'utf8');

// 1) ENDPOINTS path column
const endpointsPathViolations = checkEndpointsPaths(endpointsContent);
if (endpointsPathViolations.length > 0) {
  console.error('ENDPOINTS.md: Path column should be /api/v1/... or service-relative (/health, /ready, /metrics). Found:');
  endpointsPathViolations.forEach((p) => console.error('  -', p));
  hasError = true;
} else {
  console.log('ENDPOINTS.md: Path column OK.');
}

const requiredPrefixes = toPrefixes(extractEndpointsPaths(endpointsContent));

// 2) Gateway coverage
const gatewayContent = fs.readFileSync(gatewayRoutesPath, 'utf8');
const gatewayRoutes = extractGatewayRoutes(gatewayContent);
const missingRoutes = checkGatewayCoverage([...requiredPrefixes], gatewayRoutes);
if (missingRoutes.length > 0) {
  console.error('\nGateway: Missing route coverage for client path prefixes:');
  [...missingRoutes].sort().forEach((p) => console.error('  -', p));
  hasError = true;
} else {
  console.log('Gateway: Required path prefixes covered.');
}

// 3) UI
const uiViolations = checkUIPaths(uiSrcPath);
if (uiViolations.length > 0) {
  console.error('\nUI: Use only /api/v1/... paths (no /api/auth, /api/users, etc.):');
  uiViolations.forEach(({ file, line, content }) => console.error(`  ${file}:${line}  ${content.slice(0, 80)}...`));
  hasError = true;
} else {
  console.log('UI: All API paths use /api/v1/...');
}

console.log('');
process.exit(hasError ? 1 : 0);
