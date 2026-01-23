# User Management Testing - Active Session

**Date**: January 22, 2025  
**Status**: 🟢 Services Running

## Services Status

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Frontend | 3000 | http://localhost:3000 | ✅ Running (PID: 590250) |
| Main API | 3001 | http://localhost:3001 | ⏸️ Not needed for User Management |
| Auth Broker | 3002 | http://localhost:3002 | ✅ Running (PID: 590145) |
| Redis | 6379 | localhost:6379 | ✅ Running |

## Quick Access

**Frontend**: http://localhost:3000
**Testing Guide**: `.github/docs/frontend/authentication/TESTING_GUIDE.md`

## Log Files

Monitor logs in real-time:
```bash
# Auth Broker logs
tail -f /tmp/auth-broker.log

# Frontend logs
tail -f /tmp/frontend.log
```

## Stop Services

When done testing:
```bash
kill 590145 590250
```

Or kill all:
```bash
pkill -f "auth-broker"
pkill -f "next dev"
```

## Test Backend Endpoints

Before testing frontend, verify backend works:
```bash
cd services/auth-broker
./test-user-management.sh
```

This will:
- Create test tenant
- Create test users with different statuses
- Test all 10 endpoints
- Populate data for frontend testing

## User Management Pages to Test

### 1. Users List Page
**URL**: http://localhost:3000/users

Test:
- [ ] Page loads without errors
- [ ] Stats cards display (Total, Active, Pending, Suspended)
- [ ] User table shows data
- [ ] Search works
- [ ] Status filter works (active, inactive, suspended, pending, deleted)
- [ ] Role filter works
- [ ] Sorting works (click column headers)
- [ ] Pagination works (if >20 users)
- [ ] Actions menu works (View, Edit, Activate, Deactivate, Reset, Delete)

### 2. User Detail Page
**URL**: http://localhost:3000/users/[user-id]

Test:
- [ ] Profile card shows firstName/lastName (or fallback)
- [ ] Email verification badge displays
- [ ] Roles show as badges (multiple roles)
- [ ] Status badge shows correct color
- [ ] Activity log section visible
- [ ] Metadata displays (if present)
- [ ] Action buttons work (Edit, Activate/Deactivate, Reset Password, Delete)
- [ ] Quick actions sidebar works

### 3. User Edit Page
**URL**: http://localhost:3000/users/[user-id]/edit

Test:
- [ ] Form loads with current data
- [ ] firstName/lastName can be edited
- [ ] Email is read-only
- [ ] Roles can be added (quick buttons + custom)
- [ ] Roles can be removed (X button)
- [ ] Metadata can be added (key-value)
- [ ] Metadata can be removed
- [ ] Validation works (at least 1 role required)
- [ ] Save button works, redirects to detail page
- [ ] Cancel button returns to detail page

### 4. Invite User Dialog
**Location**: Users list page → "Invite User" button

Test:
- [ ] Dialog opens
- [ ] Email field validates
- [ ] firstName/lastName optional
- [ ] Multiple roles can be selected
- [ ] Custom roles can be added
- [ ] Expiry days field (1-30, default 7)
- [ ] Send Invitation creates pending user
- [ ] Success toast appears
- [ ] User list refreshes with new user

## Common Issues

### Issue: "Network Error" or "Failed to fetch"
**Cause**: Frontend can't reach Auth Broker
**Fix**: 
- Verify Auth Broker is running: `curl http://localhost:3002/health`
- Check CORS in `.env`: `CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002`
- Check frontend `.env.local`: `NEXT_PUBLIC_AUTH_BROKER_URL=http://localhost:3002`

### Issue: "No tenant found" or "Tenant ID missing"
**Cause**: Tenant ID not in localStorage
**Fix**: 
- Open browser DevTools → Console
- Run: `localStorage.setItem('tenantId', 'test-tenant-123')`
- Refresh page

### Issue: Empty user list
**Cause**: No test data created
**Fix**: 
```bash
cd services/auth-broker
./test-user-management.sh
```

### Issue: Compilation errors in frontend
**Cause**: TypeScript errors or missing dependencies
**Fix**:
```bash
cd services/frontend
pnpm install
pnpm type-check
```

## Testing Workflow

### Phase 1: Backend Verification (5 min)
```bash
cd services/auth-broker
./test-user-management.sh
```
✅ All endpoints should return 200-299 status codes

### Phase 2: Frontend Smoke Test (5 min)
1. Open http://localhost:3000
2. Navigate to /users
3. Verify list loads
4. Click one user → detail page
5. Click Edit → edit page
6. Click Invite User → dialog opens

### Phase 3: Comprehensive Testing (30-60 min)
Follow detailed test cases in `TESTING_GUIDE.md`

## Browser DevTools Checklist

Open DevTools (F12) and check:
- [ ] **Console**: No errors (some warnings OK)
- [ ] **Network**: API calls to localhost:3002 succeed (200 status)
- [ ] **Application → Local Storage**: `tenantId` is set
- [ ] **Application → Cookies**: Session cookies present

## Success Criteria

✅ **All pages load without errors**
✅ **All CRUD operations work** (Create, Read, Update, Delete)
✅ **Filters and sorting work**
✅ **Actions work** (Activate, Deactivate, Reset, Delete)
✅ **No console errors** (warnings acceptable)
✅ **Loading states show**
✅ **Success/error toasts appear**
✅ **Confirmations for destructive actions**

## Notes

- Activity log shows empty state (backend placeholder)
- Email notifications require SendGrid API key
- Cache invalidation warning in logs is non-critical
- Session management and MFA features not yet implemented

---

**Happy Testing!** 🎉

If you find issues:
1. Note the steps to reproduce
2. Check browser console for errors
3. Check backend logs: `tail -f /tmp/auth-broker.log`
4. Document in testing guide or create issue
