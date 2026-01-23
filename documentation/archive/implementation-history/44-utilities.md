# Utilities Module

**Category:** Shared & Common  
**Location:** `src/renderer/utils/`, `server/src/utils/`  
**Last Updated:** 2025-01-27

---

## Overview

The Utilities Module provides common utility functions used throughout the Coder IDE application. It includes helper functions, formatting utilities, date/time utilities, and data manipulation functions.

## Purpose

- Common utility functions
- Helper functions
- Formatting utilities
- Date/time utilities
- String manipulation
- Array/object utilities
- Data transformation

---

## Key Components

### 1. Frontend Utilities (`src/renderer/utils/`)

**Purpose:** Frontend-specific utilities

**Utilities:**
- UI helpers
- Formatting functions
- Date/time formatting
- String utilities
- Array utilities
- Object utilities

### 2. Backend Utilities (`server/src/utils/`)

**Purpose:** Backend-specific utilities

**Utilities:**
- Logger (`logger.ts`)
- Password utilities (`passwordUtils.ts`)
- String utilities (`stringUtils.ts`)
- Validation utilities (`validation.ts`)
- Environment validation (`envValidation.ts`)
- Database error handling (`databaseErrorHandler.ts`)
- Database route helpers (`databaseRouteHelper.ts`)
- Metrics (`metrics.ts`)
- Alerting (`alerting.ts`)
- Cache keys (`cacheKeys.ts`)
- RBAC verification (`rbacVerification.ts`)

---

## Common Utilities

### String Utilities

**Functions:**
- `truncate(str, length)` - Truncate string
- `capitalize(str)` - Capitalize first letter
- `camelCase(str)` - Convert to camelCase
- `kebabCase(str)` - Convert to kebab-case
- `slugify(str)` - Create URL-friendly slug
- `escapeHtml(str)` - Escape HTML
- `unescapeHtml(str)` - Unescape HTML

**Usage:**
```typescript
import { truncate, slugify } from '@/utils/string';

const truncated = truncate('Long text...', 50);
const slug = slugify('My Project Name'); // 'my-project-name'
```

### Date/Time Utilities

**Functions:**
- `formatDate(date, format)` - Format date
- `formatRelativeTime(date)` - Relative time (e.g., "2 hours ago")
- `formatDuration(ms)` - Format duration
- `parseDate(dateString)` - Parse date string
- `isValidDate(date)` - Validate date

**Usage:**
```typescript
import { formatDate, formatRelativeTime } from '@/utils/date';

const formatted = formatDate(new Date(), 'YYYY-MM-DD');
const relative = formatRelativeTime(new Date()); // '2 hours ago'
```

### Array Utilities

**Functions:**
- `groupBy(array, key)` - Group array by key
- `sortBy(array, key)` - Sort array by key
- `unique(array)` - Remove duplicates
- `chunk(array, size)` - Chunk array
- `flatten(array)` - Flatten nested array
- `intersection(array1, array2)` - Array intersection
- `difference(array1, array2)` - Array difference

**Usage:**
```typescript
import { groupBy, sortBy } from '@/utils/array';

const grouped = groupBy(tasks, 'status');
const sorted = sortBy(tasks, 'priority');
```

### Object Utilities

**Functions:**
- `pick(obj, keys)` - Pick properties
- `omit(obj, keys)` - Omit properties
- `deepMerge(obj1, obj2)` - Deep merge objects
- `deepClone(obj)` - Deep clone object
- `isEmpty(obj)` - Check if empty
- `isEqual(obj1, obj2)` - Deep equality check

**Usage:**
```typescript
import { pick, deepMerge } from '@/utils/object';

const picked = pick(user, ['id', 'email', 'name']);
const merged = deepMerge(defaultConfig, userConfig);
```

### Formatting Utilities

**Functions:**
- `formatNumber(num, decimals)` - Format number
- `formatCurrency(amount, currency)` - Format currency
- `formatBytes(bytes)` - Format bytes (KB, MB, GB)
- `formatPercentage(value, decimals)` - Format percentage

**Usage:**
```typescript
import { formatBytes, formatNumber } from '@/utils/format';

const size = formatBytes(1024); // '1 KB'
const num = formatNumber(1234.567, 2); // '1,234.57'
```

---

## Backend Utilities

### Logger (`logger.ts`)

**Purpose:** Structured logging

**Features:**
- Log levels (debug, info, warn, error)
- Structured logging
- Log rotation
- Log formatting

**Usage:**
```typescript
import { log } from './utils/logger';

log.info('User logged in', { userId: user.id });
log.error('Database error', { error: err.message });
```

### Password Utilities (`passwordUtils.ts`)

**Purpose:** Password hashing and validation

**Functions:**
- `hashPassword(password)` - Hash password
- `comparePassword(password, hash)` - Compare password
- `validatePasswordStrength(password)` - Validate strength

**Usage:**
```typescript
import { hashPassword, comparePassword } from './utils/passwordUtils';

const hash = await hashPassword('password123');
const isValid = await comparePassword('password123', hash);
```

### Environment Validation (`envValidation.ts`)

**Purpose:** Validate environment variables

**Features:**
- Required variable checking
- Type validation
- Value validation
- Security warnings

**Usage:**
```typescript
import { validateEnvironment } from './utils/envValidation';

const result = validateEnvironment();
if (!result.valid) {
  console.error('Environment validation failed:', result.errors);
}
```

### Database Error Handler (`databaseErrorHandler.ts`)

**Purpose:** Handle database errors

**Features:**
- Error categorization
- User-friendly messages
- Error logging
- Error recovery

**Usage:**
```typescript
import { handleDatabaseError } from './utils/databaseErrorHandler';

try {
  await db.user.create({ data: {...} });
} catch (error) {
  const handled = handleDatabaseError(error);
  reply.code(handled.statusCode).send({ error: handled.message });
}
```

### Cache Keys (`cacheKeys.ts`)

**Purpose:** Generate cache keys

**Functions:**
- `userCacheKey(userId)` - User cache key
- `projectCacheKey(projectId)` - Project cache key
- `permissionCacheKey(userId, orgId)` - Permission cache key

**Usage:**
```typescript
import { userCacheKey, projectCacheKey } from './utils/cacheKeys';

const key = userCacheKey(userId); // 'user:123'
const projectKey = projectCacheKey(projectId); // 'project:456'
```

---

## Frontend Utilities

### Class Name Utilities

**Function:** `cn(...classes)`

**Purpose:** Conditional class names

**Usage:**
```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', isActive && 'active', className)} />
```

### Formatting

**Date Formatting:**
```typescript
import { formatDate, formatRelativeTime } from '@/utils/date';

const date = formatDate(new Date(), 'MMM DD, YYYY');
const relative = formatRelativeTime(task.createdAt);
```

**Number Formatting:**
```typescript
import { formatNumber, formatBytes } from '@/utils/format';

const num = formatNumber(1234.56); // '1,234.56'
const size = formatBytes(1048576); // '1 MB'
```

---

## Data Transformation

### Transform Functions

```typescript
// Transform API response to UI format
function transformUser(user: ApiUser): UIUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || `${user.firstName} ${user.lastName}`,
    avatar: user.avatarUrl || user.picture,
  };
}

// Transform UI input to API format
function transformCreateProject(input: CreateProjectInput): ApiCreateProject {
  return {
    name: input.name.trim(),
    description: input.description?.trim(),
    organizationId: input.organizationId,
  };
}
```

---

## Usage Examples

### Format Date

```typescript
import { formatDate, formatRelativeTime } from '@/utils/date';

// Format date
const formatted = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');

// Relative time
const relative = formatRelativeTime(task.updatedAt); // '2 hours ago'
```

### Group and Sort

```typescript
import { groupBy, sortBy } from '@/utils/array';

// Group tasks by status
const grouped = groupBy(tasks, 'status');
// { 'to_do': [...], 'in_progress': [...], 'done': [...] }

// Sort by priority
const sorted = sortBy(tasks, 'priority', 'desc');
```

### Deep Merge

```typescript
import { deepMerge } from '@/utils/object';

// Merge configurations
const config = deepMerge(defaultConfig, userConfig, projectConfig);
```

---

## Related Modules

- **Shared Types Module** - Types used in utilities
- **Validation Module** - Validation utilities
- **All Modules** - Use utilities

---

## Summary

The Utilities Module provides comprehensive utility functions for the Coder IDE application. With string, date, array, object, and formatting utilities in both frontend and backend, it enables consistent data manipulation and formatting throughout the application.
