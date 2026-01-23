'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ValidationWorkflowTabProps {
    validationRules?: any[]
    workflow?: any
}

export function ValidationWorkflowTab({ validationRules, workflow }: ValidationWorkflowTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Validation Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {validationRules?.map((rule, index) => (
                            <div key={index} className="p-3 border rounded-md">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline">{rule.type}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {rule.errorMessage}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {!validationRules || validationRules.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No validation rules defined
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            {workflow && (
                <Card>
                    <CardHeader>
                        <CardTitle>Workflow</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <div className="text-sm font-medium mb-2">Statuses</div>
                                <div className="flex flex-wrap gap-2">
                                    {workflow.statuses?.map((status: any, index: number) => (
                                        <Badge key={index} style={{ backgroundColor: status.color }}>
                                            {status.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-2">Default Status</div>
                                <Badge>{workflow.defaultStatus}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
