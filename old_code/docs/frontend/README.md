# 🎨 Castiel Frontend Documentation

> Enterprise-grade web application built with Next.js 16, React 19, and shadcn/ui.

---

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Authentication pages
│   │   │   ├── login/              # Login page
│   │   │   ├── register/           # Registration page
│   │   │   ├── forgot-password/    # Password recovery
│   │   │   ├── reset-password/     # Password reset
│   │   │   ├── verify-email/       # Email verification
│   │   │   └── mfa/                # MFA setup/challenge
│   │   ├── (protected)/            # Authenticated pages
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── shards/             # Shard management
│   │   │   ├── users/              # User management
│   │   │   ├── settings/           # User settings
│   │   │   └── admin/              # Admin console
│   │   ├── (public)/               # Public pages
│   │   │   ├── privacy/            # Privacy policy
│   │   │   └── terms/              # Terms of service
│   │   ├── api/                    # API routes (BFF)
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page
│   │
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── auth/                   # Auth components
│   │   ├── shards/                 # Shard components
│   │   ├── layout/                 # Layout components
│   │   └── common/                 # Shared components
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-auth.ts             # Authentication hook
│   │   ├── use-shards.ts           # Shard operations
│   │   ├── use-debounce.ts         # Debounce utility
│   │   └── ...
│   │
│   ├── lib/                        # Utilities & clients
│   │   ├── api/                    # API client functions
│   │   │   ├── auth.ts
│   │   │   ├── shards.ts
│   │   │   └── users.ts
│   │   ├── auth-utils.ts           # Auth token management
│   │   ├── utils.ts                # General utilities
│   │   └── query-client.ts         # React Query config
│   │
│   ├── types/                      # TypeScript definitions
│   │   ├── api.ts                  # API response types
│   │   ├── auth.ts                 # Auth types
│   │   └── shard.ts                # Shard types
│   │
│   ├── i18n/                       # Internationalization
│   │   ├── locales/
│   │   │   ├── en/                 # English translations
│   │   │   ├── fr/                 # French translations
│   │   │   ├── es/                 # Spanish translations
│   │   │   └── de/                 # German translations
│   │   └── config.ts               # i18n configuration
│   │
│   └── styles/                     # Global styles
│       └── globals.css             # TailwindCSS imports
│
├── public/                         # Static assets
│   ├── locales/                    # Translation JSON files
│   └── images/                     # Images & icons
│
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # TailwindCSS configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json
```

---

## 🔧 Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 16 | React framework with App Router |
| **UI Library** | React 19 | Component-based UI |
| **Styling** | TailwindCSS 4 | Utility-first CSS |
| **Components** | shadcn/ui | Headless UI components |
| **State** | TanStack Query | Server state management |
| **Forms** | React Hook Form | Form state management |
| **Validation** | Zod | Schema validation |
| **i18n** | react-i18next | Internationalization |
| **Icons** | Lucide React | Icon library |
| **Notifications** | Sonner | Toast notifications |
| **Tables** | TanStack Table | Data tables |
| **Monitoring** | App Insights | Telemetry & analytics |

---

## 🚀 Development

### Start Development Server

```bash
# From root directory
pnpm dev:web

# Or from apps/web
cd apps/web
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create `apps/web/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
NEXT_PUBLIC_AUTH_COOKIE_NAME=castiel_auth
NEXT_PUBLIC_REFRESH_COOKIE_NAME=castiel_refresh

# Feature Flags
NEXT_PUBLIC_ENABLE_MFA=true
NEXT_PUBLIC_ENABLE_SSO=true
NEXT_PUBLIC_ENABLE_MAGIC_LINK=true

# Analytics (optional)
NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING=...

# OAuth Providers (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=...
```

---

## 🎨 UI Components (shadcn/ui)

### Adding New Components

```bash
# Using the shadcn CLI
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

### Component Usage

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function MyComponent() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Input placeholder="Name" />
        <Button>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Available Components

All shadcn/ui components are available in `src/components/ui/`:

- **Layout**: `card`, `separator`, `tabs`, `collapsible`
- **Forms**: `button`, `input`, `select`, `checkbox`, `switch`, `form`
- **Feedback**: `dialog`, `popover`, `tooltip`, `progress`
- **Data**: `table`, `data-table`, `scroll-area`
- **Navigation**: `dropdown-menu`, `command` (⌘K palette)

---

## 🔐 Authentication

### Auth Flow

```
1. User visits protected page
2. AuthProvider checks for valid token
3. If no token → redirect to /login
4. If token expired → attempt refresh
5. If refresh fails → redirect to /login
6. If MFA required → redirect to /mfa/challenge
```

### Using Auth Hook

```tsx
import { useAuth } from '@/hooks/use-auth';

export function ProfilePage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return <Loading />;
  if (!user) return <Redirect to="/login" />;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
}
```

### Protected Routes

Use the `(protected)` route group for authenticated pages:

```
src/app/(protected)/
├── layout.tsx      # Checks auth, renders sidebar
├── dashboard/
│   └── page.tsx
└── settings/
    └── page.tsx
```

---

## 🌍 Internationalization (i18n)

### Supported Languages

- 🇺🇸 English (en) - Default
- 🇫🇷 French (fr)
- 🇪🇸 Spanish (es)
- 🇩🇪 German (de)

### Using Translations

```tsx
import { useTranslation } from 'react-i18next';

export function WelcomePage() {
  const { t } = useTranslation('common');

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.description')}</p>
    </div>
  );
}
```

### Adding Translations

1. Add keys to `public/locales/{lang}/common.json`:

```json
{
  "welcome": {
    "title": "Welcome to Castiel",
    "description": "Enterprise knowledge management"
  }
}
```

2. Use the translation hook in components.

---

## 📊 Data Fetching (TanStack Query)

### Fetching Data

```tsx
import { useShards } from '@/hooks/use-shards';

export function ShardList() {
  const { data, isLoading, error } = useShards({
    page: 1,
    limit: 20,
    status: 'active',
  });

  if (isLoading) return <ShardSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {data?.items.map((shard) => (
        <ShardItem key={shard.id} shard={shard} />
      ))}
    </ul>
  );
}
```

### Mutations

```tsx
import { useCreateShard } from '@/hooks/use-shards';

export function CreateShardForm() {
  const createShard = useCreateShard();

  const onSubmit = async (data) => {
    await createShard.mutateAsync(data);
    toast.success('Shard created!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
      <Button disabled={createShard.isPending}>
        {createShard.isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
```

---

## 📝 Forms (React Hook Form + Zod)

### Form Example

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export function UserForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
pnpm test:e2e

# Interactive mode
pnpm test:e2e:ui

# Headed mode (see browser)
pnpm test:e2e:headed
```

### Test Structure

```
apps/web/
├── src/
│   └── components/
│       └── button/
│           ├── button.tsx
│           └── button.test.tsx    # Unit test
└── tests/
    └── e2e/
        ├── auth.spec.ts           # Auth E2E tests
        └── shards.spec.ts         # Shard E2E tests
```

---

## 🏗️ Build & Deploy

### Production Build

```bash
# Build the application
pnpm build:web

# Start production server
cd apps/web
pnpm start
```

### Docker Build

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build application
COPY . .
RUN pnpm build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables for Production

```bash
# Required
NEXT_PUBLIC_API_URL=https://api.castiel.com
NEXT_PUBLIC_APP_URL=https://app.castiel.com

# Optional
NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING=...
```

---

## 🧱 Component Standards

> 📖 **Full Documentation:** [Component Standards Guide](../guides/component-standards.md)

### Widget-Compatible Components

All reusable components MUST be designed to work as both **standalone components** AND **dashboard widgets**. This ensures maximum reusability.

#### Standard Interface

```typescript
interface WidgetCompatibleProps<TData = unknown, TConfig = Record<string, unknown>> {
  data: TData;
  config?: TConfig;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  widgetContext?: WidgetContext;
  className?: string;
}
```

#### Component Folder Structure

```
src/components/
├── widgets/           # Widget-compatible components
│   ├── data-table/   # DataTable (shadcn)
│   ├── charts/       # Chart components
│   ├── counters/     # Counter/stat components
│   ├── lists/        # List components
│   ├── forms/        # Form components (Create/Edit/View)
│   ├── views/        # View components
│   └── search/       # Search components
├── dashboards/        # Dashboard-specific wrappers
└── ui/               # Base shadcn components
```

### DataTable Standard

**All tables MUST use shadcn/ui DataTable** with these required features:

| Feature | Required | Description |
|---------|----------|-------------|
| Sorting | ✅ Yes | Column header sorting |
| Filtering | ✅ Yes | Global and column filters |
| Pagination | ✅ Yes | Page size: 10, 20, 50, 100 |
| Column Visibility | ✅ Yes | Show/hide columns |
| Row Selection | ✅ Yes | Checkbox selection |
| Export | ✅ Yes | CSV and Excel export |

### Widget-Compatible Component Types

These component types MUST follow the widget-compatible pattern:

- ✅ **Data visualizations** - Charts, tables, lists
- ✅ **Activity feeds** - Timeline, notifications
- ✅ **Statistics** - Counters, gauges, stats cards
- ✅ **Task lists** - Todo, task tracker
- ✅ **Search** - Search box, results
- ✅ **Forms** - Create, Edit (via `WidgetFormProps`)
- ✅ **Views** - Detail view, card view

---

## 📚 Best Practices

### Component Guidelines

1. **Use Server Components by default** - Only use `'use client'` when needed
2. **Colocate files** - Keep tests and styles with components
3. **Use TypeScript strictly** - No `any` types
4. **Follow shadcn patterns** - Extend rather than modify base components
5. **Widget-compatible** - All reusable components must implement `WidgetCompatibleProps`

### Performance

1. **Use React Query for data** - Automatic caching and deduplication
2. **Lazy load heavy components** - Use `dynamic()` imports
3. **Optimize images** - Use Next.js `Image` component
4. **Minimize client-side JS** - Prefer Server Components

### Accessibility

1. **Use semantic HTML** - Proper heading hierarchy
2. **Add ARIA labels** - For interactive elements
3. **Support keyboard navigation** - All actions accessible
4. **Test with screen readers** - NVDA, VoiceOver

---

## 📊 Current Implementation Status

### Components Inventory

**Total Components:** 388 TypeScript React components

#### Component Categories

1. **AI Insights Components** (`apps/web/src/components/ai-insights/`) - ✅ 49 files
   - Chat interface, conversation management
   - Multimodal asset display/upload
   - Web search integration
   - Intent patterns editor
   - Prompts management
   - Vector search analytics

2. **Risk Analysis Components** (`apps/web/src/components/risk-analysis/`) - ✅ 12 files
   - Risk overview, details panel
   - Score breakdown, formula documentation
   - Assumption display, data quality warnings
   - Trust level badge, structured explanation
   - Risk timeline, mitigation panel

3. **Dashboard & Widget Components** (`apps/web/src/components/dashboards/`, `apps/web/src/components/widgets/`) - ✅ 50+ files
   - Widget container, library
   - Chart widgets (Bar, Pie, Line)
   - List widgets (Activity Feed, Generic List)
   - Counter widgets
   - Data table widgets

4. **Document Management Components** (`apps/web/src/components/documents/`) - ✅ 29 files
   - Upload components (drop zone, file row, batch settings)
   - Display components (card, data table, filter panel)
   - Collection management
   - Widget components (7 widgets)

5. **Shard Type Components** (`apps/web/src/components/shard-types/`) - ✅ 27 files
   - Schema builder, UI schema editor
   - Icon picker, color picker
   - Inheritance tree visualization
   - Form preview, card display

6. **Integration Components** (`apps/web/src/components/integrations/`) - ✅ 24 files
   - Integration management UI
   - Connection configuration
   - Sync task management

7. **Other Feature Components**
   - Content Generation (`content-generation/`) - ✅ 1 file
   - Collaborative Insights (`collaborative-insights/`) - ✅ 4 files
   - Notifications (`notifications/`) - ✅ 6 files
   - Webhooks (`webhooks/`) - ✅ 5 files
   - Quotas (`quotas/`) - ✅ 4 files
   - Simulation (`simulation/`) - ✅ 4 files
   - Benchmarks (`benchmarks/`) - ✅ 4 files
   - Early Warnings (`early-warnings/`) - ✅ 2 files
   - Manager Dashboard (`manager/`) - ✅ 6 files
   - Proactive Insights (`proactive-insights/`) - ✅ 1 file
   - Proactive Triggers (`proactive-triggers/`) - ✅ 1 file

8. **UI Primitives** (`apps/web/src/components/ui/`) - ✅ 40+ shadcn/ui components
   - All standard UI components (button, input, dialog, etc.)
   - Custom components (shard-picker, user-picker, date-range-picker)

9. **Layout Components** (`apps/web/src/components/layout/`)
   - Sidebar, top navigation
   - Language switcher, tenant switcher

10. **Form Components** (`apps/web/src/components/forms/`) - ✅ 5 files
    - Dynamic form builder
    - Form field components

### Missing Components

- ❌ ML Model Management UI - ML system not implemented
- ❌ Training Job Monitoring UI - ML system not implemented
- ❌ Advanced ML Feedback Visualization - ML system not implemented

---

## 🔍 Gap Analysis

### Critical Gaps

#### CRITICAL-1: Missing ML System UI Components
- **Severity:** Critical
- **Impact:** Product, Feature Completeness
- **Description:** ML system UI components not implemented:
  - Model management interface
  - Training job monitoring dashboard
  - Model evaluation visualization
  - Feature store UI
- **Missing Components:**
  - `apps/web/src/components/ml-models/` - ❌ Missing
  - `apps/web/src/components/training-jobs/` - ❌ Missing
  - `apps/web/src/components/model-evaluation/` - ❌ Missing
- **Blocks Production:** Yes - Features documented but UI unavailable

#### CRITICAL-2: Incomplete Assumption Display in Risk Analysis
- **Severity:** Critical
- **Impact:** User Trust, Data Quality
- **Description:** Risk analysis components have assumption display component but:
  - May not be consistently used across all risk views
  - Data quality warnings may not be displayed
  - Staleness indicators may be missing
- **Affected Components:**
  - `apps/web/src/components/risk-analysis/assumption-display.tsx` - Exists but may not be fully integrated
  - `apps/web/src/components/risk-analysis/data-quality-warnings.tsx` - Exists but may not be displayed
  - `apps/web/src/components/risk-analysis/risk-overview.tsx` - May not show assumptions
  - `apps/web/src/components/risk-analysis/risk-details-panel.tsx` - May not show assumptions
- **Code References:**
  - `apps/web/src/components/risk-analysis/assumption-display.tsx` - Component exists
  - `apps/web/src/components/risk-analysis/data-quality-warnings.tsx` - Component exists
- **Blocks Production:** Yes - Users cannot assess reliability of risk scores

### High Priority Gaps

#### HIGH-1: Missing Error Boundaries
- **Severity:** High
- **Impact:** User Experience, Stability
- **Description:** Some components may not have proper error boundaries:
  - AI chat interface may crash on errors
  - Risk analysis components may not handle API errors gracefully
- **Affected Components:**
  - `apps/web/src/components/ai-insights/error-handler.tsx` - Exists but may not be comprehensive
  - `apps/web/src/components/risk-analysis/error-display.tsx` - Exists but may not be used everywhere
- **Code References:**
  - Error handling components exist but may not be consistently used
- **Blocks Production:** No - But degrades user experience

#### HIGH-2: Missing Loading States
- **Severity:** High
- **Impact:** User Experience
- **Description:** Some components may not have proper loading states:
  - Long-running operations may not show progress
  - Data fetching may not show loading indicators
- **Affected Components:**
  - Various components may lack loading states
- **Code References:**
  - Need comprehensive loading state review
- **Blocks Production:** No - But degrades user experience

#### HIGH-3: API Contract Mismatches
- **Severity:** High
- **Impact:** User Experience, Stability
- **Description:** Potential mismatches between:
  - Frontend API client expectations
  - Backend API responses
  - Type definitions in shared-types
- **Affected Components:**
  - API client in `apps/web/src/lib/api/`
  - All components using API hooks
- **Code References:**
  - `apps/web/src/lib/api/` - API client files
  - `apps/web/src/hooks/` - API hooks
- **Blocks Production:** No - But causes runtime errors

### Medium Priority Gaps

#### MEDIUM-1: Missing Accessibility Features
- **Severity:** Medium
- **Impact:** Accessibility, Compliance
- **Description:** Some components may lack:
  - ARIA labels
  - Keyboard navigation
  - Screen reader support
- **Affected Components:**
  - Various components may need accessibility improvements
- **Code References:**
  - Need accessibility audit
- **Blocks Production:** No - But accessibility concern

#### MEDIUM-2: Missing Responsive Design
- **Severity:** Medium
- **Impact:** Mobile User Experience
- **Description:** Some components may not be fully responsive:
  - Complex tables may not work well on mobile
  - Some modals may not be mobile-friendly
- **Affected Components:**
  - Data tables
  - Complex forms
  - Modals
- **Code References:**
  - Need responsive design review
- **Blocks Production:** No - But mobile experience concern

#### MEDIUM-3: Missing Test Coverage
- **Severity:** Medium
- **Impact:** Quality, Reliability
- **Description:**
  - Limited component test coverage
  - Missing E2E tests for critical flows
- **Affected Components:**
  - Most components lack tests
- **Code References:**
  - `apps/web/src/components/ui/__tests__/` - Limited test files
- **Blocks Production:** No - But reduces confidence

### Performance Gaps

#### MEDIUM-4: Potential Performance Issues
- **Severity:** Medium
- **Impact:** User Experience, Scalability
- **Description:**
  - Large component files may impact bundle size
  - No code splitting documented
  - Potential re-render issues
- **Affected Components:**
  - Large components may need optimization
- **Code References:**
  - Need performance audit
- **Blocks Production:** No - But may impact scalability

---

## 🔗 Related Documentation

- [Component Standards](../guides/component-standards.md) - **Widget-compatible component patterns**
- [Dashboard System](../features/dashboard/README.md) - Dashboard and widget documentation
- [Architecture](../ARCHITECTURE.md) - System architecture
- [API Reference](../backend/API.md) - Backend API documentation
- [Shards System](../shards/README.md) - Shards documentation
- [shadcn/ui](https://ui.shadcn.com/) - Component library docs
- [Next.js](https://nextjs.org/docs) - Framework documentation

