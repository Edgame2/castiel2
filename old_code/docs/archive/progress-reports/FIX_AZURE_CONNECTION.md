# URGENT: Fix Azure Cosmos DB Connection

## Current Problem
Your API is timing out (30 seconds) when trying to connect to Azure Cosmos DB at:
- **Endpoint**: `https://castieldev.documents.azure.com:443/`
- **Database**: `castiel`

## Immediate Solutions (Choose ONE)

### Solution A: Fix Azure Firewall (5 minutes)
This is the MOST LIKELY issue - your IP is blocked.

1. **Open Azure Portal**: https://portal.azure.com
2. **Navigate to**: Cosmos DB → "castieldev" account
3. **Go to**: Settings → Networking → Firewall and virtual networks
4. **Check current setting**:
   - If "Selected networks" is enabled → Your IP must be whitelisted
   - If "All networks" is enabled → There's a different issue

5. **FIX IT - Option 1 (Quick test)**:
   - Select "Allow access from: **All networks**"
   - Click "Save"
   - Wait 2-3 minutes for propagation
   - Restart API: `pnpm dev:api`

6. **FIX IT - Option 2 (More secure)**:
   - Keep "Selected networks"
   - Click "+ Add my current IP"
   - Or manually add: Find your IP at https://whatismyipaddress.com/
   - Click "Save"
   - Restart API: `pnpm dev:api`

### Solution B: Verify Credentials (2 minutes)

Your .env has these credentials - verify they're correct:

```bash
# Run this to test connection directly
curl -X GET \
  "https://castieldev.documents.azure.com:443/" \
  -H "Authorization: type%3Dmaster%26ver%3D1.0%26sig%3DZJbAUv12qiurFMAFaWG231JDrj5EFXSs3FP6TSwAYUaXLzMqaO6dsvtpr7Vuy33Hf5jNx800obeoACDbvbfnog%3D%3D" \
  -H "x-ms-date: $(date -u +"%a, %d %b %Y %H:%M:%S GMT")" \
  -H "x-ms-version: 2018-12-31" \
  --max-time 5
```

If this times out → Firewall issue
If this returns 401 → Credential issue
If this returns data → Credentials are good

### Solution C: Check Azure Service Status (1 minute)

1. Go to: https://status.azure.com/
2. Check if Cosmos DB has any outages
3. Check your Azure subscription status

### Solution D: Switch to Local (NO AZURE ACCESS)

If you CANNOT access Azure Portal, use local development:

```bash
# 1. Start Docker Desktop manually (GUI)
#    OR if on Linux with systemd:
sudo systemctl start docker

# 2. Wait for Docker to be ready (30 seconds)

# 3. Start local services:
./switch-to-local-dev.sh

# 4. Initialize database:
pnpm run init:db

# 5. Start servers:
pnpm dev
```

## Current Environment Settings

Your .env is NOW configured for LOCAL (I changed it):
```
COSMOS_DB_ENDPOINT=https://localhost:8081/    # Local emulator
REDIS_HOST=localhost                          # Local Redis (WORKING!)
```

**But you need Docker running for Cosmos DB Emulator!**

## What Happens After Fix

Once connectivity is restored, you should see in API logs:
```
✅ Redis connected successfully
✅ Cosmos DB connection established for auth services
✅ Cosmos DB client initialized for shards data
✅ Cache admin routes registered (with monitoring and warming)
✅ Dashboard routes registered
```

Instead of:
```
⚠️ Cosmos DB health check failed for auth services  ← THIS IS YOUR PROBLEM
```

## Test After Fix

```bash
# 1. Restart API
pnpm dev:api

# 2. Wait 10 seconds for startup

# 3. Test login (should complete in <2 seconds, not timeout)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin@123"}' \
  --max-time 5

# If this works, dashboards will work too!
```

## My Recommendation

**START HERE**:
1. Open Docker Desktop (if installed)
2. If Docker works → Use local development (Solution D)
3. If no Docker access → Fix Azure firewall (Solution A)

---

**Created**: 2025-12-01
**Status**: URGENT - API completely broken until resolved
