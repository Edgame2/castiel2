# Docker Setup Guide

This guide explains how to run the Castiel system using Docker containers.

## Architecture

The system is containerized with:
- **PostgreSQL Database Container**: Handles all data persistence
- **API Server Container**: Fastify backend API server

The Electron desktop application runs natively (not containerized) and connects to the API server.

## Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- Node.js 18+ (for running the Electron app locally)

## Quick Start

### 1. Environment Configuration

Create a `.env` file in the root directory (optional, for overriding defaults):

```env
# JWT Secret (REQUIRED in production)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**Important**: The default `JWT_SECRET` in docker-compose.yml is for development only. Change it in production!

### 2. Start Services

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f api
docker compose logs -f postgres
```

**Note**: This guide uses `docker compose` (v2 syntax). If you're using Docker Compose v1, replace `docker compose` with `docker-compose`.

### 3. Initialize Database

The API server automatically runs migrations on startup. However, if you need to seed the database:

```bash
# Run database seed
docker-compose exec api npx tsx src/database/seed.ts
```

### 4. Verify Services

```bash
# Check service status
docker-compose ps

# Test API health endpoint
curl http://localhost:3000/health

# Test database connection
docker-compose exec postgres psql -U coder -d castiel -c "SELECT 1;"
```

### 5. Start Electron App

In a separate terminal (outside Docker):

```bash
# Make sure API_URL points to Docker service
echo "API_URL=http://localhost:3000" > .env

# Start Electron app
npm start
```

## Service Details

### PostgreSQL Database

- **Container**: `coder-postgres`
- **Port**: `5432` (exposed to host)
- **Database**: `castiel`
- **User**: `coder`
- **Password**: `coder_password` (change in production!)
- **Data Volume**: `postgres_data` (persists data between restarts)

**Connection String** (from API container):
```
AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;
```

### API Server

- **Container**: `coder-api`
- **Port**: `3000` (exposed to host)
- **Health Check**: `http://localhost:3000/health`
- **Auto-migrations**: Runs `prisma migrate deploy` on startup

## Development Workflow

### Rebuild After Code Changes

```bash
# Rebuild API server
docker-compose build api

# Restart services
docker-compose up -d
```

### Database Migrations

Migrations run automatically on container start. For manual migration:

```bash
# Run migrations
docker-compose exec api npx prisma migrate deploy

# Generate Prisma client
docker-compose exec api npx prisma generate
```

### Database Access

```bash
# Connect to database
docker-compose exec postgres psql -U coder -d castiel

# Prisma Studio (database GUI)
docker-compose exec api npx prisma studio
# Then access at http://localhost:5555 (if port is exposed)
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 api
```

## Production Considerations

### Security

1. **Change Default Passwords**:
   - Update `POSTGRES_PASSWORD` in `docker-compose.yml`
   - Update `JWT_SECRET` in `.env` file
   - Use strong, random values

2. **Environment Variables**:
   - Use Docker secrets or environment variable files
   - Never commit `.env` files to version control
   - Use different credentials for production

3. **Network Security**:
   - Don't expose database port (5432) in production
   - Use Docker networks for internal communication
   - Configure firewall rules

### Performance

1. **Resource Limits**:
   Add to `docker-compose.yml`:
   ```yaml
   services:
     api:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
           reservations:
             cpus: '1'
             memory: 1G
   ```

2. **Database Optimization**:
   - Configure PostgreSQL shared_buffers, work_mem, etc.
   - Use connection pooling
   - Monitor query performance

### Data Persistence

Database data is stored in a Docker volume (`postgres_data`). To backup:

```bash
# Backup database
docker-compose exec postgres pg_dump -U coder castiel > backup.sql

# Restore database
docker-compose exec -T postgres psql -U coder castiel < backup.sql
```

## Troubleshooting

### Services Won't Start

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

### Database Connection Issues

```bash
# Verify database is healthy
docker-compose exec postgres pg_isready -U coder

# Check database logs
docker-compose logs postgres

# Test connection from API container
docker-compose exec api node -e "console.log(process.env.DATABASE_URL)"
```

### Port Already in Use

If port 3000 or 5432 is already in use:

1. Stop conflicting services, or
2. Change ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3000"  # API on host port 3001
     - "5433:5432"  # Postgres on host port 5433
   ```

### Docker DNS Resolution Issues

If you encounter DNS resolution errors during build:

1. **Configure Docker Daemon DNS** (Recommended - Requires sudo):
   ```bash
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json << EOF
   {
     "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
   }
   EOF
   sudo systemctl restart docker
   ```

2. **Use BuildKit with Host Network**:
   ```bash
   DOCKER_BUILDKIT=1 docker build --network=host -t test-build ./server
   ```

3. **Pre-pull Base Image**:
   ```bash
   docker pull node:20-alpine
   docker compose build --no-cache
   ```

For more DNS troubleshooting, see the DNS Fix section below.

### Prisma/OpenSSL Issues

If the API container fails to start due to Prisma engine errors:

The Dockerfile should include OpenSSL libraries:
```dockerfile
RUN apk add --no-cache openssl openssl-dev libc6-compat
```

Verify the Dockerfile includes this in both builder and runner stages.

### Reset Everything

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data!)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# View running containers
docker-compose ps

# Execute command in container
docker-compose exec api <command>
docker-compose exec postgres <command>

# Rebuild specific service
docker-compose build api

# Pull latest images
docker-compose pull

# View resource usage
docker stats
```

## Network Architecture

```
┌─────────────────┐
│  Electron App   │ (runs on host)
│  (localhost)    │
└────────┬────────┘
         │ HTTP
         │ localhost:3000
         ▼
┌─────────────────┐
│   API Server    │ (Docker container)
│   Port: 3000    │
└────────┬────────┘
         │ PostgreSQL
         │ postgres:5432
         ▼
┌─────────────────┐
│   PostgreSQL    │ (Docker container)
│   Port: 5432    │
└─────────────────┘
```

## Next Steps

1. Configure Google OAuth credentials (if needed) - see [Google OAuth Setup Guide](./google-oauth-setup.md)
2. Update JWT_SECRET and database passwords
3. Start services: `docker-compose up -d`
4. Run Electron app: `npm start`
5. Access application and verify connectivity

## Related Documentation

- [Setup Guide](./setup-guide.md) - Manual setup instructions
- [Google OAuth Setup Guide](./google-oauth-setup.md) - OAuth configuration
- [Global Architecture](../global/Architecture.md) - System architecture
- [Deployment Documentation](../global/Deployment.md) - Production deployment
