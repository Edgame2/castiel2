'use client'

import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/shard-types/tags-input'
import { UseFormReturn } from 'react-hook-form'

interface OrganizationSectionProps {
    form: UseFormReturn<any>
}

export function OrganizationSection({ form }: OrganizationSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Organization</h3>
            <div>
                <Label>Tags</Label>
                <TagsInput
                    value={form.watch('tags') || []}
                    onChange={(value) => form.setValue('tags', value)}
                />
            </div>
        </div>
    )
}
