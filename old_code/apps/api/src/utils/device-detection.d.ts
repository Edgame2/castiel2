/**
 * Device Detection Utility
 * Parse User-Agent strings to extract device information
 */
import { SessionDeviceInfo } from '../types/index.js';
/**
 * Parse User-Agent string to extract device information
 */
export declare function parseUserAgent(userAgent: string): SessionDeviceInfo;
/**
 * Get human-readable device description
 */
export declare function getDeviceDescription(deviceInfo: SessionDeviceInfo): string;
//# sourceMappingURL=device-detection.d.ts.map