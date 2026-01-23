'use client'

import { FieldGroupBuilder } from '@/components/shard-types/field-group-builder'
import { UseFormReturn } from 'react-hook-form'

interface FieldGroupsSectionProps {
    form: UseFormReturn<any>
    availableFields: string[]
}

export function FieldGroupsSection({ form, availableFields }: FieldGroupsSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Field Groups</h3>
            <FieldGroupBuilder
                value={form.watch('fieldGroups') || []}
                onChange={(value) => form.setValue('fieldGroups', value)}
                availableFields={availableFields}
            />
        </div>
    )
}
