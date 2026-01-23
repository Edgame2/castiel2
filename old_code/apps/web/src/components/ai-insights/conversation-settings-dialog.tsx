"use client"

import { useState, useEffect } from "react"
import { Settings2, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShardPicker } from "@/components/ui/shard-picker"
import { Badge } from "@/components/ui/badge"
import { useUpdateConversation, useConversation } from "@/hooks/use-insights"
import { toast } from "sonner"

interface ConversationSettingsDialogProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConversationSettingsDialog({
  conversationId,
  open,
  onOpenChange,
}: ConversationSettingsDialogProps) {
  const { data: conversation } = useConversation(conversationId)
  const updateConversation = useUpdateConversation()

  const [title, setTitle] = useState("")
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>('private')
  const [assistantId, setAssistantId] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [summary, setSummary] = useState("")

  // Initialize form when conversation data loads
  useEffect(() => {
    if (conversation) {
      setTitle(conversation.title || "")
      setVisibility(conversation.visibility || 'private')
      setAssistantId(conversation.assistantId || null)
      setTemplateId(conversation.templateId || null)
      setDefaultModelId(conversation.defaultModelId || null)
      setTags(conversation.tags || [])
      setSummary(conversation.summary || "")
    }
  }, [conversation])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!conversation) return

    try {
      await updateConversation.mutateAsync({
        id: conversationId,
        data: {
          title: title || undefined,
          visibility,
          assistantId: assistantId || undefined,
          templateId: templateId || undefined,
          defaultModelId: defaultModelId || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      })
      
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (!conversation) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conversation Settings</DialogTitle>
          <DialogDescription>
            Configure conversation properties, AI settings, and metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Conversation title"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={(value) => setVisibility(value as 'private' | 'shared' | 'public')}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private - Only owner can access</SelectItem>
                  <SelectItem value="shared">Shared - Participants can access</SelectItem>
                  <SelectItem value="public">Public - All tenant users can access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Optional conversation summary"
                rows={3}
              />
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">AI Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="assistant">AI Assistant</Label>
              <ShardPicker
                shardTypeId="c_assistant"
                value={assistantId}
                onChange={(value) => setAssistantId(typeof value === 'string' ? value : null)}
                placeholder="Select an assistant..."
                allowCreate={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Context Template</Label>
              <ShardPicker
                shardTypeId="c_contextTemplate"
                value={templateId}
                onChange={(value) => setTemplateId(typeof value === 'string' ? value : null)}
                placeholder="Select a context template..."
                allowCreate={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Default Model</Label>
              <ShardPicker
                shardTypeId="c_aimodel"
                value={defaultModelId}
                onChange={(value) => setDefaultModelId(typeof value === 'string' ? value : null)}
                placeholder="Select a default model..."
                allowCreate={false}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Tags</h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                />
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={!tagInput.trim()}>
                  Add
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateConversation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateConversation.isPending}>
            {updateConversation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings2 className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}






