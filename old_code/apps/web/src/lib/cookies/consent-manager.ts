/**
 * Cookie Consent Manager
 * Handles GDPR-compliant cookie consent preferences
 */

export interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const CONSENT_KEY = "cookie-consent"
const CONSENT_DATE_KEY = "cookie-consent-date"

export class ConsentManager {
  /**
   * Get current cookie preferences from localStorage
   */
  static getPreferences(): CookiePreferences | null {
    if (typeof window === "undefined") return null

    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) return null

    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  /**
   * Save cookie preferences to localStorage
   */
  static savePreferences(preferences: CookiePreferences): void {
    if (typeof window === "undefined") return

    localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences))
    localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString())

    // Apply preferences
    this.applyPreferences(preferences)
  }

  /**
   * Check if user has given consent
   */
  static hasConsent(): boolean {
    return this.getPreferences() !== null
  }

  /**
   * Get consent date
   */
  static getConsentDate(): Date | null {
    if (typeof window === "undefined") return null

    const stored = localStorage.getItem(CONSENT_DATE_KEY)
    if (!stored) return null

    try {
      return new Date(stored)
    } catch {
      return null
    }
  }

  /**
   * Clear all consent preferences
   */
  static clearPreferences(): void {
    if (typeof window === "undefined") return

    localStorage.removeItem(CONSENT_KEY)
    localStorage.removeItem(CONSENT_DATE_KEY)
  }

  /**
   * Apply preferences to analytics and tracking
   */
  private static applyPreferences(preferences: CookiePreferences): void {
    if (preferences.analytics) {
      this.enableAnalytics()
    } else {
      this.disableAnalytics()
    }

    if (preferences.marketing) {
      this.enableMarketing()
    } else {
      this.disableMarketing()
    }
  }

  /**
   * Enable analytics tracking
   */
  private static enableAnalytics(): void {
    // Initialize Application Insights or other analytics
    if (typeof window !== "undefined" && (window as any).appInsights) {
      (window as any).appInsights.setAuthenticatedUserContext()
    }
  }

  /**
   * Disable analytics tracking
   */
  private static disableAnalytics(): void {
    // Disable Application Insights or other analytics
    if (typeof window !== "undefined" && (window as any).appInsights) {
      (window as any).appInsights.clearAuthenticatedUserContext()
    }
  }

  /**
   * Enable marketing cookies
   */
  private static enableMarketing(): void {
    // Enable marketing pixels, retargeting, etc.
    // This would integrate with your marketing platforms
  }

  /**
   * Disable marketing cookies
   */
  private static disableMarketing(): void {
    // Disable marketing pixels, retargeting, etc.
    // This would integrate with your marketing platforms
  }

  /**
   * Get default preferences (only necessary cookies)
   */
  static getDefaultPreferences(): CookiePreferences {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
    }
  }

  /**
   * Get all-accepted preferences
   */
  static getAllAcceptedPreferences(): CookiePreferences {
    return {
      necessary: true,
      analytics: true,
      marketing: true,
    }
  }
}
