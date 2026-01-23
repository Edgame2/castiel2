/**
 * AI Tools Tab
 * Manages AI function calling tools available to the system
 */

import { useState } from 'react'
import {
  Wrench,
  Shield,
  CheckCircle2,
  XCircle,
  Info,
  Code,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAITools, useAITool } from '@/hooks/use-ai-settings'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function AIToolsTab() {
  const { data, isLoading, error } = useAITools()
  const [selectedTool, setSelectedTool] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load AI tools: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  const tools = data?.tools || []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            AI Function Calling Tools
          </CardTitle>
          <CardDescription>
            Manage the function calling tools available to AI models. Tools are automatically
            filtered based on user permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tools.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No tools available</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No function calling tools are currently registered in the system.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.name}>
                    <TableCell className="font-mono font-medium">{tool.name}</TableCell>
                    <TableCell className="max-w-md">{tool.description}</TableCell>
                    <TableCell>
                      {tool.requiresPermission ? (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {tool.requiresPermission}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No permission required</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tool.enabledByDefault ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Disabled by default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTool(tool.name)}
                          >
                            <Info className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Wrench className="h-5 w-5" />
                              {tool.name}
                            </DialogTitle>
                            <DialogDescription>
                              Function calling tool details and parameters
                            </DialogDescription>
                          </DialogHeader>
                          <ToolDetailsDialog toolName={tool.name} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ToolDetailsDialog({ toolName }: { toolName: string }) {
  const { data: tool, isLoading } = useAITool(toolName)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!tool) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Tool not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Description</h4>
        <p className="text-sm text-muted-foreground">{tool.description}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Permission Requirements</h4>
        {tool.requiresPermission ? (
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {tool.requiresPermission}
          </Badge>
        ) : (
          <Badge variant="secondary">No permission required</Badge>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Default Status</h4>
        {tool.enabledByDefault ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Enabled by default
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Disabled by default
          </Badge>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Code className="h-4 w-4" />
          Parameters Schema
        </h4>
        <ScrollArea className="h-64 w-full rounded-md border p-4">
          <pre className="text-xs">
            {JSON.stringify(tool.parameters, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    </div>
  )
}









