# Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ database
- Google OAuth 2.0 credentials (for authentication)

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Database Setup

1. Create a PostgreSQL database:
```bash
createdb coder_ide
```

2. Configure database connection in `server/.env`:
```env
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;
```

3. Generate Prisma client and run migrations:
```bash
cd server
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 3. Environment Configuration

Copy the example environment file and configure it:
```bash
cd server
cp .env.example .env
```

Then edit `server/.env` file with your values:
```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080

# Database Configuration
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Create root `.env` file (for Electron):
```env
API_URL=http://localhost:3000
```

### 4. Google OAuth Setup

See [Google OAuth Setup Guide](./google-oauth-setup.md) for detailed instructions.

Quick steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Client Secret to `server/.env`

### 5. Start the Application

**Terminal 1 - Start API Server:**
```bash
cd server
npm run dev
```

The server will start on `http://localhost:3000`

**Terminal 2 - Start Electron App:**
```bash
npm start
```

## Application Flow

1. **Login**: User authenticates with Google OAuth
2. **Project Selection**: User selects or creates a project
3. **Main Interface**: User accesses all features through the ActivityBar

## Features

### Project Management
- Create and manage projects
- Team-based project organization
- Project access control

### Task Management
- Global task repository
- Task assignments and dependencies
- Task lifecycle management

### Roadmap Management
- Multi-level hierarchy (Milestones → Epics → Stories)
- Roadmap dependencies
- Roadmap visualization

### Module Management
- Automatic module detection
- Submodule organization
- Module quality analysis

### Application Context
- Business context definition
- Technical context (tech stack, architecture)
- Regulatory compliance context
- Team context

### Issue Anticipation
- Proactive issue detection
- Context-aware prioritization
- Issue resolution workflow

### User Features
- Personalized task recommendations
- User analytics
- Competency management
- Profile editing

## API Endpoints

All API endpoints are prefixed with `/api`:

- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/projects/*` - Project management
- `/api/tasks/*` - Task management
- `/api/teams/*` - Team management
- `/api/roadmaps/*` - Roadmap management
- `/api/modules/*` - Module management
- `/api/projects/:id/application-profile` - Application context
- `/api/projects/:id/issues/*` - Issue management
- `/api/environments/*` - Environment management
- `/api/roles/*` - Role and permission management

## Development

### Database Migrations

```bash
cd server
npm run db:migrate
```

### Database Studio (Prisma)

```bash
cd server
npm run db:studio
```

### Database Seeding

```bash
cd server
npm run db:seed
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `server/.env`
3. Ensure database exists: `psql -l | grep coder_ide`

### OAuth Issues

1. Verify Google OAuth credentials in `server/.env`
2. Check redirect URI matches Google Cloud Console
3. Ensure Google+ API is enabled
4. See [Google OAuth Setup Guide](./google-oauth-setup.md) for detailed troubleshooting

### API Connection Issues

1. Verify API server is running on port 3000
2. Check API_URL in root `.env`
3. Verify CORS settings in `server/src/server.ts`

## Architecture

- **Electron Client**: Desktop application (`src/renderer/`, `src/main/`)
- **Fastify API Server**: Backend API (`server/src/`)
- **PostgreSQL Database**: Data persistence (`server/database/`)

For detailed architecture information, see [Global Architecture Documentation](../global/Architecture.md).

## Docker Setup

For containerized deployment, see [Docker Setup Guide](./docker-setup.md).

## Security Notes

- Change `JWT_SECRET` in production
- Use strong database passwords
- Configure CORS properly for production
- Use HTTPS in production
- Store sensitive credentials securely

## Related Documentation

- [Docker Setup Guide](./docker-setup.md) - Containerized deployment
- [Google OAuth Setup Guide](./google-oauth-setup.md) - OAuth configuration
- [Getting Started Guide](./getting-started.md) - User guide
- [Admin Guide](./admin-guide.md) - Administration features
- [Global Architecture](../global/Architecture.md) - System architecture
