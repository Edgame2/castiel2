"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Sparkles, Loader2, Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useConversationTemplates, useCreateConversationFromTemplate } from "@/hooks/use-insights"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ConversationTemplate {
  id: string
  name: string
  description?: string
  category: string
  initialMessage: string
  titleSuggestion?: string
  projectScope: 'none' | 'optional' | 'required'
  variables?: Array<{ name: string; label?: string; type?: string; required?: boolean }>
  isPublic: boolean
  isSystem: boolean
  createdAt: string
}

interface ConversationTemplateSelectorProps {
  projectId?: string
  onConversationCreated?: (conversationId: string) => void
  trigger?: React.ReactNode
  className?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700',
  project: 'bg-purple-100 text-purple-700',
  sales: 'bg-green-100 text-green-700',
  support: 'bg-yellow-100 text-yellow-700',
  analysis: 'bg-orange-100 text-orange-700',
  custom: 'bg-gray-100 text-gray-700',
}

export function ConversationTemplateSelector({
  projectId,
  onConversationCreated,
  trigger,
  className,
}: ConversationTemplateSelectorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ConversationTemplate | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)
  const [variables, setVariables] = useState<Record<string, string>>({})

  const { data, isLoading } = useConversationTemplates({
    projectId,
    includeSystem: true,
  })
  const createFromTemplate = useCreateConversationFromTemplate()

  const templates: ConversationTemplate[] = data?.templates || []

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.initialMessage.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Category filter
    if (categoryFilter && template.category !== categoryFilter) {
      return false
    }

    // Project scope filter
    if (projectId) {
      // If project is provided, show templates with no scope, optional, or required
      return true
    } else {
      // If no project, exclude required project scope templates
      if (template.projectScope === 'required') {
        return false
      }
    }

    return true
  })

  // Group templates by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, ConversationTemplate[]>)

  const handleTemplateSelect = (template: ConversationTemplate) => {
    setSelectedTemplate(template)
    // Initialize variables from template
    if (template.variables && template.variables.length > 0) {
      const initialVars: Record<string, string> = {}
      template.variables.forEach((v) => {
        initialVars[v.name] = ''
      })
      setVariables(initialVars)
    } else {
      setVariables({})
    }
  }

  const handleCreate = async () => {
    if (!selectedTemplate) return

    try {
      const result = await createFromTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        options: {
          variables: Object.keys(variables).length > 0 ? variables : undefined,
          projectId,
        },
      })
      setOpen(false)
      setSelectedTemplate(null)
      setVariables({})
      setSearchQuery("")
      
      if (onConversationCreated) {
        onConversationCreated(result.conversationId)
      } else {
        router.push(`/chat/${result.conversationId}`)
      }
    } catch (error) {
      // Error handled by mutation
    }
  }

  const categories = Array.from(new Set(templates.map((t) => t.category)))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={!!trigger}>
        {trigger || <Button className={className}>Start from Template</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Conversation Template</DialogTitle>
          <DialogDescription>
            Start a new conversation using a pre-defined template. Templates can include initial messages,
            AI settings, and project-specific configurations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Template List */}
          <div className="w-1/2 flex flex-col space-y-4 border-r pr-4">
            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={categoryFilter || "all"}
                onValueChange={(value) => setCategoryFilter(value === "all" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template List */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery || categoryFilter
                    ? "No templates found matching your filters"
                    : "No templates available"}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                        {category}
                      </h3>
                      {categoryTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            selectedTemplate?.id === template.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm truncate">{template.name}</h4>
                                <Badge
                                  variant="secondary"
                                  className={cn("text-xs", CATEGORY_COLORS[template.category] || "")}
                                >
                                  {template.category}
                                </Badge>
                                {template.isSystem && (
                                  <Badge variant="outline" className="text-xs">
                                    System
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {template.description}
                                </p>
                              )}
                              {template.projectScope !== 'none' && (
                                <Badge variant="outline" className="text-xs">
                                  {template.projectScope === 'required' ? 'Requires Project' : 'Project Optional'}
                                </Badge>
                              )}
                            </div>
                            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Template Preview & Variables */}
          <div className="w-1/2 flex flex-col space-y-4">
            {selectedTemplate ? (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">{selectedTemplate.name}</h3>
                  {selectedTemplate.description && (
                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                  )}
                </div>

                {/* Initial Message Preview */}
                <div className="space-y-2">
                  <Label>Initial Message</Label>
                  <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">
                    {selectedTemplate.initialMessage}
                  </div>
                </div>

                {/* Variables Form */}
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Template Variables</Label>
                    <div className="space-y-2">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable.name} className="space-y-1">
                          <Label htmlFor={`var-${variable.name}`} className="text-xs">
                            {variable.label || variable.name}
                            {variable.required && <span className="text-destructive"> *</span>}
                          </Label>
                          <Input
                            id={`var-${variable.name}`}
                            value={variables[variable.name] || ""}
                            onChange={(e) =>
                              setVariables({ ...variables, [variable.name]: e.target.value })
                            }
                            placeholder={`Enter ${variable.label || variable.name}`}
                            required={variable.required}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTemplate.variables && selectedTemplate.variables.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    This template has no variables to fill in.
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Select a template to preview
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedTemplate || createFromTemplate.isPending}
          >
            {createFromTemplate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Conversation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}






