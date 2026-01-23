'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react'

interface FieldGroup {
    name: string
    displayName?: string
    fields: string[]
    collapsible?: boolean
    collapsed?: boolean
    order?: number
}

interface FieldGroupBuilderProps {
    value: FieldGroup[]
    onChange: (groups: FieldGroup[]) => void
    availableFields: string[]
}

export function FieldGroupBuilder({ value, onChange, availableFields }: FieldGroupBuilderProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [formData, setFormData] = useState<FieldGroup>({
        name: '',
        fields: [],
    })

    const handleAdd = () => {
        if (!formData.name || formData.fields.length === 0) return
        onChange([...value, { ...formData, order: value.length }])
        setFormData({ name: '', fields: [] })
    }

    const handleUpdate = () => {
        if (editingIndex === null) return
        const updated = [...value]
        updated[editingIndex] = formData
        onChange(updated)
        setEditingIndex(null)
        setFormData({ name: '', fields: [] })
    }

    const handleDelete = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    const handleEdit = (index: number) => {
        setEditingIndex(index)
        setFormData(value[index])
    }

    const toggleField = (field: string) => {
        const fields = formData.fields.includes(field)
            ? formData.fields.filter((f) => f !== field)
            : [...formData.fields, field]
        setFormData({ ...formData, fields })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Field Groups</h3>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingIndex !== null ? 'Edit' : 'Add'} Field Group
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Group Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., contact_info"
                                />
                            </div>
                            <div>
                                <Label>Display Name</Label>
                                <Input
                                    value={formData.displayName || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, displayName: e.target.value })
                                    }
                                    placeholder="e.g., Contact Information"
                                />
                            </div>
                            <div>
                                <Label>Fields</Label>
                                <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                                    {availableFields.map((field) => (
                                        <div key={field} className="flex items-center space-x-2">
                                            <Checkbox
                                                checked={formData.fields.includes(field)}
                                                onCheckedChange={() => toggleField(field)}
                                            />
                                            <Label>{field}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={formData.collapsible}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, collapsible: checked as boolean })
                                    }
                                />
                                <Label>Collapsible</Label>
                            </div>
                            {formData.collapsible && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={formData.collapsed}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, collapsed: checked as boolean })
                                        }
                                    />
                                    <Label>Default Collapsed</Label>
                                </div>
                            )}
                            <Button onClick={editingIndex !== null ? handleUpdate : handleAdd}>
                                {editingIndex !== null ? 'Update' : 'Add'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {value.map((group, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-md"
                    >
                        <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <div>
                                <div className="font-medium">{group.displayName || group.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    {group.fields.length} fields
                                </div>
                            </div>
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
