'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
  showRequirements?: boolean
}

interface PasswordRequirement {
  key: string
  validator: (password: string) => boolean
}

const requirementDefinitions: PasswordRequirement[] = [
  {
    key: 'minLength',
    validator: (password) => password.length >= 8,
  },
  {
    key: 'uppercase',
    validator: (password) => /[A-Z]/.test(password),
  },
  {
    key: 'lowercase',
    validator: (password) => /[a-z]/.test(password),
  },
  {
    key: 'number',
    validator: (password) => /[0-9]/.test(password),
  },
  {
    key: 'special',
    validator: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
]

// Strength level keys for i18n
const strengthLevelKeys = ['veryWeak', 'weak', 'fair', 'strong', 'veryStrong'] as const

function calculateStrength(password: string): { score: number; levelKey: string; color: string } {
  if (!password) return { score: 0, levelKey: 'none', color: 'bg-muted' }
  
  let score = 0
  
  // Base score for length
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1
  
  // Bonus for no common patterns
  if (!/^[a-zA-Z]+$/.test(password)) score += 1
  if (!/^[0-9]+$/.test(password)) score += 1
  if (!/(.)\1{2,}/.test(password)) score += 1 // No repeated characters
  
  // Normalize to 0-4 scale
  const normalizedScore = Math.min(4, Math.floor(score / 2.5))
  
  const levelColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
  ]
  
  return {
    score: normalizedScore,
    levelKey: strengthLevelKeys[normalizedScore],
    color: levelColors[normalizedScore],
  }
}

export function PasswordStrengthIndicator({
  password,
  className,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation('auth')
  const strength = useMemo(() => calculateStrength(password), [password])
  const metRequirements = useMemo(
    () => requirementDefinitions.map((req) => ({ 
      ...req, 
      label: t(`register.passwordRequirements.${req.key}` as any),
      met: req.validator(password) 
    })),
    [password, t]
  )

  if (!password) return null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t('register.passwordStrength.title' as any)}</span>
          <span className={cn(
            'text-xs font-medium',
            strength.score <= 1 && 'text-red-500',
            strength.score === 2 && 'text-yellow-500',
            strength.score >= 3 && 'text-green-500'
          )}>
            {t(`register.passwordStrength.${strength.levelKey}` as any)}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                index <= strength.score ? strength.color : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{t('register.passwordRequirements.title' as any)}</span>
          <ul className="grid gap-1">
            {metRequirements.map((req, index) => (
              <li
                key={index}
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors duration-200',
                  req.met ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {req.met ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to check if password meets all requirements
 */
export function usePasswordValidation(password: string) {
  return useMemo(() => {
    const met = requirementDefinitions.every((req) => req.validator(password))
    const errors = requirementDefinitions
      .filter((req) => !req.validator(password))
      .map((req) => req.key)
    
    return {
      isValid: met,
      errors,
      strength: calculateStrength(password),
    }
  }, [password])
}

