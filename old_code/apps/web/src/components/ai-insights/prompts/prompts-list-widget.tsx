"use client"

import { useState } from "react"
import { usePrompts } from "@/hooks/use-prompts"
import { Prompt, PromptScope } from "@/types/prompts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Loader2, Edit, Trash2, CheckCircle, Archive, MoreVertical, BarChart3 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useActivatePrompt, useArchivePrompt } from "@/hooks/use-prompts"
import { toast } from "sonner"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PromptsListWidgetProps {
    initialScope?: PromptScope;
    onEditPrompt?: (prompt: Prompt) => void;
    onCreatePrompt?: () => void;
    onViewAnalytics?: (prompt: Prompt) => void;
}

export function PromptsListWidget({ initialScope, onEditPrompt, onCreatePrompt, onViewAnalytics }: PromptsListWidgetProps) {
    const [search, setSearch] = useState("")
    const [scope, setScope] = useState<PromptScope | undefined>(initialScope)
    const [statusFilter, setStatusFilter] = useState<string>("")

    const { data: prompts, isLoading, error } = usePrompts({ scope, search })
    
    // Get scope from first prompt or use default
    const defaultScope = prompts?.[0]?.scope || scope || 'user'
    const activatePrompt = useActivatePrompt(defaultScope)
    const archivePrompt = useArchivePrompt(defaultScope)

    const handleActivate = async (prompt: Prompt) => {
        try {
            await activatePrompt.mutateAsync(prompt.id)
            toast.success("Prompt activated successfully")
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to activate prompt", 3, {
                errorMessage: errorObj.message,
                promptId: prompt.id,
            })
            toast.error("Failed to activate prompt")
        }
    }

    const handleArchive = async (prompt: Prompt) => {
        try {
            await archivePrompt.mutateAsync(prompt.id)
            toast.success("Prompt archived successfully")
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to archive prompt", 3, {
                errorMessage: errorObj.message,
                promptId: prompt.id,
            })
            toast.error("Failed to archive prompt")
        }
    }

    // Filter prompts by status if filter is set
    const filteredPrompts = statusFilter 
        ? prompts?.filter(p => p.status === statusFilter)
        : prompts

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search prompts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={scope || ""}
                        onChange={(e) => setScope(e.target.value as PromptScope || undefined)}
                    >
                        <option value="">All Scopes</option>
                        <option value="user">User</option>
                        <option value="tenant">Tenant</option>
                        <option value="system">System</option>
                    </select>
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                    </select>
                    {onCreatePrompt && (
                        <Button onClick={onCreatePrompt}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Prompt
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Insight Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Version</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading prompts...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-red-500">
                                    Failed to load prompts
                                </TableCell>
                            </TableRow>
                        ) : filteredPrompts?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No prompts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPrompts?.map((prompt) => (
                                <TableRow key={prompt.id}>
                                    <TableCell className="font-medium">
                                        <div>{prompt.name}</div>
                                        <div className="text-xs text-muted-foreground">{prompt.slug}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={prompt.scope === 'system' ? 'destructive' : prompt.scope === 'tenant' ? 'default' : 'secondary'}>
                                            {prompt.scope}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{prompt.insightType || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={prompt.status === 'active' ? 'border-green-500 text-green-500' : ''}>
                                            {prompt.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">v{prompt.version || 1}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {prompt.updatedBy?.at ? formatDistanceToNow(new Date(prompt.updatedBy.at), { addSuffix: true }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {onEditPrompt && (
                                                <Button variant="ghost" size="icon" onClick={() => onEditPrompt(prompt)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {onViewAnalytics && (
                                                <Button variant="ghost" size="icon" onClick={() => onViewAnalytics(prompt)}>
                                                    <BarChart3 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {onViewAnalytics && (
                                                        <DropdownMenuItem onClick={() => onViewAnalytics(prompt)}>
                                                            <BarChart3 className="mr-2 h-4 w-4" />
                                                            View Analytics
                                                        </DropdownMenuItem>
                                                    )}
                                                    {prompt.status !== 'active' && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleActivate(prompt)}
                                                            disabled={activatePrompt.isPending}
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Activate
                                                        </DropdownMenuItem>
                                                    )}
                                                    {prompt.status !== 'archived' && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleArchive(prompt)}
                                                            disabled={archivePrompt.isPending}
                                                        >
                                                            <Archive className="mr-2 h-4 w-4" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
