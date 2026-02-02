/**
 * Account Service
 * 
 * Creates Account records for users (for project ownership, etc.)
 * Uses direct database access since we have shared database
 */

import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';

export class AccountService {
  /**
   * Create account for a user
   * 
   * @param userId - User ID
   * @param username - Username (handle)
   * @param displayName - Display name
   * @param avatarUrl - Optional avatar URL
   * @param bio - Optional bio
   * @returns Promise resolving to created account or null if failed
   */
  async createUserAccount(
    userId: string,
    username: string,
    displayName: string,
    avatarUrl?: string,
    bio?: string
  ): Promise<any | null> {
    const db = getDatabaseClient() as any;
    
    try {
      // Check if account already exists
      const existing = await db.account.findUnique({
        where: { userId },
      });
      
      if (existing) {
        return existing;
      }
      
      // Check if handle is already taken
      const handleTaken = await db.account.findUnique({
        where: { handle: username },
      });
      
      if (handleTaken) {
        log.warn('Account handle already taken', { userId, username, service: 'auth' });
        return null; // Non-fatal - account can be created later with different handle
      }
      
      const account = await db.account.create({
        data: {
          type: 'user',
          handle: username,
          displayName,
          avatarUrl,
          bio,
          userId,
        },
      });

      log.info('Account created for user', { userId, accountId: account.id, service: 'auth' });
      return account;
    } catch (error: any) {
      // Non-fatal - account creation failure shouldn't break user registration
      log.warn('Failed to create account for user', { error, userId, username, service: 'auth' });
      return null;
    }
  }
}

// Singleton instance
let accountServiceInstance: AccountService | null = null;

export function getAccountService(): AccountService {
  if (!accountServiceInstance) {
    accountServiceInstance = new AccountService();
  }
  return accountServiceInstance;
}



