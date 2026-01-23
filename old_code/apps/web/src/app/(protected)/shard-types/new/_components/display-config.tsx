'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UseFormReturn } from 'react-hook-form'

interface DisplayConfigSectionProps {
    form: UseFormReturn<any>
    availableFields: string[]
}

export function DisplayConfigSection({ form, availableFields }: DisplayConfigSectionProps) {
    const selectedFields = form.watch('display.searchableFields') || []

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Display Configuration</h3>
            <div className="grid gap-4">
                <div>
                    <Label>Title Field</Label>
                    <Select
                        value={form.watch('display.titleField')}
                        onValueChange={(value) => form.setValue('display.titleField', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFields.map((field) => (
                                <SelectItem key={field} value={field}>
                                    {field}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Subtitle Field</Label>
                    <Select
                        value={form.watch('display.subtitleField')}
                        onValueChange={(value) => form.setValue('display.subtitleField', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select field (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFields.map((field) => (
                                <SelectItem key={field} value={field}>
                                    {field}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
