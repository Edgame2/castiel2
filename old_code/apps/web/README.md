# Castiel Web

Enterprise-grade Next.js web application for the Castiel B2B SaaS platform.

## 🚀 Quick Start

```bash
# From workspace root
pnpm dev:web

# Or from this directory
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI Library:** shadcn/ui
- **Styling:** Tailwind CSS 4
- **State:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **i18n:** react-i18next (4 languages)
- **Testing:** Vitest + Playwright
- **Monitoring:** Azure Application Insights

## 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint errors
pnpm typecheck        # Check TypeScript types
pnpm format           # Format code with Prettier

# Testing
pnpm test             # Run unit tests (watch mode)
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Run tests with UI
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run E2E tests
pnpm test:e2e:ui      # Run E2E tests with UI
```

## 🏗️ Project Structure

```
apps/web/
├── src/
│   ├── app/                      # Next.js app routes
│   │   ├── (auth)/              # Authentication routes
│   │   ├── (protected)/         # Protected routes
│   │   ├── (public)/            # Public routes
│   │   ├── api/                 # API routes (BFF)
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   ├── ui/                  # shadcn/ui components
│   │   └── ...                  # Feature components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   ├── api/                 # API client
│   │   ├── auth-utils.ts        # Auth utilities
│   │   └── utils.ts             # General utilities
│   ├── types/                   # TypeScript types
│   └── i18n/                    # Internationalization
├── public/                      # Static assets
├── tests/                       # Test files
└── e2e/                         # Playwright E2E tests
```

## 🔐 Authentication

OAuth 2.0 authentication flow handled by the API:

1. User clicks login
2. Redirected to API OAuth authorization endpoint
3. After successful auth, callback receives tokens
4. Tokens stored in httpOnly cookies
5. Middleware protects routes

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🌍 Internationalization

Currently supports 2 languages with react-i18next:

- 🇬🇧 English (en)
- 🇷 French (fr)

Locale JSON files live in `src/locales/{language}/` and are wired through the `I18nProvider` client component.

## 🧪 Testing

### Unit Tests (Vitest)

```bash
pnpm test           # Watch mode
pnpm test:coverage  # Coverage report
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e       # Run all E2E tests
pnpm test:e2e:ui    # Run with UI
```

## 📈 Monitoring

Azure Application Insights integration:

- ✅ Automatic page view tracking
- ✅ Exception tracking
- ✅ Custom event tracking
- ✅ Performance metrics

**Setup:**
```env
NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING=your-connection-string
```

## 🎨 UI Components

shadcn/ui components available in `src/components/ui/`:

- Button, Input, Label, Form
- Card, Badge, Avatar, Separator
- Select, Dialog, Dropdown Menu
- Table, Tabs, Popover
- Toast (Sonner)

**Usage:**
```typescript
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}
```

## 🔧 Configuration Files

- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint rules
- `tailwind.config.ts` - Tailwind CSS
- `components.json` - shadcn/ui configuration
- `vitest.config.ts` - Unit test configuration
- `playwright.config.ts` - E2E test configuration

## 📚 Documentation

See `/docs/frontend/` for detailed documentation.

## 📄 License

Proprietary - Castiel Team
