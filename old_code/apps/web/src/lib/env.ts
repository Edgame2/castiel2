// Environment configuration with validation
const requiredEnvVars = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  NEXT_PUBLIC_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || '',
  NEXT_PUBLIC_OAUTH_REDIRECT_URI: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || '',
  NEXT_PUBLIC_OAUTH_SCOPE: process.env.NEXT_PUBLIC_OAUTH_SCOPE || '',
}

const optionalEnvVars = {
  NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING:
    process.env.NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING,
  NEXT_PUBLIC_APP_INSIGHTS_INSTRUMENTATION_KEY:
    process.env.NEXT_PUBLIC_APP_INSIGHTS_INSTRUMENTATION_KEY,
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
}

// Validate required environment variables (only in production)
// In development, we provide sensible defaults
if (process.env.NODE_ENV === 'production') {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.map((v) => `- ${v}`).join('\n')}`
    )
  }
}

export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

export type Env = typeof env
