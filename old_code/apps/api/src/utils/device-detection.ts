/**
 * Device Detection Utility
 * Parse User-Agent strings to extract device information
 */

import { SessionDeviceInfo } from '../types/index.js';

/**
 * Parse User-Agent string to extract device information
 */
export function parseUserAgent(userAgent: string): SessionDeviceInfo {
  const ua = userAgent.toLowerCase();
  
  // Detect mobile
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Detect device type
  let device = 'desktop';
  if (/ipad|tablet|kindle/i.test(userAgent)) {
    device = 'tablet';
  } else if (isMobile) {
    device = 'mobile';
  }
  
  // Detect browser
  let browser = 'Unknown';
  let browserVersion = '';
  
  if (ua.includes('edg/')) {
    browser = 'Edge';
    browserVersion = extractVersion(ua, /edg\/([\d.]+)/);
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome';
    browserVersion = extractVersion(ua, /chrome\/([\d.]+)/);
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
    browserVersion = extractVersion(ua, /firefox\/([\d.]+)/);
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
    browserVersion = extractVersion(ua, /version\/([\d.]+)/);
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera';
    browserVersion = extractVersion(ua, /(?:opera|opr)\/([\d.]+)/);
  }
  
  // Detect OS
  let os = 'Unknown';
  let osVersion = '';
  
  if (ua.includes('windows nt')) {
    os = 'Windows';
    osVersion = extractWindowsVersion(ua);
  } else if (ua.includes('mac os x')) {
    os = 'macOS';
    osVersion = extractVersion(ua, /mac os x ([\d_]+)/);
    osVersion = osVersion.replace(/_/g, '.');
  } else if (ua.includes('android')) {
    os = 'Android';
    osVersion = extractVersion(ua, /android ([\d.]+)/);
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    osVersion = extractVersion(ua, /os ([\d_]+)/);
    osVersion = osVersion.replace(/_/g, '.');
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }
  
  return {
    userAgent,
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    isMobile,
  };
}

/**
 * Extract version from regex match
 */
function extractVersion(ua: string, regex: RegExp): string {
  const match = ua.match(regex);
  return match ? match[1] : '';
}

/**
 * Extract Windows version
 */
function extractWindowsVersion(ua: string): string {
  if (ua.includes('windows nt 10.0')) {return '10/11';}
  if (ua.includes('windows nt 6.3')) {return '8.1';}
  if (ua.includes('windows nt 6.2')) {return '8';}
  if (ua.includes('windows nt 6.1')) {return '7';}
  if (ua.includes('windows nt 6.0')) {return 'Vista';}
  if (ua.includes('windows nt 5.1')) {return 'XP';}
  return '';
}

/**
 * Get human-readable device description
 */
export function getDeviceDescription(deviceInfo: SessionDeviceInfo): string {
  const parts: string[] = [];
  
  if (deviceInfo.browser && deviceInfo.browserVersion) {
    parts.push(`${deviceInfo.browser} ${deviceInfo.browserVersion.split('.')[0]}`);
  } else if (deviceInfo.browser) {
    parts.push(deviceInfo.browser);
  }
  
  if (deviceInfo.os) {
    const osStr = deviceInfo.osVersion 
      ? `${deviceInfo.os} ${deviceInfo.osVersion.split('.')[0]}`
      : deviceInfo.os;
    parts.push(`on ${osStr}`);
  }
  
  if (parts.length === 0) {
    return deviceInfo.device === 'mobile' ? 'Mobile Device' : 
           deviceInfo.device === 'tablet' ? 'Tablet' : 
           'Desktop Computer';
  }
  
  return parts.join(' ');
}
