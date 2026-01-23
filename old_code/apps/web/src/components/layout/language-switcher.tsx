'use client'

import { useTranslation } from 'react-i18next'
import { languages, type LanguageCode } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline'
  showLabel?: boolean
  className?: string
}

export function LanguageSwitcher({
  variant = 'ghost',
  showLabel = false,
  className,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? 'default' : 'icon'}
          className={cn('gap-2', className)}
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline-block">
              {currentLanguage.flag} {currentLanguage.name}
            </span>
          )}
          <span className="sr-only" suppressHydrationWarning>{t('language' as any)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {i18n.language === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
