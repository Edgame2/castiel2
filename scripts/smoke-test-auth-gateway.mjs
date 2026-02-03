#!/usr/bin/env node
/**
 * Smoke test: Authentication and User Management via API Gateway
 *
 * Requires: API Gateway running (e.g. docker-compose up api-gateway, or pnpm dev in containers/api-gateway).
 * Optional: Auth and user-management services for full flow (otherwise expect 502/503 for proxied auth).
 *
 * Usage: node scripts/smoke-test-auth-gateway.mjs [GATEWAY_URL]
 *        GATEWAY_URL=http://localhost:3001 node scripts/smoke-test-auth-gateway.mjs
 */

const GATEWAY_URL = process.env.GATEWAY_URL || process.argv[2] || 'http://localhost:3001';

async function request(method, path, body = null) {
  const url = `${GATEWAY_URL.replace(/\/$/, '')}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && (method === 'POST' || method === 'PUT')) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  const failures = [];
  console.log(`Smoke testing Auth + User Management via gateway: ${GATEWAY_URL}\n`);

  // 1. Public auth: health (no token)
  try {
    const { status } = await request('GET', '/api/auth/health');
    if (status !== 200 && status !== 502 && status !== 503) {
      failures.push({ check: 'GET /api/auth/health (public)', expected: '200 or 502/503 if backend down', got: status });
    } else {
      console.log('✓ GET /api/auth/health (no token):', status === 200 ? '200 OK' : `${status} (backend unreachable)`);
    }
  } catch (e) {
    failures.push({ check: 'GET /api/auth/health', error: e.message });
    console.log('✗ GET /api/auth/health:', e.message);
  }

  // 2. Public auth: login without token (must not be 401 from gateway)
  try {
    const { status } = await request('POST', '/api/auth/login', { email: 'smoke@test.com', password: 'x' });
    if (status === 401) {
      failures.push({ check: 'POST /api/auth/login (public)', expected: 'must not 401 (gateway must allow public auth)', got: 401 });
      console.log('✗ POST /api/auth/login: 401 (gateway is blocking public auth path)');
    } else {
      console.log('✓ POST /api/auth/login (no token):', status, status === 200 ? 'OK' : status === 400 ? 'Bad request' : status === 502 || status === 503 ? 'Backend down' : '');
    }
  } catch (e) {
    failures.push({ check: 'POST /api/auth/login', error: e.message });
    console.log('✗ POST /api/auth/login:', e.message);
  }

  // 3. Protected: /api/users/me without token must be 401
  try {
    const { status, data } = await request('GET', '/api/users/me');
    if (status !== 401) {
      failures.push({ check: 'GET /api/users/me (no token)', expected: '401', got: status });
      console.log('✗ GET /api/users/me (no token): expected 401, got', status);
    } else {
      console.log('✓ GET /api/users/me (no token): 401 Unauthorized');
    }
  } catch (e) {
    failures.push({ check: 'GET /api/users/me', error: e.message });
    console.log('✗ GET /api/users/me:', e.message);
  }

  // 4. Root gateway info
  try {
    const { status, data } = await request('GET', '/');
    if (status !== 200 || !data.service) {
      failures.push({ check: 'GET /', expected: '200 + service name', got: status });
    } else {
      console.log('✓ GET /:', status, data.service);
    }
  } catch (e) {
    failures.push({ check: 'GET /', error: e.message });
    console.log('✗ GET /:', e.message);
  }

  console.log('');
  if (failures.length) {
    console.log('Failures:', failures.length);
    failures.forEach((f) => console.log(' -', f.check, f.expected ? `(expected ${f.expected}, got ${f.got})` : f.error));
    process.exit(1);
  }
  console.log('All smoke checks passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
