'use client'

import { ValidationRuleBuilder } from '@/components/shard-types/validation-rule-builder'
import { UseFormReturn } from 'react-hook-form'

interface ValidationSectionProps {
    form: UseFormReturn<any>
    availableFields: string[]
}

export function ValidationSection({ form, availableFields }: ValidationSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Validation Rules</h3>
            <ValidationRuleBuilder
                value={form.watch('validationRules') || []}
                onChange={(value) => form.setValue('validationRules', value)}
                availableFields={availableFields}
            />
        </div>
    )
}
