# UI Container

Next.js 16 web application for Castiel.

## Overview

The UI Container is a Next.js 16 application (App Router) that provides the frontend interface for Castiel. It communicates with backend microservices through the API Gateway.

## Features

- **Next.js 16**: App Router, Server Components, API Routes
- **React 19**: Latest React features
- **TypeScript**: Full type safety
- **Shadcn UI**: Component library
- **Tailwind CSS**: Styling
- **TanStack Query**: Data fetching and caching
- **React Hook Form + Zod**: Form handling and validation
- **i18next**: Internationalization

## Quick Start

### Prerequisites

- Node.js 20+
- API Gateway URL (configurable via `NEXT_PUBLIC_API_BASE_URL`; defaults for local dev only)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NEXT_PUBLIC_API_BASE_URL`: API Gateway URL (default: http://localhost:3001)
- `NODE_ENV`: Environment (development/production)

### API Communication

The UI communicates with backend services through:
- **Direct API calls** (90%): Axios client to API Gateway
- **BFF pattern** (10%): Next.js API routes for sensitive operations

## Project Structure

```
containers/ui/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (protected)/       # Protected routes
│   │   ├── (public)/          # Public routes
│   │   └── api/               # API routes (BFF)
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   ├── contexts/              # React contexts
│   ├── types/                 # TypeScript types
│   └── locales/              # i18n translations
├── public/                    # Static assets
├── Dockerfile
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Port

**3000** (configurable via `PORT` environment variable)

## Dependencies

- **API Gateway**: URL set via `NEXT_PUBLIC_API_BASE_URL` (required for API calls)
- **Backend Services**: Accessed via API Gateway

## Related Documentation

- [UI Container Architecture](../../documentation/UI_CONTAINER_ARCHITECTURE.md)
- [Module Implementation Guide](../../documentation/global/ModuleImplementationGuide.md)

