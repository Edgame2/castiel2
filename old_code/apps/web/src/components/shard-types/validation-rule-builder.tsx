'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ValidationRuleType } from '@/types/shard-types'
import { Plus, Trash2, Edit } from 'lucide-react'

interface ValidationCondition {
    field: string
    operator: string
    value: any
}

interface ValidationRule {
    type: ValidationRuleType
    condition?: ValidationCondition
    requiredFields?: string[]
    errorMessage: string
    customValidator?: string
}

interface ValidationRuleBuilderProps {
    value: ValidationRule[]
    onChange: (rules: ValidationRule[]) => void
    availableFields: string[]
}

export function ValidationRuleBuilder({ value, onChange, availableFields }: ValidationRuleBuilderProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [formData, setFormData] = useState<ValidationRule>({
        type: ValidationRuleType.REQUIRED_IF,
        errorMessage: '',
    })

    const handleAdd = () => {
        if (!formData.errorMessage) return
        onChange([...value, formData])
        setFormData({ type: ValidationRuleType.REQUIRED_IF, errorMessage: '' })
    }

    const handleUpdate = () => {
        if (editingIndex === null) return
        const updated = [...value]
        updated[editingIndex] = formData
        onChange(updated)
        setEditingIndex(null)
        setFormData({ type: ValidationRuleType.REQUIRED_IF, errorMessage: '' })
    }

    const handleDelete = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    const handleEdit = (index: number) => {
        setEditingIndex(index)
        setFormData(value[index])
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Validation Rules</h3>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingIndex !== null ? 'Edit' : 'Add'} Validation Rule
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Rule Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) =>
                                        setFormData({ ...formData, type: v as ValidationRuleType })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ValidationRuleType.REQUIRED_IF}>
                                            Required If
                                        </SelectItem>
                                        <SelectItem value={ValidationRuleType.CONDITIONAL}>
                                            Conditional
                                        </SelectItem>
                                        <SelectItem value={ValidationRuleType.UNIQUE}>
                                            Unique
                                        </SelectItem>
                                        <SelectItem value={ValidationRuleType.CUSTOM}>
                                            Custom
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Error Message</Label>
                                <Input
                                    value={formData.errorMessage}
                                    onChange={(e) =>
                                        setFormData({ ...formData, errorMessage: e.target.value })
                                    }
                                    placeholder="Error message"
                                />
                            </div>
                            <Button onClick={editingIndex !== null ? handleUpdate : handleAdd}>
                                {editingIndex !== null ? 'Update' : 'Add'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {value.map((rule, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-md"
                    >
                        <div>
                            <div className="font-medium">{rule.type}</div>
                            <div className="text-sm text-muted-foreground">{rule.errorMessage}</div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(index)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
