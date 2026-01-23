import type { IMonitoringProvider } from '@castiel/monitoring';
export interface PasswordHistoryEntry {
    hash: string;
    createdAt: Date;
}
export interface PasswordHistoryConfig {
    historySize: number;
    minPasswordAgeDays?: number;
}
/**
 * Password History Service
 *
 * Prevents users from reusing recent passwords by maintaining
 * a history of password hashes.
 */
export declare class PasswordHistoryService {
    private config;
    private monitoring?;
    constructor(config?: Partial<PasswordHistoryConfig>, monitoring?: IMonitoringProvider);
    /**
     * Check if a password was recently used
     * @param newPassword The new password to check
     * @param currentPasswordHash The current password hash (if any)
     * @param passwordHistory Array of previous password hashes
     * @returns Object with isReused flag and message
     */
    checkPasswordReuse(newPassword: string, currentPasswordHash?: string, passwordHistory?: PasswordHistoryEntry[]): Promise<{
        isReused: boolean;
        message?: string;
    }>;
    /**
     * Add a password to the history
     * @param currentHash The current password hash to add to history
     * @param existingHistory The existing password history
     * @returns Updated password history array
     */
    addToHistory(currentHash: string, existingHistory?: PasswordHistoryEntry[]): PasswordHistoryEntry[];
    /**
     * Get the configuration
     */
    getConfig(): PasswordHistoryConfig;
}
export declare const passwordHistoryService: PasswordHistoryService;
//# sourceMappingURL=password-history.service.d.ts.map