'use client'

/**
 * Conversation Export Dialog Component
 * Dialog for exporting conversations to PDF, Markdown, or JSON
 */

import { useState } from 'react'
import { Download, FileText, FileCode, FileJson, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { useExportConversation } from '@/hooks/use-insights'
import { format } from 'date-fns'

interface ConversationExportDialogProps {
  conversationId: string
  conversationTitle?: string
  trigger?: React.ReactNode
}

export function ConversationExportDialog({
  conversationId,
  conversationTitle,
  trigger,
}: ConversationExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<'pdf' | 'markdown' | 'json'>('pdf')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [includeEditHistory, setIncludeEditHistory] = useState(true)
  const [includeContextSources, setIncludeContextSources] = useState(true)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const exportMutation = useExportConversation()

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        conversationId,
        format,
        options: {
          includeArchived,
          includeEditHistory,
          includeContextSources,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      })
      setOpen(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Export {conversationTitle || 'this conversation'} to your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as typeof format)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="format-pdf" />
                <Label htmlFor="format-pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="markdown" id="format-markdown" />
                <Label htmlFor="format-markdown" className="flex items-center gap-2 cursor-pointer">
                  <FileCode className="h-4 w-4" />
                  Markdown
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-archived"
                  checked={includeArchived}
                  onCheckedChange={(checked) => setIncludeArchived(checked === true)}
                />
                <Label htmlFor="include-archived" className="cursor-pointer">
                  Include archived messages
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-edit-history"
                  checked={includeEditHistory}
                  onCheckedChange={(checked) => setIncludeEditHistory(checked === true)}
                />
                <Label htmlFor="include-edit-history" className="cursor-pointer">
                  Include message edit history
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-context-sources"
                  checked={includeContextSources}
                  onCheckedChange={(checked) => setIncludeContextSources(checked === true)}
                />
                <Label htmlFor="include-context-sources" className="cursor-pointer">
                  Include context sources and citations
                </Label>
              </div>
            </div>
          </div>

          {/* Date Range (Optional) */}
          <div className="space-y-3">
            <Label>Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="from-date" className="text-xs text-muted-foreground">
                  From
                </Label>
                <input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date" className="text-xs text-muted-foreground">
                  To
                </Label>
                <input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={exportMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}






