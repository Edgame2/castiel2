/**
 * i18next type augmentation
 * 
 * This file extends i18next types to allow all namespace strings
 * without requiring strict type checking of namespace names or keys.
 */

import 'i18next'

declare module 'i18next' {
  interface CustomTypeOptions {
    // Allow any string as namespace
    defaultNS: 'common'
    // Allow any namespace string
    ns: string | readonly string[]
    // Disable strict key checking
    returnNull: false
    // Allow any string as translation key
    keySeparator: '.'
    nsSeparator: ':'
  }
}

declare module 'react-i18next' {
  // Allow any namespace
  interface UseTranslationOptions<Ns extends string | readonly string[] | undefined = undefined> {
    ns?: string | readonly string[]
  }
  
  // Override TFunction to accept any string key
  interface TFunction {
    <K extends string = string>(key: K, options?: any): string
  }
}











