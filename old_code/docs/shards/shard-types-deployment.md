# ShardType Feature - Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Add these variables to your environment configuration:

```bash
# Feature Flags
NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED=true
NEXT_PUBLIC_FEATURE_SHARD_TYPES_VISUAL_BUILDER=true
NEXT_PUBLIC_FEATURE_SHARD_TYPES_CODE_EDITOR=true
NEXT_PUBLIC_FEATURE_SHARD_TYPES_INHERITANCE=true

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX          # Google Analytics 4 Measurement ID

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# API Configuration
NEXT_PUBLIC_API_URL=https://api.castiel.app
NEXT_PUBLIC_APP_ENV=production          # development | staging | production
```

### 2. Database Migrations

Run migrations in order:

```bash
# Connect to your database
psql -h your-db-host -U your-db-user -d castiel

# Run migration 002 - Schema enhancements
\i services/main-api/migrations/002_shard_type_enhancements.sql

# Run migration 003 - Seed default types
\i services/main-api/migrations/003_seed_default_shard_types.sql

# Verify migrations
SELECT * FROM shard_types WHERE is_system = TRUE;
```

**Rollback (if needed):**
```bash
\i services/main-api/migrations/002_shard_type_enhancements_rollback.sql
```

### 3. Dependencies Installation

Ensure all required packages are installed:

```bash
cd services/frontend

# Install dependencies
pnpm install

# Verify critical packages
pnpm list @tanstack/react-query
pnpm list react-hook-form
pnpm list zod
pnpm list @monaco-editor/react
```

### 4. Build and Test

```bash
# Build frontend
cd services/frontend
pnpm build

# Run tests
pnpm test

# Check for errors
pnpm lint
pnpm tsc --noEmit
```

---

## Deployment Process

### Development Environment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Run migrations
npm run db:migrate

# 4. Start development server
pnpm dev

# 5. Verify feature at http://localhost:3000/shard-types
```

### Staging Environment

```bash
# 1. Deploy database migrations
# (Use your CI/CD pipeline or manual deployment)
psql $STAGING_DATABASE_URL < services/main-api/migrations/002_shard_type_enhancements.sql
psql $STAGING_DATABASE_URL < services/main-api/migrations/003_seed_default_shard_types.sql

# 2. Build and deploy frontend
cd services/frontend
pnpm build
# Deploy to staging server (Vercel, AWS, etc.)

# 3. Build and deploy backend
cd services/main-api
pnpm build
# Deploy to staging server

# 4. Run smoke tests
curl https://staging.castiel.app/api/v1/shard-types
curl https://staging.castiel.app/shard-types
```

### Production Deployment

#### Option A: Gradual Rollout (Recommended)

```bash
# 1. Deploy with feature flag DISABLED
NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED=false

# 2. Deploy database migrations (non-breaking changes)
# Migrations are designed to be backwards compatible
psql $PRODUCTION_DATABASE_URL < migrations/002_shard_type_enhancements.sql
psql $PRODUCTION_DATABASE_URL < migrations/003_seed_default_shard_types.sql

# 3. Deploy code changes
# - Backend API (new endpoints are available but not promoted)
# - Frontend (UI hidden behind feature flag)

# 4. Test with super admin account
NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED=true (for specific users via override)

# 5. Gradual rollout
# - 5% of users (set percentage in feature-flags.tsx)
# - Monitor for errors and performance
# - 25% rollout
# - 50% rollout
# - 100% rollout

# 6. Full enable
NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED=true
```

#### Option B: Blue-Green Deployment

```bash
# 1. Deploy to "green" environment
# 2. Run database migrations on green database
# 3. Smoke test green environment
# 4. Switch traffic to green environment
# 5. Monitor for issues
# 6. Keep blue environment as fallback
```

---

## Post-Deployment Verification

### 1. Smoke Tests

```bash
# Test API endpoints
curl -H "Authorization: Bearer $TOKEN" \
  https://api.castiel.app/api/v1/shard-types

# Expected: 200 OK with paginated list

curl -H "Authorization: Bearer $TOKEN" \
  https://api.castiel.app/api/v1/shard-types?isGlobal=true

# Expected: List of 6 default global types
```

### 2. Frontend Verification

Visit these pages and verify functionality:

- `/shard-types` - List page loads
- `/shard-types/new` - Create page accessible (Admin+)
- Click a shard type - Detail page loads
- Edit a type - Form pre-populated
- Schema builder - Visual and Code modes work
- Preview - Form renders correctly

### 3. RBAC Verification

Test role-based access:

```bash
# Super Admin
- Can create global types ✓
- Can create tenant types ✓
- Can edit all types ✓
- Can delete types ✓

# Admin
- Cannot create global types ✗
- Can create tenant types ✓
- Can edit own tenant types ✓
- Can delete own tenant types (if not in use) ✓

# User
- Cannot create types ✗
- Can view types ✓
- Cannot edit types ✗
- Cannot delete types ✗
```

### 4. Database Verification

```sql
-- Check default types exist
SELECT name, display_name, is_global, is_system
FROM shard_types
WHERE is_system = TRUE;

-- Expected: 6 rows
-- generic-document, contact-record, note, task, media-file, configuration

-- Check indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'shard_types';

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'shard_types';
```

---

## Monitoring Setup

### 1. Analytics Events

Verify these events are being tracked:

- `shard_type_created`
- `shard_type_updated`
- `shard_type_deleted`
- `schema_builder_opened`
- `schema_builder_mode_switched`

**Google Analytics Dashboard:**
```
Events → ShardType Events
- Filter by event name
- Check event count
- View user engagement
```

### 2. Error Tracking

**Sentry Setup:**
```bash
# Verify Sentry is receiving errors
https://sentry.io/organizations/your-org/issues/

# Search for: shard_type
# Check error frequency and severity
```

**Common Errors to Monitor:**
- `SHARD_TYPE_NOT_FOUND` - 404 errors
- `CIRCULAR_INHERITANCE` - Invalid parent selection
- `SCHEMA_INCOMPATIBLE` - Schema validation failures
- `INSUFFICIENT_PERMISSIONS` - RBAC violations

### 3. Performance Monitoring

**Key Metrics:**
```
API Response Times:
- GET /api/v1/shard-types: < 200ms (p95)
- GET /api/v1/shard-types/:id: < 100ms (p95)
- POST /api/v1/shard-types: < 500ms (p95)

Frontend Metrics:
- Page load time: < 2s
- Time to interactive: < 3s
- Schema builder render: < 1s
```

**Monitoring Tools:**
- Vercel Analytics (if using Vercel)
- Google Analytics (page load times)
- Sentry Performance (transaction traces)
- Custom APM (if available)

### 4. Database Performance

```sql
-- Monitor query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%shard_types%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'shard_types'
ORDER BY idx_scan DESC;

-- Table statistics
SELECT schemaname, tablename, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE tablename = 'shard_types';
```

---

## Rollback Plan

### Emergency Rollback

If critical issues are discovered:

#### 1. Disable Feature Flag (Fastest)
```bash
# Set environment variable
NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED=false

# Redeploy frontend (or restart if using server-side env vars)
# Users will no longer see ShardTypes UI
```

#### 2. Revert Code Deployment
```bash
# Revert to previous Git commit
git revert HEAD
git push origin main

# Trigger CI/CD deployment
```

#### 3. Rollback Database (Last Resort)
```bash
# Only if data corruption occurred
psql $DATABASE_URL < services/main-api/migrations/002_shard_type_enhancements_rollback.sql

# WARNING: This will DELETE all new ShardType data!
```

### Rollback Verification

After rollback:
```bash
# 1. Verify feature is disabled
curl https://api.castiel.app/shard-types
# Expected: 404 or no route

# 2. Check existing features still work
curl https://api.castiel.app/api/v1/shards
# Expected: 200 OK

# 3. Monitor error rates
# Should return to baseline within 5 minutes
```

---

## Common Deployment Issues

### Issue 1: Migration Fails

**Symptoms:**
- Error running migration SQL
- Missing columns in database

**Solution:**
```bash
# Check current schema
\d shard_types

# Re-run migration
\i migrations/002_shard_type_enhancements.sql

# If error persists, check PostgreSQL version (requires 12+)
SELECT version();
```

### Issue 2: Feature Flag Not Working

**Symptoms:**
- Feature visible when it shouldn't be
- Feature hidden when it should be visible

**Solution:**
```bash
# Check environment variable is set
echo $NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED

# Rebuild frontend (Next.js inlines env vars at build time)
pnpm build

# Verify in browser console
console.log(process.env.NEXT_PUBLIC_FEATURE_SHARD_TYPES_ENABLED)
```

### Issue 3: Monaco Editor Not Loading

**Symptoms:**
- Code editor shows blank or loading spinner
- Console error: "Failed to load monaco"

**Solution:**
```bash
# Ensure @monaco-editor/react is installed
pnpm add @monaco-editor/react

# Check CDN access (Monaco loads from CDN)
# Add to next.config.js:
module.exports = {
  webpack: (config) => {
    config.resolve.alias['monaco-editor'] = 'monaco-editor/esm/vs/editor/editor.api'
    return config
  }
}
```

### Issue 4: RBAC Not Enforcing

**Symptoms:**
- Admin can create global types
- User can access create page

**Solution:**
```bash
# Verify JWT token includes role
# Check backend middleware

# Frontend: Verify useRoleCheck hook
# Backend: Verify authorize middleware on routes
```

---

## Success Metrics

### Week 1 Post-Deployment

- [ ] Zero critical errors in Sentry
- [ ] < 5 non-critical errors per 1000 requests
- [ ] API p95 response time < 200ms
- [ ] 10+ ShardTypes created by users
- [ ] 100+ ShardTypes viewed
- [ ] Schema builder used by 50%+ of creators

### Month 1 Post-Deployment

- [ ] 100+ custom ShardTypes created
- [ ] 1000+ Shards using new types
- [ ] < 1% error rate
- [ ] User satisfaction survey: 4+/5 stars
- [ ] Feature adoption: 75%+ of active users

---

## Support and Documentation

### User Support

- **User Guide**: `/docs/user-guide/shard-types.md`
- **Video Tutorial**: (Create after deployment)
- **In-app Help**: Tooltips and contextual help
- **Support Email**: support@castiel.app

### Developer Resources

- **API Reference**: `/docs/api-reference/shard-types.md`
- **Architecture Guide**: `/services/frontend/src/components/shard-types/README.md`
- **Contribution Guide**: `CONTRIBUTING.md`

### Incident Response

**On-Call Rotation:**
- Monitor Sentry alerts
- Respond within 15 minutes for P0
- Respond within 1 hour for P1

**Escalation Path:**
1. On-call engineer
2. Team lead
3. Engineering manager

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates daily
- [ ] Review user feedback
- [ ] Fix minor bugs
- [ ] Update documentation based on feedback

### Month 1
- [ ] Conduct user satisfaction survey
- [ ] Analyze usage metrics
- [ ] Plan feature enhancements
- [ ] Optimize performance bottlenecks

### Quarter 1
- [ ] Feature retrospective
- [ ] Plan next iteration
- [ ] Consider advanced features (version history, AI assistant)

---

**Deployment Owner**: Development Team  
**Last Updated**: November 2025  
**Version**: 1.0.0  
**Status**: Ready for Production
