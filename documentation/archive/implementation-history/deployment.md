# Deployment Guide

This guide covers deploying the User Management System to production.

## Prerequisites

- PostgreSQL 14+ database
- Redis 6+ instance
- Node.js 18+ runtime
- Environment variables configured
- SSL certificates (for HTTPS)

## Environment Setup

### Required Environment Variables

See [Environment Variables](../../server/ENVIRONMENT_VARIABLES.md) for complete list.

**Critical Variables:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
APP_URL=https://your-domain.com
NODE_ENV=production
```

### Optional Environment Variables

```bash
# Email
EMAIL_PROVIDER=sendgrid  # or 'ses'
SENDGRID_API_KEY=your-key
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# S3 (for audit logs)
AWS_S3_BUCKET=your-bucket
AWS_S3_REGION=us-east-1

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE coder_production;
CREATE USER coder_user WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE coder_production TO coder_user;
```

### 2. Run Migrations

```bash
cd server
npm run db:migrate
```

### 3. Seed System Permissions

```bash
npm run db:seed
```

This creates:
- All system permissions
- System roles for each organization (created automatically)

### 4. Create Indexes

Indexes are created automatically by Prisma migrations, but verify:

```sql
-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('users', 'organizations', 'roles', 'permissions', 'organization_memberships');
```

## Redis Setup

### Standalone Redis

```bash
# Install Redis
sudo apt-get install redis-server

# Configure
sudo nano /etc/redis/redis.conf

# Set:
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Redis Cluster (Production)

For high availability, use Redis Cluster:

```bash
# Configure cluster nodes
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

### Connection Pooling

Update `REDIS_URL` to include connection pool settings:

```
redis://host:6379?maxRetriesPerRequest=3&retryStrategy=exponential
```

## Application Deployment

### 1. Build Application

```bash
cd server
npm install
npm run build
```

### 2. Start Application

**Using PM2 (Recommended):**

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name coder-api

# Save PM2 configuration
pm2 save
pm2 startup
```

**Using systemd:**

```ini
# /etc/systemd/system/coder-api.service
[Unit]
Description=Coder API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=coder
WorkingDirectory=/opt/coder/server
Environment=NODE_ENV=production
EnvironmentFile=/opt/coder/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable coder-api
sudo systemctl start coder-api
```

### 3. Background Workers

Start Bull queue workers:

```bash
# Email processor
pm2 start dist/jobs/emailProcessor.js --name coder-email-worker

# Audit archive processor
pm2 start dist/jobs/auditArchiveProcessor.js --name coder-audit-worker
```

## Reverse Proxy (Nginx)

### Nginx Configuration

```nginx
upstream coder_api {
    server 127.0.0.1:8080;  # Default API port
    keepalive 64;
}

server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;
    client_body_timeout 60s;

    location / {
        proxy_pass http://coder_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Health check endpoints (no logging for monitoring)
    location ~ ^/health(/.*)?$ {
        proxy_pass http://coder_api;
        access_log off;
        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;
    }
}
```

## Database Connection Pooling

### Prisma Connection Pool

Update `DATABASE_URL` with connection pool settings:

```
postgresql://user:password@host:5432/database?connection_limit=20&pool_timeout=10
```

### Connection Pool Size

Recommended settings:
- **Development**: 5-10 connections
- **Production**: 20-50 connections (depending on load)

Monitor with:

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'coder_production';
```

## Monitoring

### Health Checks

The application provides comprehensive health check endpoints:

```bash
# Basic health check (database + Redis)
curl https://api.your-domain.com/health

# Database health check with response time
curl https://api.your-domain.com/health/db

# Redis health check with response time
curl https://api.your-domain.com/health/redis

# Queue health check (email + audit archive queues)
curl https://api.your-domain.com/health/queues
```

**Health Check Response Examples:**

```json
// GET /health
{
  "status": "healthy",
  "timestamp": "2026-01-16T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}

// GET /health/db
{
  "status": "healthy",
  "service": "database",
  "responseTime": "5ms",
  "timestamp": "2026-01-16T12:00:00.000Z"
}

// GET /health/queues
{
  "status": "healthy",
  "service": "queues",
  "queues": {
    "email": "healthy",
    "auditArchive": "healthy"
  },
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

**HTTP Status Codes:**
- `200`: All services healthy
- `503`: One or more services unhealthy (Service Unavailable)

**Kubernetes Probes:**

```yaml
# Liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Readiness probe
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2

# Startup probe (for slow-starting apps)
startupProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 30  # Allow up to 5 minutes to start
```

**Load Balancer Health Checks:**

For AWS ALB/ELB:
- Health check path: `/health`
- Healthy threshold: 2
- Unhealthy threshold: 3
- Timeout: 5 seconds
- Interval: 30 seconds

### Logging

**Structured Logging:**

Logs are written to:
- Console (stdout/stderr)
- Files (if configured)
- External logging service (if configured)

**Log Levels:**
- `error`: Errors that need attention
- `warn`: Warnings
- `info`: General information
- `debug`: Debug information (development only)

### Metrics

**Prometheus Metrics:**

Metrics are automatically exposed at `/metrics`:

```bash
# Scrape metrics endpoint
curl https://api.your-domain.com/metrics
```

**Prometheus Configuration:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'coder-api'
    scrape_interval: 15s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api.your-domain.com:443']
    scheme: https
    tls_config:
      insecure_skip_verify: false
```

**Key Metrics:**
- HTTP request duration
- HTTP request count
- Database query duration
- Redis operation duration
- Queue job duration
- Active sessions
- User logins

## Backup Strategy

### Database Backups

**Automated Backups:**

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U coder_user coder_production | gzip > /backups/db_$DATE.sql.gz

# Keep last 30 days
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

**Schedule with cron:**

```cron
0 2 * * * /opt/coder/scripts/backup-db.sh
```

### Redis Backups

Redis persistence is configured via `redis.conf`:

```conf
save 900 1      # Save after 900s if at least 1 key changed
save 300 10     # Save after 300s if at least 10 keys changed
save 60 10000   # Save after 60s if at least 10000 keys changed
```

### Audit Log Archival

Audit logs older than 90 days are automatically archived to S3:

- Configured via `auditArchiveProcessor`
- Runs daily via cron job
- Archived logs are immutable

## Security

### SSL/TLS

- Use TLS 1.2+ only
- Enable HSTS headers
- Use strong cipher suites
- Regular certificate renewal

### Firewall

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Rate Limiting

Configure rate limiting:

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Secrets Management

- Never commit secrets to version control
- Use environment variables or secret management service
- Rotate secrets regularly
- Use different secrets for each environment

## Scaling

### Horizontal Scaling

**Load Balancer:**

Use a load balancer (AWS ALB, Nginx, HAProxy) to distribute traffic:

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐      ┌─────▼─────┐
   │ API #1  │       │  API #2   │      │  API #3   │
   └────┬────┘       └─────┬─────┘      └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼───────┐
                    │  PostgreSQL  │
                    │  (Primary)   │
                    └──────────────┘
```

**Stateless API:**

The API is stateless:
- JWT tokens (no server-side session storage)
- Redis for caching (shared across instances)
- Database for persistence

### Vertical Scaling

**Database:**

- Use read replicas for read-heavy workloads
- Connection pooling
- Query optimization
- Index optimization

**Redis:**

- Redis Cluster for high availability
- Memory optimization
- Persistence configuration

## Zero-Downtime Deployment

### Strategy

1. **Blue-Green Deployment:**
   - Deploy new version to "green" environment
   - Switch traffic from "blue" to "green"
   - Keep "blue" running for rollback

2. **Rolling Deployment:**
   - Deploy to one instance at a time
   - Health check before moving to next
   - Rollback if health check fails

### Database Migrations

**Safe Migration Process:**

1. Deploy application code (backward compatible)
2. Run database migrations
3. Deploy new application code (uses new schema)
4. Monitor for issues
5. Rollback if needed

**Migration Rollback:**

```bash
# Rollback last migration
npm run db:migrate:rollback

# Rollback to specific migration
npm run db:migrate:rollback -- --to MIGRATION_NAME
```

## Troubleshooting

### Application Won't Start

1. Check environment variables
2. Verify database connection
3. Check Redis connection
4. Review application logs
5. Verify port availability

### Database Connection Issues

1. Check database is running
2. Verify connection string
3. Check firewall rules
4. Verify user permissions
5. Check connection pool limits

### Redis Connection Issues

1. Check Redis is running
2. Verify Redis URL
3. Check firewall rules
4. Verify memory limits
5. Check Redis logs

### Performance Issues

1. Check database query performance
2. Monitor Redis cache hit rate
3. Review application logs
4. Check system resources (CPU, memory)
5. Review slow query logs

## Maintenance

### Regular Tasks

- **Daily**: Monitor logs, check health endpoints
- **Weekly**: Review audit logs, check backups
- **Monthly**: Review performance metrics, optimize queries
- **Quarterly**: Security audit, dependency updates

### Updates

1. Test in staging environment
2. Review changelog
3. Backup database
4. Deploy update
5. Monitor for issues
6. Rollback if needed

## Support

For deployment issues:
- Check logs: `pm2 logs` or `journalctl -u coder-api`
- Review documentation
- Contact support: dev-support@coder.com
