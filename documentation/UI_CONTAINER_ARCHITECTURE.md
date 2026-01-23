# UI Container Architecture

## Overview

This document describes the architecture and implementation decisions for the UI container (Next.js web application) based on the existing codebase in `old_code/apps/web/`.

## Project Structure

### Location
- **Container**: `containers/ui/`
- **Port**: 3000 (configurable via `PORT` environment variable)
- **Technology**: Next.js 16 (App Router), React 19, TypeScript

### Component Reuse Strategy

**All UI components and pages from `old_code/apps/web/` are reused:**

1. **Components**: `old_code/apps/web/src/components/` → `containers/ui/src/components/`
2. **Pages**: `old_code/apps/web/src/app/` → `containers/ui/src/app/`
3. **Hooks**: `old_code/apps/web/src/hooks/` → `containers/ui/src/hooks/`
4. **Lib/Utils**: `old_code/apps/web/src/lib/` → `containers/ui/src/lib/`
5. **Types**: `old_code/apps/web/src/types/` → `containers/ui/src/types/`

This approach:
- ✅ Maintains existing UI patterns and functionality
- ✅ Reduces development time
- ✅ Ensures consistency with existing design
- ✅ Preserves all existing features

## Communication Pattern (Recommended)

### Hybrid Approach

Based on the `old_code` implementation, the recommended pattern is:

#### 1. Direct API Calls (90% of operations)

**Primary pattern for most operations:**

```typescript
// Direct API call via Axios client
import { apiClient } from '@/lib/api-client';

const response = await apiClient.get('/api/v1/users');
const data = await apiClient.post('/api/v1/plans', planData);
```

**Characteristics:**
- Axios client configured with base URL (`NEXT_PUBLIC_API_BASE_URL`)
- Calls API Gateway (Port 3001) or microservices directly
- JWT tokens injected via Authorization header
- Automatic token refresh on 401 errors
- CSRF token support for state-changing operations

**Benefits:**
- Lower latency (no extra hop)
- Simpler architecture
- Direct error handling
- Better performance

**Use for:**
- CRUD operations
- Data fetching
- Queries
- Most business operations

#### 2. Next.js API Routes - BFF (10% of operations)

**Used for authentication and sensitive operations:**

```typescript
// BFF pattern via Next.js API routes
const response = await fetch('/api/auth/token');
const profile = await fetch('/api/profile');
```

**Characteristics:**
- Next.js API routes in `/app/api/`
- Server-side execution
- httpOnly cookie management
- CSRF token handling
- Data aggregation before sending to client

**Benefits:**
- Security (hides backend structure)
- Server-side token management
- Data aggregation
- Sensitive operation protection

**Use for:**
- Authentication endpoints
- Token refresh
- CSRF token management
- Sensitive data operations
- Server-side data aggregation

### Implementation Example

```typescript
// lib/api/client.ts (from old_code)
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - adds auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken(); // From httpOnly cookie via /api/auth/token
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

## Port Configuration

### Recommended Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| **UI Container** | 3000 | Next.js web application |
| **API Gateway** | 3001 | Fastify API gateway |
| **Microservices** | 3002-3046 | Individual microservices |

### Benefits of This Configuration

1. **Clear Separation**: UI and backend on different ports
2. **Independent Scaling**: Scale UI and backend independently
3. **Development**: Easy to run services separately
4. **Production**: Flexible deployment options

### Environment Variables

```bash
# UI Container
PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# API Gateway
PORT=3001

# Microservices
# Each service uses its configured port (3002-3046)
```

## Technology Stack

### Core Technologies

- **Next.js 16**: App Router, Server Components, API Routes
- **React 19**: UI framework with latest features
- **TypeScript 5**: Type safety
- **Shadcn UI**: Component library
- **Tailwind CSS**: Styling

### State Management

- **TanStack Query**: Server state, data fetching, caching
- **React Context**: Global client state (auth, theme, i18n)
- **Zustand**: Complex client state (if needed)
- **React Hook Form**: Form state management

### Data Fetching

- **Axios**: HTTP client for API calls
- **TanStack Query**: Data fetching and caching layer
- **WebSocket/SSE**: Real-time communication

### Form Handling

- **React Hook Form**: Form state and validation
- **Zod**: Schema validation

## Project Structure

```
containers/ui/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── ...
│   │   ├── (protected)/       # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── shards/
│   │   │   ├── planning/
│   │   │   └── ...
│   │   ├── (public)/          # Public routes
│   │   │   ├── privacy/
│   │   │   └── terms/
│   │   └── api/               # API routes (BFF)
│   │       ├── auth/
│   │       ├── profile/
│   │       └── ...
│   ├── components/           # React components (reused from old_code)
│   │   ├── ui/                # Shadcn UI components
│   │   ├── layout/            # Layout components
│   │   ├── auth/              # Auth components
│   │   ├── shards/            # Shard components
│   │   ├── planning/          # Planning components
│   │   └── ...                # Other feature components
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-api.ts
│   │   └── ...
│   ├── lib/                   # Utilities and helpers
│   │   ├── api/              # API client configuration
│   │   │   ├── client.ts     # Axios client
│   │   │   └── ...
│   │   ├── realtime/         # WebSocket/SSE clients
│   │   ├── env.ts            # Environment variables
│   │   └── ...
│   ├── contexts/              # React contexts
│   │   ├── auth-context.tsx
│   │   └── ...
│   ├── types/                 # TypeScript types
│   └── locales/              # i18n translations
├── public/                    # Static assets
├── Dockerfile                 # Container definition
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## Migration from old_code

### Steps

1. **Copy Structure**
   ```bash
   # Copy components
   cp -r old_code/apps/web/src/components containers/ui/src/
   cp -r old_code/apps/web/src/app containers/ui/src/
   cp -r old_code/apps/web/src/hooks containers/ui/src/
   cp -r old_code/apps/web/src/lib containers/ui/src/
   cp -r old_code/apps/web/src/types containers/ui/src/
   cp -r old_code/apps/web/src/contexts containers/ui/src/
   cp -r old_code/apps/web/src/locales containers/ui/src/
   ```

2. **Update Imports**
   - Update import paths if needed
   - Ensure all relative imports work
   - Update environment variable references

3. **Update Configuration**
   - Update `next.config.ts` if needed
   - Update `package.json` dependencies
   - Update environment variables

4. **Test**
   - Verify all components render
   - Test API communication
   - Verify authentication flow
   - Test real-time features

## Key Features from old_code

### Authentication
- OAuth 2.0 integration
- JWT token management
- Multi-tenant support
- Session management

### Real-time Communication
- WebSocket client for bidirectional communication
- Server-Sent Events (SSE) for streaming
- Real-time notifications
- Live collaboration

### UI Components
- Comprehensive component library
- Responsive design
- Dark mode support
- Accessibility features

### Data Management
- TanStack Query for data fetching
- Optimistic updates
- Cache management
- Error handling

## Recommendations Summary

### ✅ Implemented Decisions

1. **Project Structure**: `containers/ui/` (new container)
2. **Component Reuse**: Yes - reuse from `old_code/apps/web/`
3. **Page Reuse**: Yes - reuse from `old_code/apps/web/src/app/`
4. **Monaco Editor**: No - not needed
5. **Port**: 3000 for UI, 3001 for API Gateway

### 📋 Communication Pattern Recommendation

**Hybrid Approach (based on old_code implementation):**

- **90% Direct API Calls**: Use Axios client for most operations
- **10% BFF Pattern**: Use Next.js API routes for auth/sensitive operations

This pattern:
- ✅ Matches existing `old_code` implementation
- ✅ Provides best performance
- ✅ Maintains security for sensitive operations
- ✅ Simplifies most API calls

### 🔧 Port Configuration Recommendation

- **UI Container**: Port 3000
- **API Gateway**: Port 3001
- **Microservices**: Ports 3002-3046

This provides:
- ✅ Clear separation of concerns
- ✅ Independent scaling
- ✅ Easy development setup
- ✅ Production deployment flexibility

## Related Documentation

- [Global Architecture](./global/Architecture.md) - System architecture
- [Infrastructure](./global/Infrastructure.md) - Infrastructure components
- [Technology Stack](./global/TechnologyStack.md) - Technologies used
- [Module Overview](./global/ModuleOverview.md) - Module purposes

