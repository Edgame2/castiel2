/**
 * IP Geolocation Utilities
 * 
 * Gets location information from IP address
 * Uses a simple service or can be extended with paid services
 */

export interface LocationInfo {
  country?: string;
  city?: string;
}

/**
 * Get location from IP address
 * 
 * Note: This is a simplified implementation. For production, consider using:
 * - MaxMind GeoIP2
 * - ipapi.co
 * - ip-api.com
 * - Cloudflare (via CF-IPCountry header)
 */
export async function getLocationFromIP(ipAddress: string | null): Promise<LocationInfo> {
  if (!ipAddress || ipAddress === 'unknown' || ipAddress === '::1' || ipAddress === '127.0.0.1') {
    return {};
  }

  // Remove port if present
  const cleanIP = ipAddress.split(':').pop() || ipAddress;

  // Skip private IPs
  if (
    cleanIP.startsWith('192.168.') ||
    cleanIP.startsWith('10.') ||
    cleanIP.startsWith('172.16.') ||
    cleanIP.startsWith('172.17.') ||
    cleanIP.startsWith('172.18.') ||
    cleanIP.startsWith('172.19.') ||
    cleanIP.startsWith('172.20.') ||
    cleanIP.startsWith('172.21.') ||
    cleanIP.startsWith('172.22.') ||
    cleanIP.startsWith('172.23.') ||
    cleanIP.startsWith('172.24.') ||
    cleanIP.startsWith('172.25.') ||
    cleanIP.startsWith('172.26.') ||
    cleanIP.startsWith('172.27.') ||
    cleanIP.startsWith('172.28.') ||
    cleanIP.startsWith('172.29.') ||
    cleanIP.startsWith('172.30.') ||
    cleanIP.startsWith('172.31.')
  ) {
    return {};
  }

  try {
    // Use ip-api.com (free tier: 45 requests/minute)
    // For production, consider using MaxMind GeoIP2 or a paid service
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,country,city`, {
      headers: {
        'User-Agent': 'Castiel/1.0',
      },
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json() as { status: string; country?: string; city?: string };

    if (data.status === 'success') {
      return {
        country: data.country,
        city: data.city,
      };
    }
  } catch (error) {
    // Silently fail - geolocation is optional
    // Log is optional here
  }

  return {};
}

/**
 * Get location from IP address (alias for getLocationFromIP for backward compatibility)
 * 
 * @param ipAddress - IP address
 * @returns Promise resolving to location info
 */
export async function getGeolocationFromIp(ipAddress: string | null): Promise<LocationInfo> {
  return getLocationFromIP(ipAddress);
}
