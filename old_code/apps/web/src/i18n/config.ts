import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enDashboard from './locales/en/dashboard.json'
import enSettings from './locales/en/settings.json'
import enUsers from './locales/en/users.json'
import enTenants from './locales/en/tenants.json'
import enErrors from './locales/en/errors.json'
import enNav from './locales/en/nav.json'
import enNotifications from './locales/en/notifications.json'

import frCommon from './locales/fr/common.json'
import frAuth from './locales/fr/auth.json'
import frDashboard from './locales/fr/dashboard.json'
import frSettings from './locales/fr/settings.json'
import frUsers from './locales/fr/users.json'
import frTenants from './locales/fr/tenants.json'
import frErrors from './locales/fr/errors.json'
import frNav from './locales/fr/nav.json'
import frNotifications from './locales/fr/notifications.json'

// Supported languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  // Add more languages here:
  // { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  // { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const

export type LanguageCode = typeof languages[number]['code']

// Resources object with all translations
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    settings: enSettings,
    users: enUsers,
    tenants: enTenants,
    errors: enErrors,
    nav: enNav,
    notifications: enNotifications,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    dashboard: frDashboard,
    settings: frSettings,
    users: frUsers,
    tenants: frTenants,
    errors: frErrors,
    nav: frNav,
    notifications: frNotifications,
  },
}

// Namespaces
export const defaultNS = 'common'
export const namespaces = ['common', 'auth', 'dashboard', 'settings', 'users', 'tenants', 'errors', 'nav', 'notifications'] as const

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS,
    ns: namespaces,
    
    // Language detection options
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  })

export default i18n

// Type-safe translation keys
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: typeof resources['en']
  }
}

