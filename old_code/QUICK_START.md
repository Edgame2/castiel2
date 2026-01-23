# Quick Start Guide - Implementation Verification

**Date:** 2025-01-XX  
**Status:** ✅ Ready for Testing

This guide provides the fastest path to verify that all implementation fixes are working correctly.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Configuration (30 seconds)

```bash
# Run automated verification
./scripts/verify-implementation.sh
```

**Expected:** All checks pass ✅

---

### Step 2: Initialize Containers (2 minutes)

```bash
cd apps/api
pnpm run init-db
```

**Expected:** All containers created successfully ✅

**Verify:**
```bash
# Check container configuration
pnpm run verify:containers
```

---

### Step 3: Start Services (2 minutes)

**Option A: Using Turborepo (Recommended)**
```bash
# From project root
pnpm dev
```

**Option B: Using Startup Script**
```bash
./scripts/start-dev.sh
```

**Option C: Manual Start**
```bash
# Terminal 1: API
cd apps/api && pnpm dev

# Terminal 2: Web
cd apps/web && pnpm dev
```

**Expected:**
- API running on http://localhost:3001 ✅
- Web running on http://localhost:3000 ✅
- No missing container errors ✅
- No missing route errors ✅

---

### Step 4: Quick Verification (30 seconds)

**Test Health Endpoint:**
```bash
curl http://localhost:3001/api/v1/health
```

**Expected:** 200 OK response ✅

**Open Browser:**
```
http://localhost:3000
```

**Expected:** Application loads without errors ✅

---

## ✅ Verification Checklist

Run through this checklist to verify everything is working:

- [ ] Verification script passes
- [ ] Containers initialized successfully
- [ ] API server starts without errors
- [ ] Web application starts without errors
- [ ] Health endpoint responds
- [ ] No hardcoded URLs in browser console
- [ ] API calls use `/api/v1/` prefix
- [ ] No missing container errors in logs
- [ ] No missing route errors in logs

---

## 🔍 Detailed Verification

### Check Container Initialization

```bash
cd apps/api
pnpm run verify:containers
```

**Expected Output:**
```
✅ All containers are properly aligned!
```

### Check TypeScript Compilation

```bash
cd apps/api
pnpm run typecheck
```

**Expected:** No errors

### Check API Endpoints

```bash
# Health check
curl http://localhost:3001/api/v1/health

# If authenticated, test other endpoints
curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/v1/collaborative-insights
```

### Check Frontend Integration

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate through the application
4. Verify:
   - API calls use `/api/v1/` prefix
   - No `http://localhost:3001` hardcoded URLs
   - All requests go through `apiClient`

---

## 🐛 Troubleshooting

### Issue: Verification Script Fails

**Solution:**
1. Check that all files exist
2. Verify you're in the project root
3. Check file permissions: `chmod +x scripts/verify-implementation.sh`

### Issue: Container Initialization Fails

**Symptoms:**
- Error: "Container already exists"
- Error: "Connection failed"

**Solutions:**
1. Check Cosmos DB connection string in `apps/api/.env`
2. Verify Azure credentials are correct
3. Check Azure Portal for existing containers
4. Delete and recreate if needed

### Issue: API Server Won't Start

**Symptoms:**
- Port 3001 already in use
- Missing dependencies

**Solutions:**
```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Reinstall dependencies
cd apps/api && pnpm install

# Check logs
tail -f /tmp/castiel/api.log
```

### Issue: Web Application Won't Start

**Symptoms:**
- Port 3000 already in use
- Build errors

**Solutions:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Clear Next.js cache
cd apps/web && rm -rf .next

# Reinstall dependencies
pnpm install

# Check logs
tail -f /tmp/castiel/web.log
```

### Issue: API Calls Fail

**Symptoms:**
- CORS errors
- 404 errors
- Network errors

**Solutions:**
1. Verify API server is running
2. Check `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env.local`
3. Verify API calls use correct endpoints
4. Check browser console for errors

---

## 📚 Additional Resources

- **Full Testing Guide:** `TESTING_GUIDE.md`
- **Implementation Summary:** `IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **TypeScript Fixes:** `TYPESCRIPT_ERRORS_FIXED.md`
- **Scripts Documentation:** `scripts/README.md`

---

## 🎯 Next Steps

After quick verification:

1. **Run Integration Tests:**
   ```bash
   pnpm test
   ```

2. **Test Specific Features:**
   - Test collaborative insights
   - Test notifications
   - Test API key management
   - Test webhooks

3. **End-to-End Testing:**
   - Test complete user workflows
   - Test AI insights features
   - Test all fixed components

---

## ⚡ Quick Commands Reference

```bash
# Verification
./scripts/verify-implementation.sh
cd apps/api && pnpm run verify:containers

# Initialization
cd apps/api && pnpm run init-db

# Start Services
pnpm dev                    # Turborepo (recommended)
./scripts/start-dev.sh      # With health checks

# Testing
curl http://localhost:3001/api/v1/health
pnpm test

# Logs
tail -f /tmp/castiel/api.log
tail -f /tmp/castiel/web.log
```

---

**Status:** ✅ Ready for Testing  
**Last Updated:** 2025-01-XX




