# Castiel UI

Next.js 16 web application for Castiel. Runs standalone (not in Docker Compose).

## Overview

The UI is a Next.js 16 application (App Router) that provides the frontend interface for Castiel. It communicates directly with the API Gateway via `NEXT_PUBLIC_API_BASE_URL`.

## Features

- **Next.js 16**: App Router, Server Components
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
- `NEXT_PUBLIC_API_BASE_URL`: API Gateway URL (required; e.g. http://localhost:3001). All API calls go directly from the browser to this URL.
- `NODE_ENV`: Environment (development/production)

### API Communication

All API calls go directly from the browser to the gateway. Set `NEXT_PUBLIC_API_BASE_URL` to the gateway URL. The gateway must allow CORS from the UI origin.

## Project Structure

```
ui/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (protected)/       # Protected routes
│   │   └── (public)/          # Public routes
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   ├── proxy.ts               # Route protection (auth redirect; Next.js proxy convention)
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

## Optional Docker Build

A Dockerfile is provided for optional containerized deployment. Build with:

```bash
docker build -t castiel-ui .
```

Pass `NEXT_PUBLIC_API_BASE_URL` as a build ARG if the app requires it at build time.

## Related Documentation

- [UI Container Architecture](../documentation/UI_CONTAINER_ARCHITECTURE.md)
- [Module Implementation Guide](../documentation/global/ModuleImplementationGuide.md)

