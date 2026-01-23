# Environment Variables Template

Copy this content to create your `.env` file. **NEVER commit `.env` to version control.**

```bash
# ============================================
# Coder IDE Enterprise - Environment Variables
# ============================================

# ============================================
# Cosmos DB Configuration
# ============================================
COSMOS_DB_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-primary-key
COSMOS_DB_DATABASE_ID=castiel

# ============================================
# Redis Configuration
# ============================================
REDIS_URL=redis://localhost:6379
# For Redis Sentinel (production):
# REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26379
# REDIS_MASTER_NAME=mymaster

# ============================================
# RabbitMQ Configuration
# ============================================
RABBITMQ_URL=amqp://guest:guest@localhost:5672
# Production format:
# RABBITMQ_URL=amqp://username:password@rabbitmq-host:5672

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# ============================================
# Service URLs (Inter-Service Communication)
# ============================================
# Development (local):
AUTH_SERVICE_URL=http://localhost:3021
USER_MANAGEMENT_URL=http://localhost:3022
LOGGING_URL=http://localhost:3014
NOTIFICATION_MANAGER_URL=http://localhost:3001
SECRET_MANAGEMENT_URL=http://localhost:3003

# Production format:
# AUTH_SERVICE_URL=https://auth-service.your-domain.com
# USER_MANAGEMENT_URL=https://user-management.your-domain.com

# ============================================
# Service Authentication
# ============================================
# Token for service-to-service authentication
SERVICE_AUTH_TOKEN=your-service-auth-token

# ============================================
# OAuth Providers (Optional)
# ============================================
GOOGLE_OAUTH_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

GITHUB_OAUTH_ENABLED=false
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=

# ============================================
# SSO/SAML (Optional)
# ============================================
SSO_ENABLED=false
SAML_ENABLED=false

# ============================================
# Application URLs
# ============================================
MAIN_APP_URL=http://localhost:3000
BASE_URL=http://localhost:3001

# ============================================
# Feature Flags
# ============================================
FEATURE_OAUTH_GOOGLE=true
FEATURE_OAUTH_GITHUB=true
FEATURE_SAML_SSO=false
FEATURE_PASSWORD_RESET=true
FEATURE_EMAIL_VERIFICATION=true
FEATURE_MFA=false

# ============================================
# Security Settings
# ============================================
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MS=900000
REQUIRE_EMAIL_VERIFICATION=true
MAX_SESSIONS_PER_USER=10
SESSION_TIMEOUT=86400000

# ============================================
# Password Policy
# ============================================
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=false
PASSWORD_HISTORY_COUNT=5
PASSWORD_MAX_AGE_DAYS=90

# ============================================
# Node Environment
# ============================================
NODE_ENV=development
PORT=3001

# ============================================
# Logging
# ============================================
LOG_LEVEL=info
# Options: error, warn, info, debug
```

## Usage

1. Copy this template to `.env` in the project root
2. Fill in your actual values
3. For each container, create `.env` files as needed
4. **Never commit `.env` files** (they're in `.gitignore`)

