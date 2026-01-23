/**
 * Device Fingerprinting Utility
 * 
 * Generates a consistent device fingerprint for MFA trusted device tracking
 */

/**
 * Generate a device fingerprint based on browser characteristics
 * This is a simple implementation - in production, consider using a library like FingerprintJS
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const components: string[] = []

  // User Agent
  components.push(navigator.userAgent)

  // Screen Resolution
  components.push(`${window.screen.width}x${window.screen.height}`)

  // Color Depth
  components.push(`${window.screen.colorDepth}`)

  // Timezone Offset
  components.push(`${new Date().getTimezoneOffset()}`)

  // Language
  components.push(navigator.language)

  // Platform
  components.push(navigator.platform)

  // Hardware Concurrency (CPU cores)
  components.push(`${navigator.hardwareConcurrency ?? 'unknown'}`)

  // Device Memory (if available)
  if ('deviceMemory' in navigator) {
    components.push(`${(navigator as any).deviceMemory}`)
  }

  // Touch Support
  const maxTouchPoints = navigator.maxTouchPoints ?? 0
  components.push(`${maxTouchPoints}`)

  // Combine all components
  const fingerprint = components.join('|')

  // Hash the fingerprint (simple hash function)
  return simpleHash(fingerprint)
}

/**
 * Simple hash function (FNV-1a)
 * For production, consider using a crypto library
 */
function simpleHash(str: string): string {
  let hash = 2166136261

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Get or create device fingerprint from localStorage
 * Persists the fingerprint for consistency across sessions
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const storageKey = 'device_fingerprint'
  let fingerprint = localStorage.getItem(storageKey)

  if (!fingerprint) {
    fingerprint = generateDeviceFingerprint()
    localStorage.setItem(storageKey, fingerprint)
  }

  return fingerprint
}

/**
 * Clear stored device fingerprint
 * Useful for testing or when user wants to revoke trusted device status
 */
export function clearDeviceFingerprint(): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('device_fingerprint')
}
