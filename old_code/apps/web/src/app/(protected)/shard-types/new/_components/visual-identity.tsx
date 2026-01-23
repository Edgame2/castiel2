'use client'

import { Label } from '@/components/ui/label'
import { IconPicker } from '@/components/shard-types/icon-picker'
import { ColorPicker } from '@/components/shard-types/color-picker'
import { UseFormReturn } from 'react-hook-form'

interface VisualIdentitySectionProps {
    form: UseFormReturn<any>
}

export function VisualIdentitySection({ form }: VisualIdentitySectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Visual Identity</h3>
            <div className="grid gap-4">
                <div>
                    <Label>Icon</Label>
                    <IconPicker
                        value={form.watch('icon')}
                        onChange={(value) => form.setValue('icon', value)}
                    />
                </div>
                <div>
                    <Label>Color</Label>
                    <ColorPicker
                        value={form.watch('color')}
                        onChange={(value) => form.setValue('color', value)}
                    />
                </div>
            </div>
        </div>
    )
}
