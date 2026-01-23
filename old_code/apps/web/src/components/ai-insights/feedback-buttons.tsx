'use client'

/**
 * FeedbackButtons Component
 * Allows users to provide feedback on AI responses
 */

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Copy, Check, RotateCcw, Flag, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useSubmitFeedback } from '@/hooks/use-insights'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

interface FeedbackButtonsProps {
  messageId: string
  content: string
  initialFeedback?: {
    thumbs?: 'up' | 'down'
    rating?: number
  }
  onRegenerate?: () => void
  className?: string
  showRegenerate?: boolean
}

const FEEDBACK_CATEGORIES = [
  { id: 'accurate', label: 'Accurate' },
  { id: 'helpful', label: 'Helpful' },
  { id: 'clear', label: 'Clear' },
  { id: 'detailed', label: 'Detailed' },
  { id: 'inaccurate', label: 'Inaccurate' },
  { id: 'unhelpful', label: 'Unhelpful' },
  { id: 'confusing', label: 'Confusing' },
  { id: 'incomplete', label: 'Incomplete' },
]

export function FeedbackButtons({
  messageId,
  content,
  initialFeedback,
  onRegenerate,
  className,
  showRegenerate = true,
}: FeedbackButtonsProps) {
  const [thumbs, setThumbs] = useState<'up' | 'down' | null>(initialFeedback?.thumbs || null)
  const [copied, setCopied] = useState(false)
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [reportAsHarmful, setReportAsHarmful] = useState(false)

  const submitFeedback = useSubmitFeedback()

  const handleThumbsUp = async () => {
    const newThumbs = thumbs === 'up' ? null : 'up'
    setThumbs(newThumbs)

    if (newThumbs) {
      await submitFeedback.mutateAsync({
        messageId,
        data: { thumbs: newThumbs },
      })
    }
  }

  const handleThumbsDown = async () => {
    const newThumbs = thumbs === 'down' ? null : 'down'
    setThumbs(newThumbs)

    if (newThumbs === 'down') {
      setShowDetailedFeedback(true)
    } else if (newThumbs) {
      await submitFeedback.mutateAsync({
        messageId,
        data: { thumbs: newThumbs },
      })
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 2)
      trackTrace('Failed to copy to clipboard', 2, {
        errorMessage: errorObj.message,
      })
    }
  }

  const handleSubmitDetailedFeedback = async () => {
    await submitFeedback.mutateAsync({
      messageId,
      data: {
        thumbs: 'down',
        categories: selectedCategories,
        comment: comment || undefined,
        reportAsHarmful,
      },
    })
    setShowDetailedFeedback(false)
    setSelectedCategories([])
    setComment('')
    setReportAsHarmful(false)
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <>
      <div className={cn('flex items-center gap-1', className)}>
        {/* Thumbs Up */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-muted-foreground hover:text-foreground',
            thumbs === 'up' && 'text-green-500 hover:text-green-600'
          )}
          onClick={handleThumbsUp}
          disabled={submitFeedback.isPending}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="sr-only">Good response</span>
        </Button>

        {/* Thumbs Down */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-muted-foreground hover:text-foreground',
            thumbs === 'down' && 'text-red-500 hover:text-red-600'
          )}
          onClick={handleThumbsDown}
          disabled={submitFeedback.isPending}
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="sr-only">Bad response</span>
        </Button>

        {/* Copy */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span className="sr-only">Copy to clipboard</span>
        </Button>

        {/* Regenerate */}
        {showRegenerate && onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onRegenerate}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">Regenerate response</span>
          </Button>
        )}

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowDetailedFeedback(true)}>
              Provide detailed feedback
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setReportAsHarmful(true)
                setShowDetailedFeedback(true)
              }}
            >
              <Flag className="h-4 w-4 mr-2" />
              Report as harmful
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Detailed Feedback Dialog */}
      <Dialog open={showDetailedFeedback} onOpenChange={setShowDetailedFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reportAsHarmful ? 'Report Harmful Content' : 'Provide Feedback'}
            </DialogTitle>
            <DialogDescription>
              {reportAsHarmful
                ? 'Help us understand what was harmful about this response.'
                : 'Help us improve by sharing what went wrong with this response.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>What was wrong?</Label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_CATEGORIES.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCategory(category.id)}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="feedback-comment">Additional comments (optional)</Label>
              <Textarea
                id="feedback-comment"
                placeholder="Tell us more about what went wrong..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            {/* Report as Harmful Checkbox */}
            {!reportAsHarmful && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="report-harmful"
                  checked={reportAsHarmful}
                  onCheckedChange={(checked) => setReportAsHarmful(checked as boolean)}
                />
                <Label htmlFor="report-harmful" className="text-sm font-normal">
                  This response is harmful or inappropriate
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailedFeedback(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDetailedFeedback}
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}











