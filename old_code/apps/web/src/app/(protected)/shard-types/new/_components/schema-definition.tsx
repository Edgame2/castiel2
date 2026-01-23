'use client'

import { Label } from '@/components/ui/label'
import { ParentTypeSelector } from '@/components/shard-types/parent-type-selector'
import { UseFormReturn } from 'react-hook-form'

interface SchemaDefinitionSectionProps {
    form: UseFormReturn<any>
    currentTypeId?: string
}

export function SchemaDefinitionSection({ form, currentTypeId }: SchemaDefinitionSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Schema Definition</h3>
            <div>
                <Label>Parent Type (Optional)</Label>
                <ParentTypeSelector
                    value={form.watch('parentShardTypeId')}
                    onChange={(value) => form.setValue('parentShardTypeId', value)}
                    currentTypeId={currentTypeId}
                    availableTypes={[]}
                />
            </div>
        </div>
    )
}
