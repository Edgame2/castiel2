import type { Redis } from 'ioredis';
import type { FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { UnifiedEmailService } from '../email/email.service.js';
import { parseUserAgent, getDeviceDescription } from '../../utils/device-detection.js';
import type { SessionDeviceInfo } from '../../types/index.js';
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

export class DeviceSecurityService {
  private redis: Redis | null;
  private emailService: UnifiedEmailService;
  private baseUrl: string;
  private monitoring?: IMonitoringProvider;

  // Key prefix for device tracking
  private readonly KEY_PREFIX = 'user:devices:';
  // Max devices to track per user
  private readonly MAX_DEVICES_PER_USER = 10;
  // TTL for device records (90 days)
  private readonly DEVICE_TTL_SECONDS = 90 * 24 * 60 * 60;

  constructor(redis: Redis | null, emailService: UnifiedEmailService, baseUrl: string, monitoring?: IMonitoringProvider) {
    this.redis = redis;
    this.emailService = emailService;
    this.baseUrl = baseUrl;
    this.monitoring = monitoring;
  }

  /**
   * Check if login is from a new device and send notification if so
   */
  async checkAndNotifyNewDevice(
    userId: string,
    userEmail: string,
    userName: string,
    tenantId: string,
    request: FastifyRequest,
    deviceFingerprint?: string
  ): Promise<boolean> {
    try {
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'] || 'Unknown';
      
      // Generate device fingerprint if not provided
      const fingerprint = deviceFingerprint || this.generateDeviceFingerprint(userAgent, ipAddress);
      
      // Check if this device is known
      const isNewDevice = await this.isNewDevice(userId, fingerprint);
      
      if (isNewDevice) {
        // Register the new device
        await this.registerDevice(userId, {
          fingerprint,
          userAgent,
          ipAddress,
          deviceDescription: this.getDeviceDescription(userAgent),
          firstSeenAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        });

        // Send notification email
        await this.sendNewDeviceNotification({
          userId,
          userEmail,
          userName,
          tenantId,
          device: {
            fingerprint: fingerprint.substring(0, 8),
            description: this.getDeviceDescription(userAgent),
            ipAddress,
            userAgent,
          },
          loginTime: new Date().toISOString(),
        });

        this.monitoring?.trackEvent('device-security.new-device-detected', {
          userId,
          userEmail,
          tenantId,
          deviceFingerprint: fingerprint.substring(0, 8),
        });
        return true;
      } else {
        // Update last seen time for known device
        await this.updateDeviceLastSeen(userId, fingerprint);
      }

      return false;
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'DeviceSecurityService',
        operation: 'checkForNewDevice',
      });
      return false;
    }
  }

  /**
   * Check if the device fingerprint is new for this user
   */
  private async isNewDevice(userId: string, fingerprint: string): Promise<boolean> {
    if (!this.redis) {
      // Without Redis, we can't track devices
      return false;
    }

    const key = `${this.KEY_PREFIX}${userId}`;
    const devices = await this.redis.hget(key, fingerprint);
    return !devices;
  }

  /**
   * Register a new device for the user
   */
  private async registerDevice(userId: string, device: DeviceInfo): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${this.KEY_PREFIX}${userId}`;
    
    // Store the device
    await this.redis.hset(key, device.fingerprint, JSON.stringify(device));
    
    // Set expiration
    await this.redis.expire(key, this.DEVICE_TTL_SECONDS);

    // Trim old devices if too many
    const deviceCount = await this.redis.hlen(key);
    if (deviceCount > this.MAX_DEVICES_PER_USER) {
      await this.trimOldDevices(key);
    }
  }

  /**
   * Update the last seen timestamp for a device
   */
  private async updateDeviceLastSeen(userId: string, fingerprint: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${this.KEY_PREFIX}${userId}`;
    const deviceJson = await this.redis.hget(key, fingerprint);
    
    if (deviceJson) {
      const device = JSON.parse(deviceJson) as DeviceInfo;
      device.lastSeenAt = new Date().toISOString();
      await this.redis.hset(key, fingerprint, JSON.stringify(device));
    }
  }

  /**
   * Remove the oldest devices when the limit is exceeded
   */
  private async trimOldDevices(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const allDevices = await this.redis.hgetall(key);
    const devices: (DeviceInfo & { fingerprint: string })[] = [];

    for (const [fingerprint, json] of Object.entries(allDevices)) {
      try {
        const device = JSON.parse(json) as DeviceInfo;
        devices.push({ ...device, fingerprint });
      } catch {
        // Remove invalid entries
        await this.redis.hdel(key, fingerprint);
      }
    }

    // Sort by lastSeenAt ascending (oldest first)
    devices.sort((a, b) => 
      new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime()
    );

    // Remove oldest devices to get under the limit
    const toRemove = devices.slice(0, devices.length - this.MAX_DEVICES_PER_USER);
    for (const device of toRemove) {
      await this.redis.hdel(key, device.fingerprint);
    }
  }

  /**
   * Send email notification about new device login
   */
  private async sendNewDeviceNotification(info: NewDeviceLoginInfo): Promise<void> {
    try {
      const loginDate = new Date(info.loginTime);
      const formattedDate = loginDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const subject = 'New Device Login Detected';
      const message = `
A new device was used to sign in to your account:

Device: ${info.device.description}
IP Address: ${info.device.ipAddress}
Time: ${formattedDate}

If this was you, no action is needed. If you don't recognize this login, please:
1. Change your password immediately
2. Review your active sessions in your account settings
3. Enable two-factor authentication if you haven't already

You can review and manage your active sessions here:
${this.baseUrl}/account/sessions

For security concerns, contact our support team.
`.trim();

      await this.emailService.sendSecurityAlertEmail(
        info.userEmail,
        subject,
        message
      );
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'DeviceSecurityService',
        operation: 'sendNewDeviceNotification',
        userId: info.userId,
        userEmail: info.userEmail,
      });
    }
  }

  /**
   * Generate a device fingerprint from available information
   */
  private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    // Create a hash of user agent and partial IP
    // We use partial IP to account for dynamic IPs while still providing some uniqueness
    const ipParts = ipAddress.split('.');
    const partialIp = ipParts.slice(0, 2).join('.'); // Use first two octets
    
    const data = `${userAgent}|${partialIp}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Get a human-readable device description
   */
  private getDeviceDescription(userAgent: string): string {
    const deviceInfo = parseUserAgent(userAgent);
    return getDeviceDescription(deviceInfo);
  }

  /**
   * Get all known devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    if (!this.redis) {
      return [];
    }

    const key = `${this.KEY_PREFIX}${userId}`;
    const allDevices = await this.redis.hgetall(key);
    const devices: DeviceInfo[] = [];

    for (const json of Object.values(allDevices)) {
      try {
        devices.push(JSON.parse(json) as DeviceInfo);
      } catch {
        // Skip invalid entries
      }
    }

    // Sort by lastSeenAt descending (most recent first)
    devices.sort((a, b) => 
      new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );

    return devices;
  }

  /**
   * Remove a specific device from tracking
   */
  async removeDevice(userId: string, fingerprint: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    const key = `${this.KEY_PREFIX}${userId}`;
    const result = await this.redis.hdel(key, fingerprint);
    return result > 0;
  }

  /**
   * Clear all known devices for a user
   */
  async clearAllDevices(userId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${this.KEY_PREFIX}${userId}`;
    await this.redis.del(key);
  }
}

