# Collaborative Insights Test Suite

## Overview

Comprehensive test suite for the Collaborative Insights feature, covering:
- Sharing insights with team members
- Getting and listing insights
- Recording views
- Reactions (add/remove)
- Comments (add/edit/delete with threading)
- Notifications
- Collections
- Activity feed
- Permission checks
- Error handling

## Test Files

### Service Tests
- **`collaborative-insights.service.test.ts`** - Unit tests for `CollaborativeInsightsService`
  - Sharing insights
  - Getting and listing insights
  - View recording
  - Reactions management
  - Comments management (with mentions and threading)
  - Notifications
  - Collections
  - Activity feed
  - Permission checks
  - Redis caching behavior
  - Error handling

### Controller Tests
- **`../unit/collaborative-insights.controller.test.ts`** - Unit tests for `CollaborativeInsightsController`
  - Request validation
  - Authentication and authorization
  - Input validation (visibility, reaction types, content length)
  - Query parameter parsing (tags, limit, offset, cursor)
  - Response formatting
  - Error handling

## Test Coverage

### Service Tests (60+ tests)
- ✅ Sharing insights (with notifications and activity feed)
- ✅ Getting insights (cache-first, fallback to repository)
- ✅ Recording views
- ✅ Listing insights (with filters: visibility, tags, pagination)
- ✅ Permission checks (canUserView)
- ✅ Adding reactions (replace existing, notify owner)
- ✅ Removing reactions
- ✅ Adding comments (with mentions extraction, threading)
- ✅ Editing comments (author-only)
- ✅ Deleting comments (author-only)
- ✅ Notifications (get, mark read, unread count)
- ✅ Collections (create, add insights)
- ✅ Activity feed (with pagination)
- ✅ Redis optional behavior (works without Redis)
- ✅ Error handling

### Controller Tests (40+ tests)
- ✅ Share insight validation (required fields, visibility, expiresAt)
- ✅ Get insight (with view recording)
- ✅ List insights (query parsing, limit/offset validation)
- ✅ Add reaction (validation, error handling)
- ✅ Remove reaction
- ✅ Add comment (content validation, length limits, threading)
- ✅ Edit comment (authorization checks)
- ✅ Delete comment (authorization checks)
- ✅ Get notifications (filtering, limit validation)
- ✅ Mark notification read
- ✅ Mark all notifications read
- ✅ Get activity feed (pagination, limit validation)
- ✅ Error handling (service errors, AppError handling)

## Running Tests

```bash
# Run all collaborative insights tests
pnpm --filter @castiel/api test collaborative-insights

# Run service tests only
pnpm --filter @castiel/api test collaborative-insights.service

# Run controller tests only
pnpm --filter @castiel/api test collaborative-insights.controller

# Run with coverage
pnpm --filter @castiel/api test:coverage collaborative-insights
```

## Test Structure

Tests follow the existing patterns:
- Use Vitest testing framework
- Mock all external dependencies (Repository, Redis, Monitoring)
- Test happy paths, error cases, and edge cases
- Use descriptive test names
- Group related tests with `describe` blocks
- Test both with and without Redis (optional dependency)

## Dependencies Mocked

- `CollaborativeInsightsRepository` - Cosmos DB operations
- `Redis` - Caching and notifications (optional)
- `IMonitoringProvider` - Monitoring and logging

## Key Features Tested

### Sharing
- Share insights with different visibility levels (private, team, tenant, specific)
- Send notifications to shared users
- Add to activity feed
- Support optional fields (summary, tags, related shards, expiration)

### Reactions
- Add reactions (replace existing from same user)
- Remove reactions
- Notify insight owner when reaction is added

### Comments
- Add comments with mention extraction (`@[Name](user:id)`)
- Support threaded replies (parentId)
- Edit comments (author-only)
- Delete comments (author-only)
- Notify mentioned users
- Notify insight owner

### Notifications
- Get notifications (with unread filtering)
- Mark notification as read
- Mark all notifications as read
- Get unread count

### Collections
- Create collections
- Add insights to collections
- Prevent duplicate additions

### Activity Feed
- Get activity feed with pagination
- Support cursor-based pagination

### Permissions
- Filter insights by user permissions
- Check if user can view insight (visibility, expiration, sharing)

## Notes

- Tests are isolated and don't require external services
- All dependencies are mocked for fast execution
- Tests verify both success and failure scenarios
- Redis is optional - service works without it (returns empty arrays for notifications/collections)
- Tests verify cache behavior (cache-first, fallback to repository)
- Tests verify notification creation for various events


