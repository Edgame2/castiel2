'use client'

import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import English translations
import enCommon from '@/locales/en/common.json'
import enAuth from '@/locales/en/auth.json'
import enNav from '@/locales/en/nav.json'
import enDashboard from '@/locales/en/dashboard.json'
import enDashboards from '@/locales/en/dashboards.json'
import enSettings from '@/locales/en/settings.json'
import enUsers from '@/locales/en/users.json'
import enTenants from '@/locales/en/tenants.json'
import enShards from '@/locales/en/shards.json'
import enErrors from '@/locales/en/errors.json'
import enAudit from '@/locales/en/audit.json'
import enProfile from '@/locales/en/profile.json'

// Import French translations
import frCommon from '@/locales/fr/common.json'
import frAuth from '@/locales/fr/auth.json'
import frNav from '@/locales/fr/nav.json'
import frDashboard from '@/locales/fr/dashboard.json'
import frDashboards from '@/locales/fr/dashboards.json'
import frSettings from '@/locales/fr/settings.json'
import frUsers from '@/locales/fr/users.json'
import frTenants from '@/locales/fr/tenants.json'
import frShards from '@/locales/fr/shards.json'
import frErrors from '@/locales/fr/errors.json'
import frAudit from '@/locales/fr/audit.json'
import frProfile from '@/locales/fr/profile.json'

// Supported languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  // Add more languages here as needed:
  // { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  // { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const

export type LanguageCode = (typeof languages)[number]['code']

// Namespaces
export const namespaces = [
  'common',
  'auth',
  'nav',
  'dashboard',
  'dashboards',
  'settings',
  'users',
  'tenants',
  'shards',
  'errors',
  'audit',
  'profile',
] as const

export type Namespace = (typeof namespaces)[number]

// Resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    dashboards: enDashboards,
    settings: enSettings,
    users: enUsers,
    tenants: enTenants,
    shards: enShards,
    errors: enErrors,
    audit: enAudit,
    profile: enProfile,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    nav: frNav,
    dashboard: frDashboard,
    dashboards: frDashboards,
    settings: frSettings,
    users: frUsers,
    tenants: frTenants,
    shards: frShards,
    errors: frErrors,
    audit: frAudit,
    profile: frProfile,
  },
}

// Only initialize if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: namespaces as unknown as string[],
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      detection: {
        // Order of language detection
        order: ['localStorage', 'navigator', 'htmlTag'],
        // Cache user language preference
        caches: ['localStorage'],
        // localStorage key
        lookupLocalStorage: 'i18nextLng',
      },
      react: {
        useSuspense: false, // Disable suspense for SSR compatibility
      },
    })
}

export { i18n }

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized)

  useEffect(() => {
    if (!isInitialized && !i18n.isInitialized) {
      const handleInitialized = () => setIsInitialized(true)
      i18n.on('initialized', handleInitialized)
      return () => {
        i18n.off('initialized', handleInitialized)
      }
    } else if (i18n.isInitialized && !isInitialized) {
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Prevent flash of untranslated content during SSR
  if (!isInitialized) {
    return null
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

// Type definitions are handled in src/types/i18next.d.ts
// This allows all string keys to prevent type errors for valid translation keys
