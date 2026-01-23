import type { Redis } from 'ioredis';
import type { FastifyRequest } from 'fastify';
import { EmailService } from '../email/email.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
export interface DeviceInfo {
    fingerprint: string;
    userAgent: string;
    ipAddress: string;
    deviceDescription: string;
    firstSeenAt: string;
    lastSeenAt: string;
}
export interface NewDeviceLoginInfo {
    userId: string;
    userEmail: string;
    userName: string;
    tenantId: string;
    device: {
        fingerprint: string;
        description: string;
        ipAddress: string;
        userAgent: string;
    };
    loginTime: string;
}
export declare class DeviceSecurityService {
    private redis;
    private emailService;
    private baseUrl;
    private monitoring?;
    private readonly KEY_PREFIX;
    private readonly MAX_DEVICES_PER_USER;
    private readonly DEVICE_TTL_SECONDS;
    constructor(redis: Redis | null, emailService: EmailService, baseUrl: string, monitoring?: IMonitoringProvider);
    /**
     * Check if login is from a new device and send notification if so
     */
    checkAndNotifyNewDevice(userId: string, userEmail: string, userName: string, tenantId: string, request: FastifyRequest, deviceFingerprint?: string): Promise<boolean>;
    /**
     * Check if the device fingerprint is new for this user
     */
    private isNewDevice;
    /**
     * Register a new device for the user
     */
    private registerDevice;
    /**
     * Update the last seen timestamp for a device
     */
    private updateDeviceLastSeen;
    /**
     * Remove the oldest devices when the limit is exceeded
     */
    private trimOldDevices;
    /**
     * Send email notification about new device login
     */
    private sendNewDeviceNotification;
    /**
     * Generate a device fingerprint from available information
     */
    private generateDeviceFingerprint;
    /**
     * Get a human-readable device description
     */
    private getDeviceDescription;
    /**
     * Get all known devices for a user
     */
    getUserDevices(userId: string): Promise<DeviceInfo[]>;
    /**
     * Remove a specific device from tracking
     */
    removeDevice(userId: string, fingerprint: string): Promise<boolean>;
    /**
     * Clear all known devices for a user
     */
    clearAllDevices(userId: string): Promise<void>;
}
//# sourceMappingURL=device-security.service.d.ts.map