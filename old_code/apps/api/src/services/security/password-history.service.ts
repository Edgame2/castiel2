import * as argon2 from 'argon2';
import type { IMonitoringProvider } from '@castiel/monitoring';

export interface PasswordHistoryEntry {
  hash: string;
  createdAt: Date;
}

export interface PasswordHistoryConfig {
  // Number of previous passwords to remember
  historySize: number;
  // Minimum days before a password can be reused
  minPasswordAgeDays?: number;
}

const DEFAULT_CONFIG: PasswordHistoryConfig = {
  historySize: 5,
  minPasswordAgeDays: 0,
};

/**
 * Password History Service
 * 
 * Prevents users from reusing recent passwords by maintaining
 * a history of password hashes.
 */
export class PasswordHistoryService {
  private config: PasswordHistoryConfig;
  private monitoring?: IMonitoringProvider;

  constructor(config?: Partial<PasswordHistoryConfig>, monitoring?: IMonitoringProvider) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.monitoring = monitoring;
  }

  /**
   * Check if a password was recently used
   * @param newPassword The new password to check
   * @param currentPasswordHash The current password hash (if any)
   * @param passwordHistory Array of previous password hashes
   * @returns Object with isReused flag and message
   */
  async checkPasswordReuse(
    newPassword: string,
    currentPasswordHash?: string,
    passwordHistory?: PasswordHistoryEntry[]
  ): Promise<{ isReused: boolean; message?: string }> {
    // Check against current password
    if (currentPasswordHash) {
      try {
        const matchesCurrent = await argon2.verify(currentPasswordHash, newPassword);
        if (matchesCurrent) {
          return {
            isReused: true,
            message: 'New password cannot be the same as your current password',
          };
        }
      } catch (error) {
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'PasswordHistoryService',
          operation: 'checkPasswordReuse',
          context: 'verify-current-password',
        });
      }
    }

    // Check against password history
    if (passwordHistory && passwordHistory.length > 0) {
      for (let i = 0; i < passwordHistory.length && i < this.config.historySize; i++) {
        const entry = passwordHistory[i];
        try {
          const matchesHistory = await argon2.verify(entry.hash, newPassword);
          if (matchesHistory) {
            // Check minimum age if configured
            if (this.config.minPasswordAgeDays && this.config.minPasswordAgeDays > 0) {
              const minAgeMs = this.config.minPasswordAgeDays * 24 * 60 * 60 * 1000;
              const passwordAge = Date.now() - new Date(entry.createdAt).getTime();
              if (passwordAge < minAgeMs) {
                return {
                  isReused: true,
                  message: `This password was used recently and cannot be reused for ${this.config.minPasswordAgeDays} days`,
                };
              }
            } else {
              return {
                isReused: true,
                message: `Password cannot be the same as any of your last ${this.config.historySize} passwords`,
              };
            }
          }
        } catch (error) {
          this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
            component: 'PasswordHistoryService',
            operation: 'checkPasswordReuse',
            context: 'verify-password-history',
          });
        }
      }
    }

    return { isReused: false };
  }

  /**
   * Add a password to the history
   * @param currentHash The current password hash to add to history
   * @param existingHistory The existing password history
   * @returns Updated password history array
   */
  addToHistory(
    currentHash: string,
    existingHistory?: PasswordHistoryEntry[]
  ): PasswordHistoryEntry[] {
    const history = existingHistory ? [...existingHistory] : [];

    // Add current password to history
    history.unshift({
      hash: currentHash,
      createdAt: new Date(),
    });

    // Trim history to configured size
    if (history.length > this.config.historySize) {
      history.splice(this.config.historySize);
    }

    return history;
  }

  /**
   * Get the configuration
   */
  getConfig(): PasswordHistoryConfig {
    return { ...this.config };
  }
}

// Export singleton instance with default config
export const passwordHistoryService = new PasswordHistoryService();

