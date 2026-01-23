/**
 * Cache Key Utilities
 * 
 * Centralized cache key generation for consistency
 */

export const cacheKeys = {
  sessionData: (sessionId: string): string => `session:${sessionId}`,
  sessionBlacklist: (sessionId: string): string => `session:blacklist:${sessionId}`,
  sessionActivity: (sessionId: string): string => `session:activity:${sessionId}`,
  userSessions: (userId: string): string => `user:sessions:${userId}`,
  loginAttempts: (identifier: string): string => `login:attempts:${identifier}`,
  passwordReset: (token: string): string => `password:reset:${token}`,
  emailVerification: (token: string): string => `email:verification:${token}`,
};
