import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShardTypeBadge } from "./shard-type-badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, AlertCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShardType } from "@/types/api"

interface SchemaInheritanceTreeProps {
    shardTypeId: string
    shardTypes: ShardType[]
    onNavigate?: (shardTypeId: string) => void
}

export function SchemaInheritanceTree({
    shardTypeId,
    shardTypes,
    onNavigate,
}: SchemaInheritanceTreeProps) {
    const currentType = shardTypes.find((t) => t.id === shardTypeId)

    if (!currentType) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>ShardType not found</AlertDescription>
            </Alert>
        )
    }

    // Build inheritance chain from root to current
    const inheritanceChain = React.useMemo(() => {
        const chain: ShardType[] = [currentType]
        let current = currentType

        while (current.parentShardTypeId) {
            const parent = shardTypes.find((t) => t.id === current.parentShardTypeId)
            if (!parent) break
            chain.unshift(parent)
            current = parent
        }

        return chain
    }, [currentType, shardTypes])

    // Get child types
    const childTypes = React.useMemo(() => {
        return shardTypes.filter((t) => t.parentShardTypeId === shardTypeId)
    }, [shardTypeId, shardTypes])

    // Get inherited and local fields
    const { inheritedFields, localFields } = React.useMemo(() => {
        const inherited: Record<string, any> = {}
        const local: Record<string, any> = {}

        // Collect inherited fields from ancestors
        inheritanceChain.slice(0, -1).forEach((ancestor) => {
            const ancestorProps = ancestor.schema?.properties || {}
            Object.entries(ancestorProps).forEach(([name, schema]) => {
                inherited[name] = {
                    ...schema,
                    source: ancestor,
                }
            })
        })

        // Local fields
        const currentProps = currentType.schema?.properties || {}
        Object.entries(currentProps).forEach(([name, schema]) => {
            local[name] = schema
        })

        return { inheritedFields: inherited, localFields: local }
    }, [inheritanceChain, currentType])

    const overriddenFields = Object.keys(localFields).filter(
        (name) => name in inheritedFields
    )

    return (
        <div className="space-y-4">
            {/* Inheritance Chain */}
            {inheritanceChain.length > 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Inheritance Chain</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 flex-wrap">
                            {inheritanceChain.map((type, index) => (
                                <React.Fragment key={type.id}>
                                    {index > 0 && (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <ShardTypeBadge
                                        shardType={type}
                                        onClick={
                                            onNavigate ? () => onNavigate(type.id) : undefined
                                        }
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Fields Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Schema Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Inherited Fields */}
                    {Object.keys(inheritedFields).length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                Inherited Fields
                                <Badge variant="secondary" className="text-xs">
                                    {Object.keys(inheritedFields).length}
                                </Badge>
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(inheritedFields).map(([name, field]: [string, any]) => (
                                    <FieldItem
                                        key={name}
                                        name={name}
                                        field={field}
                                        inherited
                                        source={field.source}
                                        overridden={overriddenFields.includes(name)}
                                        onNavigate={onNavigate}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Local Fields */}
                    {Object.keys(localFields).length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                Local Fields
                                <Badge variant="default" className="text-xs">
                                    {Object.keys(localFields).length}
                                </Badge>
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(localFields).map(([name, field]: [string, any]) => (
                                    <FieldItem
                                        key={name}
                                        name={name}
                                        field={field}
                                        overridden={overriddenFields.includes(name)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {Object.keys(inheritedFields).length === 0 &&
                        Object.keys(localFields).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No fields defined
                            </p>
                        )}
                </CardContent>
            </Card>

            {/* Child Types */}
            {childTypes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Child Types ({childTypes.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {childTypes.map((child) => (
                                <div
                                    key={child.id}
                                    className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <ShardTypeBadge shardType={child} />
                                    {onNavigate && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onNavigate(child.id)}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

/**
 * Single field item display
 */
function FieldItem({
    name,
    field,
    inherited = false,
    source,
    overridden = false,
    onNavigate,
}: {
    name: string
    field: any
    inherited?: boolean
    source?: ShardType
    overridden?: boolean
    onNavigate?: (id: string) => void
}) {
    const [isExpanded, setIsExpanded] = React.useState(false)

    return (
        <div
            className={cn(
                "p-3 border rounded-lg",
                inherited && "bg-muted/50",
                overridden && "border-amber-500 dark:border-amber-600"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{name}</span>
                        <Badge variant="outline" className="text-xs">
                            {field.type}
                        </Badge>
                        {overridden && (
                            <Badge variant="secondary" className="text-xs text-amber-600">
                                Overridden
                            </Badge>
                        )}
                    </div>

                    {field.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {field.description}
                        </p>
                    )}

                    {inherited && source && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">From:</span>
                            <ShardTypeBadge
                                shardType={source}
                                size="sm"
                                onClick={onNavigate ? () => onNavigate(source.id) : undefined}
                            />
                        </div>
                    )}

                    {/* Field constraints */}
                    {(field.minLength ||
                        field.maxLength ||
                        field.minimum ||
                        field.maximum ||
                        field.pattern ||
                        field.enum) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="h-auto p-0 mt-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                                {isExpanded ? "Hide" : "Show"} constraints
                            </Button>
                        )}

                    {isExpanded && (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground pl-4 border-l-2">
                            {field.minLength && <div>Min length: {field.minLength}</div>}
                            {field.maxLength && <div>Max length: {field.maxLength}</div>}
                            {field.minimum !== undefined && <div>Min: {field.minimum}</div>}
                            {field.maximum !== undefined && <div>Max: {field.maximum}</div>}
                            {field.pattern && <div>Pattern: <code className="text-xs">{field.pattern}</code></div>}
                            {field.enum && (
                                <div>
                                    Enum: {field.enum.map((v: string) => <Badge key={v} variant="outline" className="text-xs mr-1">{v}</Badge>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * Loading skeleton
 */
export function SchemaInheritanceTreeSkeleton() {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
