#!/usr/bin/env node
/**
 * Phase 1 audit: list containers with test script, collect testable modules
 * and existing unit tests, output gap report as Markdown.
 * Run from repo root: node scripts/unit-test-gap-audit.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTAINERS_DIR = path.join(ROOT, 'containers');

const EXCLUDE_CONTAINERS = new Set(['shared', 'code-generation']); // shared = library; code-generation = removed/deprecated

function hasTestScript(pkg) {
  const scripts = pkg?.scripts || {};
  return 'test' in scripts || 'test:unit' in scripts;
}

function getTestableFiles(containerPath, name) {
  const src = path.join(containerPath, 'src');
  const result = [];
  if (!fs.existsSync(src)) return result;

  const add = (dir, subdir, excludeIndex = true) => {
    const full = path.join(src, dir);
    if (!fs.existsSync(full)) return;
    for (const f of fs.readdirSync(full)) {
      if (!f.endsWith('.ts') && !f.endsWith('.tsx')) continue;
      if (excludeIndex && f === 'index.ts') continue;
      result.push({ rel: path.join(dir, f), subdir, base: path.basename(f, path.extname(f)) });
    }
  };

  add('services', 'services');
  add('utils', 'utils');
  const events = path.join(src, 'events');
  if (fs.existsSync(events)) {
    const consumers = path.join(events, 'consumers');
    if (fs.existsSync(consumers)) {
      for (const f of fs.readdirSync(consumers)) {
        if ((f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'index.ts')
          result.push({ rel: path.join('events', 'consumers', f), subdir: 'consumers', base: path.basename(f, path.extname(f)) });
      }
    }
    const publishers = path.join(events, 'publishers');
    if (fs.existsSync(publishers)) {
      for (const f of fs.readdirSync(publishers)) {
        if ((f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'index.ts')
          result.push({ rel: path.join('events', 'publishers', f), subdir: 'publishers', base: path.basename(f, path.extname(f)) });
      }
    }
  }

  if (name === 'ui') {
    const app = path.join(src, 'app');
    const components = path.join(src, 'components');
    const walk = (dir, prefix = '') => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir)) {
        const full = path.join(dir, e);
        const rel = path.join(prefix, e);
        if (fs.statSync(full).isDirectory()) walk(full, rel);
        else if (e.endsWith('.tsx') && e !== 'layout.tsx' && !e.startsWith('layout.')) {
          result.push({ rel, subdir: 'ui', base: path.basename(e, '.tsx') });
        }
      }
    };
    walk(app, 'app');
    walk(components, 'components');
  }

  return result;
}

function getExistingUnitTests(containerPath, name) {
  const unitDir = path.join(containerPath, 'tests', 'unit');
  const existing = new Map();
  if (!fs.existsSync(unitDir)) return existing;

  const walk = (dir, prefix = '') => {
    for (const e of fs.readdirSync(dir)) {
      const full = path.join(dir, e);
      const rel = path.join(prefix, e);
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else if (e.endsWith('.test.ts') || e.endsWith('.test.tsx')) {
        const base = e.replace(/\.test\.(ts|tsx)$/, '');
        existing.set(path.join(prefix, base), full);
      }
    }
  };
  walk(unitDir);
  return existing;
}

function expectedTestPath(subdir, base) {
  if (subdir === 'ui') return path.join('ui', `${base}.test.tsx`);
  return path.join(subdir, `${base}.test.ts`);
}

function audit() {
  const containers = fs.readdirSync(CONTAINERS_DIR).filter((c) => {
    const pkgPath = path.join(CONTAINERS_DIR, c, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    if (EXCLUDE_CONTAINERS.has(c)) return false;
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
      return false;
    }
    return hasTestScript(pkg);
  });

  const rows = [];
  const perContainerMissing = {};

  for (const name of containers.sort()) {
    const containerPath = path.join(CONTAINERS_DIR, name);
    const hasVitestConfig =
      fs.existsSync(path.join(containerPath, 'vitest.config.mjs')) ||
      fs.existsSync(path.join(containerPath, 'vitest.config.ts'));
    const hasSetup = fs.existsSync(path.join(containerPath, 'tests', 'setup.ts'));
    const testable = getTestableFiles(containerPath, name);
    const existing = getExistingUnitTests(containerPath, name);
    const existingCount = existing.size;

    const missing = [];
    for (const t of testable) {
      const expected = expectedTestPath(t.subdir, t.base);
      const hasIt = existing.has(expected) || Array.from(existing.keys()).some((k) => k.endsWith(path.sep + t.base));
      if (!hasIt) missing.push({ subdir: t.subdir, base: t.base, expected: path.join('tests', 'unit', expected) });
    }
    perContainerMissing[name] = missing;
    rows.push({
      name,
      hasVitestConfig,
      hasSetup,
      testableCount: testable.length,
      unitTestCount: existingCount,
      missingCount: missing.length,
    });
  }

  const md = [
    '# Unit test gap report',
    '',
    'Generated by `node scripts/unit-test-gap-audit.mjs`',
    '',
    '',
    '## Summary table',
    '',
    '| Container | Vitest config | tests/setup | Testable modules | Unit test files | Missing |',
    '|-----------|----------------|-------------|------------------|-----------------|---------|',
    ...rows.map(
      (r) =>
        `| ${r.name} | ${r.hasVitestConfig ? 'yes' : 'no'} | ${r.hasSetup ? 'yes' : 'no'} | ${r.testableCount} | ${r.unitTestCount} | ${r.missingCount} |`
    ),
    '',
    '## Per-container missing tests',
    '',
  ];

  for (const name of rows.map((r) => r.name)) {
    const missing = perContainerMissing[name];
    if (missing.length === 0) {
      md.push(`### ${name}\n\nNo missing unit tests.\n\n`);
      continue;
    }
    md.push(`### ${name}\n\n`);
    md.push('Missing test files:\n\n');
    for (const m of missing) {
      const srcDir = { services: 'services', utils: 'utils', consumers: 'events/consumers', publishers: 'events/publishers', ui: 'app|components' }[m.subdir] || m.subdir;
      const ext = m.subdir === 'ui' ? 'tsx' : 'ts';
      md.push(`- \`${m.expected}\` (for \`src/${srcDir}/${m.base}.${ext}\`)\n`);
    }
    md.push('\n');
  }

  return md.join('\n');
}

const report = audit();
const outPath = path.join(ROOT, 'documentation', 'notes', 'unit-test-gap-report.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report, 'utf8');
console.log('Wrote', outPath);
