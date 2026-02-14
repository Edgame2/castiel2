#!/usr/bin/env node
/**
 * Check that Cosmos/DB queries in critical containers include tenant context.
 * Scans containers/auth, containers/user-management, containers/logging src for
 * query/read/findMany/findFirst patterns and heuristically flags missing tenantId.
 * Exit code 1 if any violation. Allowlist via // tenant-in-query: allow <reason>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const CONTAINERS = ['auth', 'user-management', 'logging'];
const SRC = 'src';

const ALLOW_COMMENT = 'tenant-in-query: allow';

function* walkDir(dir, ext = '.ts') {
  if (!dir || !fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileNames: true });
  for (const e of entries) {
    if (!e.name) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      yield* walkDir(full, ext);
    } else if (e.name.endsWith(ext)) {
      yield full;
    }
  }
}

function hasAllowComment(content, lineIndex) {
  const lines = content.split('\n');
  for (let i = lineIndex; i >= Math.max(0, lineIndex - 3); i--) {
    if (lines[i]?.includes(ALLOW_COMMENT)) return true;
  }
  return false;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];
  const rel = path.relative(root, filePath);

  // Patterns that suggest a query/read - we want to see tenantId/partitionKey in scope
  const queryPatterns = [
    /\.query\s*\(\s*\{/,
    /\.items\.query\s*\(/,
    /\.fetchAll\s*\(|\.fetchNext\s*\(/,
    /\.findMany\s*\(/,
    /\.findFirst\s*\(/,
    /partitionKey\s*:/,
  ];

  // Patterns that indicate tenant is present (same block)
  const tenantOkPatterns = [
    /tenantId/,
    /partitionKey/,
    /@tenantId|@tid/,
    /where:.*tenantId/,
    /c\.tenantId\s*=/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasQuery = queryPatterns.some((r) => r.test(line));
    if (!hasQuery) continue;
    if (hasAllowComment(content, i)) continue;

    // Look at a window of lines (this line and next ~15 for the query block)
    const window = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
    const hasTenantInWindow = tenantOkPatterns.some((r) => r.test(window));
    if (hasTenantInWindow) continue;

    // Cross-partition or non-tenant query patterns that are often intentional (e.g. by email)
    if (/WHERE\s+c\.email\s*=|where:.*email\s*:/.test(window) && rel.includes('user-management')) continue;
    if (/SELECT\s+\*\s+FROM\s+c\s+WHERE\s+c\.id\s*=/.test(window)) continue;

    violations.push({ file: rel, line: i + 1, content: line.trim().slice(0, 80) });
  }

  return violations;
}

let hasError = false;
console.log('Checking tenant-in-query (auth, user-management, logging)...\n');

for (const container of CONTAINERS) {
  const srcDir = path.join(root, 'containers', container, SRC);
  if (!fs.existsSync(srcDir)) continue;
  for (const file of walkDir(srcDir)) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      hasError = true;
      for (const v of violations) {
        console.error(`${v.file}:${v.line}  ${v.content}`);
      }
    }
  }
}

if (hasError) {
  console.error('\nViolation: query/read/findMany/findFirst should include tenantId or partitionKey. Add comment: // tenant-in-query: allow <reason> if intentional.');
  process.exit(1);
}

console.log('Tenant-in-query check passed.');
process.exit(0);
