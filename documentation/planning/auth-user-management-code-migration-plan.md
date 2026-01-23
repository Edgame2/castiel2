# Authentication and User Management Code Migration Plan

## Overview

This document outlines the plan for migrating implementation code from `server/src/` to the new containerized modules `containers/auth/` and `containers/user-management/`.

**Status**: In Progress  
**Date**: 2025-01-22

---

## Migration Strategy

### Phase 1: Foundation (Current)
- ✅ Module structure created
- ✅ Configuration files created
- ✅ Event documentation created
- ✅ Server entry points created
- ✅ Config loaders created
- ⚠️ Route implementations (in progress)

### Phase 2: Core Services Migration
- [ ] Migrate authentication services
- [ ] Migrate user management services
- [ ] Migrate utility functions
- [ ] Create event publishers

### Phase 3: Route Migration
- [ ] Migrate authentication routes
- [ ] Migrate user management routes
- [ ] Update imports to use `@coder/shared`
- [ ] Remove dependencies on server-specific code

### Phase 4: Integration
- [ ] Update main server to proxy to new services
- [ ] Update service clients
- [ ] Test end-to-end flows
- [ ] Update tests

---

## Files to Migrate

### Authentication Module

#### From `server/src/auth/`:
- `GoogleOAuth.ts` → `containers/auth/src/services/providers/GoogleOAuth.ts`
- `GitHubOAuth.ts` → `containers/auth/src/services/providers/GitHubOAuth.ts`
- `SAMLHandler.ts` → `containers/auth/src/services/providers/SAMLHandler.ts`

#### From `server/src/routes/`:
- `auth.ts` → `containers/auth/src/routes/auth.ts`

#### From `server/src/services/`:
- `sessionService.ts` → `containers/auth/src/services/SessionService.ts`
- `passwordHistoryService.ts` → `containers/auth/src/services/PasswordHistoryService.ts`
- `passwordResetService.ts` → `containers/auth/src/services/PasswordResetService.ts`
- `emailVerificationService.ts` → `containers/auth/src/services/EmailVerificationService.ts`
- `authProviderService.ts` → `containers/auth/src/services/AuthProviderService.ts`
- `loginHistoryService.ts` → `containers/auth/src/services/LoginHistoryService.ts`
- `loginAttemptService.ts` → `containers/auth/src/services/LoginAttemptService.ts`
- `passwordPolicyService.ts` → `containers/auth/src/services/PasswordPolicyService.ts`
- `ssoConfigurationService.ts` → `containers/auth/src/services/SSOConfigurationService.ts`

#### From `server/src/utils/`:
- `passwordUtils.ts` → `containers/auth/src/utils/passwordUtils.ts`
- `deviceUtils.ts` → `containers/auth/src/utils/deviceUtils.ts`
- `geolocationUtils.ts` → `containers/auth/src/utils/geolocationUtils.ts`
- `stringUtils.ts` → `containers/auth/src/utils/stringUtils.ts` (or use from shared)

#### From `server/src/middleware/`:
- `auth.ts` → `containers/auth/src/middleware/auth.ts` (for internal use)

#### From `server/src/events/`:
- `ssoEventPublisher.ts` → `containers/auth/src/events/publishers/SSOEventPublisher.ts`

#### From `server/src/types/`:
- `events.ts` (auth events) → `containers/auth/src/types/events.ts`

---

### User Management Module

#### From `server/src/routes/`:
- `users.ts` → `containers/user-management/src/routes/users.ts`
- `organizations.ts` → `containers/user-management/src/routes/organizations.ts`
- `teams.ts` → `containers/user-management/src/routes/teams.ts`
- `roles.ts` → `containers/user-management/src/routes/roles.ts`
- `invitations.ts` → `containers/user-management/src/routes/invitations.ts`
- `memberships.ts` → `containers/user-management/src/routes/memberships.ts`

#### From `server/src/services/`:
- `userService.ts` → `containers/user-management/src/services/UserService.ts`
- `organizationService.ts` → `containers/user-management/src/services/OrganizationService.ts`
- `teamService.ts` → `containers/user-management/src/services/TeamService.ts`
- `roleService.ts` → `containers/user-management/src/services/RoleService.ts`
- `permissionService.ts` → `containers/user-management/src/services/PermissionService.ts`
- `invitationService.ts` → `containers/user-management/src/services/InvitationService.ts`
- `membershipService.ts` → `containers/user-management/src/services/MembershipService.ts`
- `organizationSettingsService.ts` → `containers/user-management/src/services/OrganizationSettingsService.ts`
- `accountService.ts` → `containers/user-management/src/services/AccountService.ts`

#### From `server/src/utils/`:
- `stringUtils.ts` → Use from `@coder/shared` or copy
- `validation.ts` → Use from `@coder/shared` or copy

#### From `server/src/types/`:
- `events.ts` (user management events) → `containers/user-management/src/types/events.ts`

---

## Dependencies to Update

### Use from `@coder/shared`:
- Database client: `getDatabaseClient()` from `@coder/shared`
- Redis client: Check if available in shared
- Event publisher: `EventPublisher` from `@coder/shared`
- JWT setup: `setupJWT` from `@coder/shared`
- Logger: Create module-specific logger (already done)
- Types: Shared types from `@coder/shared`

### Keep Module-Specific:
- Password utilities (auth-specific)
- Device utilities (auth-specific)
- Session management (auth-specific)
- Organization/Team logic (user-management-specific)

---

## Import Path Updates

### Before (server/src):
```typescript
import { getDatabaseClient } from '../database/DatabaseClient';
import { log } from '../utils/logger';
import { hashPassword } from '../utils/passwordUtils';
```

### After (containers/auth/src):
```typescript
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { hashPassword } from '../utils/passwordUtils';
```

---

## Testing Strategy

1. **Unit Tests**: Migrate existing tests to new locations
2. **Integration Tests**: Update to test containerized services
3. **E2E Tests**: Update to use new service URLs
4. **Manual Testing**: Test authentication and user management flows

---

## Rollout Plan

1. **Development**: Complete migration in dev environment
2. **Testing**: Run full test suite
3. **Staging**: Deploy to staging, verify functionality
4. **Production**: Gradual rollout with monitoring

---

## Notes

- Some utilities may be shared between modules - consider moving to `@coder/shared`
- Database client extensions (soft delete filtering) may need to be handled
- Event publishing needs to be set up in both modules
- Main server needs gateway/proxy functionality

---

## Related Documentation

- [Containerization Summary](./auth-user-management-containerization-summary.md)
- [Gap Analysis](./auth-user-management-gap-analysis.md)
- [Module Implementation Guide](../global/ModuleImplementationGuide.md)



