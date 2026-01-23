'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ShardTypeCategory } from '@/types/shard-types'
import { UseFormReturn } from 'react-hook-form'

interface BasicInformationSectionProps {
    form: UseFormReturn<any>
    isSuperAdmin?: boolean
}

export function BasicInformationSection({ form, isSuperAdmin = false }: BasicInformationSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-4">
                <div>
                    <Label>Name *</Label>
                    <Input
                        {...form.register('name')}
                        placeholder="lowercase-kebab-case"
                    />
                    {form.formState.errors.name && (
                        <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.name.message as string}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Display Name *</Label>
                    <Input {...form.register('displayName')} placeholder="Display Name" />
                    {form.formState.errors.displayName && (
                        <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.displayName.message as string}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Description</Label>
                    <Textarea {...form.register('description')} rows={3} />
                </div>
                <div>
                    <Label>Category *</Label>
                    <Select
                        value={form.watch('category')}
                        onValueChange={(value) => form.setValue('category', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(ShardTypeCategory).map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {isSuperAdmin && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            checked={form.watch('isGlobal')}
                            onCheckedChange={(checked) =>
                                form.setValue('isGlobal', checked as boolean)
                            }
                        />
                        <Label>Global (system-wide)</Label>
                    </div>
                )}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        checked={form.watch('isTemplate')}
                        onCheckedChange={(checked) => form.setValue('isTemplate', checked as boolean)}
                    />
                    <Label>Template (allow cloning)</Label>
                </div>
            </div>
        </div>
    )
}
