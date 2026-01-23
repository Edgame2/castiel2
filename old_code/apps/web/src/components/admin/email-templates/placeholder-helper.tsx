"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, X, Info, Copy } from "lucide-react"
import type { PlaceholderDefinition } from "@/types/email-template"
import { toast } from "sonner"

interface PlaceholderHelperProps {
  placeholders: PlaceholderDefinition[]
  onPlaceholderInsert?: (placeholder: string) => void
  onPlaceholderAdd?: (placeholder: PlaceholderDefinition) => void
  onPlaceholderRemove?: (name: string) => void
  editable?: boolean
}

export function PlaceholderHelper({
  placeholders,
  onPlaceholderInsert,
  onPlaceholderAdd,
  onPlaceholderRemove,
  editable = false,
}: PlaceholderHelperProps) {
  const [newPlaceholderName, setNewPlaceholderName] = useState("")
  const [newPlaceholderDesc, setNewPlaceholderDesc] = useState("")
  const [newPlaceholderExample, setNewPlaceholderExample] = useState("")
  const [newPlaceholderRequired, setNewPlaceholderRequired] = useState(false)

  const handleInsert = (name: string) => {
    const placeholderText = `{{${name}}}`
    onPlaceholderInsert?.(placeholderText)
    toast.success(`Inserted ${placeholderText}`)
  }

  const handleCopy = (name: string) => {
    const placeholderText = `{{${name}}}`
    navigator.clipboard.writeText(placeholderText)
    toast.success(`Copied ${placeholderText} to clipboard`)
  }

  const handleAdd = () => {
    if (!newPlaceholderName.trim()) {
      toast.error("Placeholder name is required")
      return
    }

    if (placeholders.find((p) => p.name === newPlaceholderName)) {
      toast.error("Placeholder already exists")
      return
    }

    onPlaceholderAdd?.({
      name: newPlaceholderName,
      description: newPlaceholderDesc,
      example: newPlaceholderExample,
      required: newPlaceholderRequired,
    })

    setNewPlaceholderName("")
    setNewPlaceholderDesc("")
    setNewPlaceholderExample("")
    setNewPlaceholderRequired(false)
    toast.success("Placeholder added")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Placeholders
        </CardTitle>
        <CardDescription>
          Available placeholders for this template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Placeholder (if editable) */}
        {editable && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
            <div className="text-sm font-medium">Add New Placeholder</div>
            <Input
              value={newPlaceholderName}
              onChange={(e) => setNewPlaceholderName(e.target.value)}
              placeholder="placeholder-name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAdd()
                }
              }}
            />
            <Input
              value={newPlaceholderDesc}
              onChange={(e) => setNewPlaceholderDesc(e.target.value)}
              placeholder="Description"
            />
            <Input
              value={newPlaceholderExample}
              onChange={(e) => setNewPlaceholderExample(e.target.value)}
              placeholder="Example value"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newPlaceholderRequired}
                onChange={(e) => setNewPlaceholderRequired(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm">Required</label>
            </div>
            <Button onClick={handleAdd} size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Placeholder
            </Button>
          </div>
        )}

        {/* Placeholder List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {placeholders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No placeholders defined
              </div>
            ) : (
              placeholders.map((placeholder) => (
                <div
                  key={placeholder.name}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {`{{${placeholder.name}}}`}
                        </code>
                        {placeholder.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {placeholder.description && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {placeholder.description}
                        </p>
                      )}
                      {placeholder.example && (
                        <p className="text-xs text-muted-foreground">
                          Example: <code className="bg-muted px-1 rounded">{placeholder.example}</code>
                        </p>
                      )}
                    </div>
                    {editable && onPlaceholderRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPlaceholderRemove(placeholder.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {onPlaceholderInsert && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInsert(placeholder.name)}
                        className="flex-1"
                      >
                        Insert
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(placeholder.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Usage Instructions */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-medium mb-1">Usage:</div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Use <code className="bg-muted px-1 rounded">{`{{placeholderName}}`}</code> in your template</li>
            <li>For nested properties: <code className="bg-muted px-1 rounded">{`{{user.name}}`}</code></li>
            <li>For conditionals: <code className="bg-muted px-1 rounded">{`{{#if condition}}...{{/if}}`}</code></li>
            <li>For loops: <code className="bg-muted px-1 rounded">{`{{#each items}}...{{/each}}`}</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}







