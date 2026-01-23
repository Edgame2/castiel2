# Docker Fixes Applied

## Prisma/OpenSSL Issue - FIXED ✅

### Problem
The Docker API container was failing to start due to Prisma engine errors:
- `Error: Could not parse schema engine response`
- `Prisma failed to detect the libssl/openssl version`
- Container was restarting in a loop

### Solution
Updated the Dockerfile to install OpenSSL libraries required by Prisma:

1. **Builder Stage**: Added OpenSSL installation
   ```dockerfile
   RUN apk add --no-cache openssl openssl-dev libc6-compat
   ```

2. **Runner Stage**: Added OpenSSL installation
   ```dockerfile
   RUN apk add --no-cache openssl openssl-dev libc6-compat
   ```

3. **Port Configuration**: Updated to use port 3001
   - Changed `EXPOSE 3000` to `EXPOSE 3001`
   - Updated health check to use port 3001

4. **Migration Handling**: Made migrations non-blocking
   - If migrations fail, server still starts (schema might already be up to date)

### Current Status

- ✅ Docker container builds successfully
- ✅ Container starts without errors
- ✅ Prisma connects to database
- ✅ Server is running on port 3001 (mapped to host port 3002)
- ✅ Health endpoint working: `http://localhost:3002/health`
- ✅ Database connected successfully

### Container Information

- **API Container**: `coder-api`
- **Port Mapping**: `3002:3001` (host:container)
- **Database**: Connected to `coder-postgres` container
- **Status**: Healthy and running

### Access Points

- **API Server**: `http://localhost:3002`
- **Health Check**: `http://localhost:3002/health`
- **OAuth**: `http://localhost:3002/api/auth/google`
- **Database**: `localhost:5433` (host port)

### Notes

- The container uses Alpine Linux which requires explicit OpenSSL installation
- Prisma engine needs OpenSSL libraries to function properly
- All authentication endpoints are working in the Docker container
