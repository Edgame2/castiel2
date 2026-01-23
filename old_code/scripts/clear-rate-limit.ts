#!/usr/bin/env tsx
/**
 * Clear rate limit for a specific user
 * Usage: pnpm exec tsx scripts/clear-rate-limit.ts [email]
 */
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const email = process.argv[2] || 'admin@admin.com';

// Create Redis client with the same config as the API
const redisConfig: any = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Add TLS if enabled
if (process.env.REDIS_TLS === 'true') {
  redisConfig.tls = {
    rejectUnauthorized: false,
  };
}

// Add password if provided
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

console.log(`Connecting to Redis at ${redisConfig.host}:${redisConfig.port}...`);

const redis = new Redis(redisConfig);

async function clearRateLimit() {
  try {
    await redis.ping();
    console.log('✅ Connected to Redis');

    // Pattern for rate limiting keys
    // The rate limiter uses format: rate-limit:login:{email}:{ip}
    const patterns = [
      `rate-limit:login:${email}:*`,
      `rate-limit:*:${email}:*`,
      `*${email}*`,
    ];

    let totalDeleted = 0;

    for (const pattern of patterns) {
      console.log(`\nSearching for pattern: ${pattern}`);
      
      // Scan for matching keys
      const stream = redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];
      
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (keys.length > 0) {
        console.log(`Found ${keys.length} keys:`);
        keys.forEach(key => console.log(`  - ${key}`));
        
        // Delete all found keys
        const deleted = await redis.del(...keys);
        console.log(`✅ Deleted ${deleted} keys`);
        totalDeleted += deleted;
      } else {
        console.log('No keys found for this pattern');
      }
    }

    if (totalDeleted === 0) {
      console.log('\n⚠️  No rate limit keys found. The rate limit might be stored differently or already expired.');
      console.log('\nAlternatively, you can flush all Redis data with:');
      console.log('  redis-cli FLUSHDB');
    } else {
      console.log(`\n✅ Successfully cleared rate limit for ${email}`);
      console.log(`Total keys deleted: ${totalDeleted}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

clearRateLimit()
  .then(() => {
    console.log('\n✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
