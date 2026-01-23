/**
 * Device Detection Utilities
 * 
 * Detects device type and name from user agent
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface DeviceInfo {
  type: DeviceType;
  name: string;
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) {
    return 'unknown';
  }

  const ua = userAgent.toLowerCase();

  // Mobile devices
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    // Check if it's a tablet
    if (/tablet|ipad|playbook|silk|kindle|nexus 7|nexus 10/i.test(ua)) {
      return 'tablet';
    }
    return 'mobile';
  }

  // Tablets
  if (/tablet|ipad|playbook|silk|kindle|nexus 7|nexus 10/i.test(ua)) {
    return 'tablet';
  }

  // Desktop
  if (/windows|macintosh|linux|x11|ubuntu|debian|fedora|redhat/i.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Extract device name from user agent
 */
export function extractDeviceName(userAgent: string | null): string {
  if (!userAgent) {
    return 'Unknown Device';
  }

  // Extract browser and OS info
  const ua = userAgent.toLowerCase();
  let deviceName = '';

  // OS detection
  if (/windows nt 10/i.test(userAgent)) {
    deviceName = 'Windows 10';
  } else if (/windows nt 6.3/i.test(userAgent)) {
    deviceName = 'Windows 8.1';
  } else if (/windows nt 6.2/i.test(userAgent)) {
    deviceName = 'Windows 8';
  } else if (/windows nt 6.1/i.test(userAgent)) {
    deviceName = 'Windows 7';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    deviceName = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    deviceName = 'Linux';
  } else if (/iphone/i.test(userAgent)) {
    deviceName = 'iPhone';
  } else if (/ipad/i.test(userAgent)) {
    deviceName = 'iPad';
  } else if (/android/i.test(userAgent)) {
    deviceName = 'Android';
  } else {
    deviceName = 'Unknown OS';
  }

  // Add browser info
  if (/chrome/i.test(userAgent) && !/edg|opr/i.test(userAgent)) {
    deviceName += ' - Chrome';
  } else if (/firefox/i.test(userAgent)) {
    deviceName += ' - Firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    deviceName += ' - Safari';
  } else if (/edg/i.test(userAgent)) {
    deviceName += ' - Edge';
  } else if (/opr/i.test(userAgent)) {
    deviceName += ' - Opera';
  }

  return deviceName;
}

/**
 * Get device info from user agent
 */
export function getDeviceInfo(userAgent: string | null): DeviceInfo {
  return {
    type: detectDeviceType(userAgent),
    name: extractDeviceName(userAgent),
  };
}
