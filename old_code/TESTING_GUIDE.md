# Testing Guide - Implementation Verification

**Date:** 2025-01-XX  
**Status:** ✅ Ready for Testing

## Overview

This guide provides step-by-step instructions for verifying that all implementation fixes are working correctly.

---

## Prerequisites

Before starting verification, ensure:

1. **Node.js and pnpm installed**
   ```bash
   node --version  # Should be v18+
   pnpm --version  # Should be v8+
   ```

2. **Dependencies installed**
   ```bash
   pnpm install
   ```

3. **Environment variables configured**
   - Copy `.env.example` to `.env` in `apps/api/`
   - Configure Cosmos DB connection string
   - Configure Redis connection (if using)

---

## Quick Verification

Run the automated verification script:

```bash
./scripts/verify-implementation.sh
```

This will check:
- ✅ Container configuration alignment
- ✅ Route registration
- ✅ Frontend API integration (hardcoded URLs replaced)
- ✅ API endpoint availability (if API is running)
- ✅ TypeScript compilation status

---

## Step-by-Step Verification

### Step 1: Verify Container Configuration

```bash
cd apps/api
pnpm run verify:containers
```

**Expected Output:**
```
✅ All containers are properly aligned!
```

**If errors occur:**
- Check that all containers in `config/env.ts` have entries in `init-cosmos-db.ts`
- Review the error messages for missing containers

---

### Step 2: Initialize CosmosDB Containers

```bash
cd apps/api
pnpm run init-db
```

**Expected Output:**
- All containers created successfully
- No errors in container creation

**Verify in Azure Portal:**
- Navigate to Cosmos DB account
- Check that all containers exist:
  - `bulk-jobs`
  - `tenant-integrations`
  - `notifications`
  - `notification-preferences`
  - `notification-digests`
  - `collaborative-insights`

---

### Step 3: Verify TypeScript Compilation

```bash
cd apps/api
pnpm run typecheck
```

**Expected Output:**
- No TypeScript errors
- All files compile successfully

**If errors occur:**
- Review `TYPESCRIPT_ERRORS_FIXED.md` for fixes applied
- Check for any remaining compilation errors
- Fix errors before proceeding

---

### Step 4: Start API Server

```bash
cd apps/api
pnpm dev
```

**Expected Output:**
```
✓ Server listening on http://localhost:3001
✅ All routes registered successfully
```

**Verify:**
- No missing container errors
- No missing route errors
- All routes registered successfully

**Key Routes to Verify:**
- `/api/v1/health` - Health check
- `/api/v1/auth/*` - Authentication routes
- `/api/v1/collaborative-insights/*` - Collaborative insights routes
- `/api/v1/mfa-audit/*` - MFA audit routes

---

### Step 5: Test API Endpoints

#### Health Check

```bash
curl http://localhost:3001/api/v1/health
```

**Expected:** 200 OK response

#### Authentication (if admin user exists)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"your-password"}'
```

**Expected:** 200 OK with token

---

### Step 6: Start Web Application

```bash
cd apps/web
pnpm dev
```

**Expected Output:**
```
✓ Ready on http://localhost:3000
```

---

### Step 7: Verify Frontend-Backend Integration

1. **Open browser:** http://localhost:3000

2. **Test Components:**
   - Open browser DevTools → Network tab
   - Navigate to different pages
   - Verify API calls use `/api/v1/` prefix
   - Verify no hardcoded `http://localhost:3001` URLs

3. **Test Specific Components:**
   - **Webhooks Manager:** Should use `apiClient`
   - **Notification Center:** Should use `notificationApi` or `apiClient`
   - **Settings:** Should use `apiClient`
   - **API Key Management:** Should use `apiClient`
   - **Audit Log Viewer:** Should use `apiClient`
   - **Reports Export:** Should use `apiClient`

---

## Automated Testing

### Run API Tests

```bash
# Run all API tests
pnpm test

# Run specific test suites
pnpm test tests/auth-api.test.ts
pnpm test tests/project-api.test.ts
```

### Run Integration Tests

```bash
pnpm test tests/integration/
```

---

## Troubleshooting

### Issue: Container Initialization Fails

**Symptoms:**
- Error: "Container already exists" or "Container creation failed"

**Solutions:**
1. Check Cosmos DB connection string in `.env`
2. Verify you have permissions to create containers
3. Check Azure Portal for existing containers
4. Delete and recreate if needed

---

### Issue: Routes Not Registered

**Symptoms:**
- 404 errors on API endpoints
- Routes not appearing in logs

**Solutions:**
1. Check `apps/api/src/routes/index.ts` for route registration
2. Verify route files exist and are imported
3. Check server logs for registration errors
4. Verify controller dependencies are available

---

### Issue: Frontend API Calls Fail

**Symptoms:**
- CORS errors
- 404 errors on API calls
- Network errors

**Solutions:**
1. Verify API server is running
2. Check `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env.local`
3. Verify API calls use correct endpoints (`/api/v1/...`)
4. Check browser console for errors

---

### Issue: TypeScript Compilation Errors

**Symptoms:**
- `tsc --noEmit` fails
- Build errors

**Solutions:**
1. Review `TYPESCRIPT_ERRORS_FIXED.md`
2. Check for any remaining errors
3. Fix type mismatches
4. Verify all imports are correct

---

## Verification Checklist

- [ ] Container configuration verified
- [ ] CosmosDB containers initialized
- [ ] TypeScript compilation passes
- [ ] API server starts without errors
- [ ] All routes registered successfully
- [ ] Health endpoint accessible
- [ ] Frontend starts without errors
- [ ] No hardcoded URLs in frontend
- [ ] API calls use correct endpoints
- [ ] Integration tests pass

---

## Next Steps

After verification:

1. **Run End-to-End Tests:**
   - Test complete user workflows
   - Test AI insights features
   - Test collaborative features

2. **Performance Testing:**
   - Test API response times
   - Test container query performance
   - Test frontend load times

3. **Security Testing:**
   - Test authentication flows
   - Test authorization checks
   - Test rate limiting

---

## Additional Resources

- [Implementation Status Update](./IMPLEMENTATION_STATUS_UPDATE.md)
- [TypeScript Errors Fixed](./TYPESCRIPT_ERRORS_FIXED.md)
- [API Test Status](./tests/API_TEST_STATUS.md)
- [Container Architecture](./docs/features/ai-insights/CONTAINER-ARCHITECTURE.md)

---

**Status:** ✅ Ready for Testing  
**Last Updated:** 2025-01-XX




