'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SchemaTabProps {
    schema: any
}

export function SchemaTab({ schema }: SchemaTabProps) {
    const fields = schema?.fields || {}

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fields</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {Object.entries(fields).map(([name, field]: [string, any]) => (
                        <div key={name} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-medium">{field.label || name}</div>
                                <Badge variant="outline">{field.type}</Badge>
                            </div>
                            {field.description && (
                                <div className="text-sm text-muted-foreground">{field.description}</div>
                            )}
                            <div className="flex gap-2 mt-2">
                                {field.required && (
                                    <Badge variant="secondary" className="text-xs">
                                        Required
                                    </Badge>
                                )}
                                {field.readOnly && (
                                    <Badge variant="secondary" className="text-xs">
                                        Read-only
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                    {Object.keys(fields).length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No fields defined
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
