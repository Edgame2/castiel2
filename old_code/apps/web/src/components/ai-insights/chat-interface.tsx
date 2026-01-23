'use client'

/**
 * ChatInterface Component
 * Full-featured chat interface for AI Insights
 */

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, StopCircle, Paperclip, Sparkles, Bot, User, AlertCircle, Loader2, Image, Music, Video, ExternalLink, Edit2, History, RefreshCw, Archive, Link2, ChevronUp, Share2, FileImage, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useChat, UseChatOptions, useEditMessage, useRegenerateAfterEdit, useRegenerateMessage, useMessageEditHistory, useConversationRealtime, useTypingIndicator } from '@/hooks/use-insights'
import { StreamingText, StreamingTextSkeleton } from './streaming-text'
import { FeedbackButtons } from './feedback-buttons'
import { ShareInsightDialog } from '@/components/collaborative-insights'
import { ChatMessage } from '@/lib/api/insights'
import type { ModelUnavailableResponse } from '@/lib/api/insights'
import { EntityAutocomplete, useEntityMentionDetection } from './entity-autocomplete'
import { EntityContextSidebar } from './entity-context-sidebar'
import { ThreadMembersPanel } from './thread-members-panel'
import { MessageComments } from './message-comments'
import { useConversation } from '@/hooks/use-insights'
import { Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AIInsightErrorDisplay } from './error-handler'
import { MultimodalAssetUpload } from './multimodal-asset-upload'
import { MultimodalAssetDisplay } from './multimodal-asset-display'
import { GroundingWarning } from '@/components/ai-chat/grounding-warning'
import { ContextQualityIndicator } from '@/components/ai-chat/context-quality-indicator'
import { useMultimodalAssets } from '@/hooks/use-multimodal-assets'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  conversationId?: string
  assistantId?: string
  assistantName?: string
  modelId?: string
  scope?: UseChatOptions['scope']
  placeholder?: string
  welcomeMessage?: string
  suggestedQuestions?: string[]
  className?: string
  onConversationCreated?: (conversationId: string) => void
  projectId?: string
}

/**
 * ChatInterface - Full chat UI with streaming support
 */
export function ChatInterface({
  conversationId,
  assistantId,
  assistantName = 'AI Assistant',
  modelId,
  scope,
  placeholder = 'Ask me anything...',
  welcomeMessage,
  suggestedQuestions,
  className,
  onConversationCreated,
  projectId,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showEntityAutocomplete, setShowEntityAutocomplete] = useState(false)
  const [showEntitySidebar, setShowEntitySidebar] = useState(true)
  const [showThreadSidebar, setShowThreadSidebar] = useState(false)
  const [showAssetsSidebar, setShowAssetsSidebar] = useState(false)
  const [pendingAssetIds, setPendingAssetIds] = useState<string[]>([]) // Track assets uploaded before sending message
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)

  // Detect entity mentions
  const mentionDetection = useEntityMentionDetection(input, cursorPosition)

  const {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    stopGeneration,
    conversationId: currentConversationId,
  } = useChat({
    conversationId,
    assistantId,
    modelId,
    scope,
    onMessageStart: (messageId) => {
      // Message started streaming
    },
    onMessageComplete: (response) => {
      // Message complete
      if (currentConversationId && !conversationId) {
        onConversationCreated?.(currentConversationId)
      }
    },
  })

  // Fetch assets for the conversation (after currentConversationId is defined)
  const { data: assetsData } = useMultimodalAssets({
    conversationId: currentConversationId || conversationId,
    limit: 50,
  })
  const conversationAssets = assetsData?.assets || []

  // Get conversation details to check for threadId and status
  const { data: conversationData } = useConversation(conversationId || '', {
    includeMessages: false,
  })
  const threadId = conversationData?.threadId
  const isArchived = conversationData?.status === 'archived'

  // Real-time updates
  useConversationRealtime(currentConversationId || conversationId)

  // Typing indicators
  const { typingUsers, startTyping, debouncedStopTyping } = useTypingIndicator(
    currentConversationId || conversationId
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Handle input change for typing indicators
  useEffect(() => {
    if (input.trim().length > 0) {
      startTyping()
      debouncedStopTyping()
    } else {
      debouncedStopTyping()
    }
  }, [input, startTyping, debouncedStopTyping])

  // Show/hide entity autocomplete based on @mention detection
  useEffect(() => {
    setShowEntityAutocomplete(!!mentionDetection && mentionDetection.query.length >= 0)
  }, [mentionDetection])

  // Handle entity selection
  const handleEntitySelect = (entity: { shardId: string; name: string; shardType: string }) => {
    if (!mentionDetection || !textareaRef.current) return

    const beforeMention = input.substring(0, mentionDetection.startPos)
    const afterMention = input.substring(mentionDetection.endPos)
    const newInput = `${beforeMention}@${entity.name}${afterMention}`

    setInput(newInput)
    setShowEntityAutocomplete(false)

    // Set cursor after inserted entity
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionDetection.startPos + entity.name.length + 1
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        setCursorPosition(newCursorPos)
      }
    }, 0)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isArchived) return

    // Send message with pending asset IDs
    sendMessage(input, pendingAssetIds.length > 0 ? pendingAssetIds : undefined)
    
    // Clear input and pending assets
    setInput('')
    setPendingAssetIds([])

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    } else {
      // Start typing indicator on any key press
      startTyping()
    }
  }

  // Handle input change for typing indicators
  useEffect(() => {
    if (input.trim().length > 0) {
      startTyping()
      debouncedStopTyping()
    } else {
      debouncedStopTyping()
    }
  }, [input, startTyping, debouncedStopTyping])

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    textareaRef.current?.focus()
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-6">
          {/* Archived Notice */}
          {isArchived && (
            <Alert className="mb-4">
              <Archive className="h-4 w-4" />
              <AlertTitle>Archived Conversation</AlertTitle>
              <AlertDescription>
                This conversation is archived and read-only. You can view messages but cannot send new ones.
              </AlertDescription>
            </Alert>
          )}

          {/* Welcome Message */}
          {messages.length === 0 && !isArchived && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{assistantName}</h2>
              {welcomeMessage && (
                <p className="text-muted-foreground mb-6">{welcomeMessage}</p>
              )}

              {/* Suggested Questions */}
              {suggestedQuestions && suggestedQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-left"
                        onClick={() => handleSuggestedQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => {
            // Check if this is the first message after archived section
            // (heuristic: if previous message is much older, likely archived boundary)
            const prevMessage = index > 0 ? messages[index - 1] : null
            const isArchivedBoundary = prevMessage && 
              new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 24 * 60 * 60 * 1000 // 24 hours gap
            
            return (
              <div key={message.id}>
                {/* Archived Section Divider */}
                {isArchivedBoundary && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-border" />
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border">
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Archived Messages
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  assistantName={assistantName}
                  conversationId={currentConversationId || conversationId}
                  projectId={projectId}
                />
              </div>
            )
          })}

          {/* Loading Indicator */}
          {isLoading && !isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pt-1">
                <StreamingTextSkeleton lines={2} />
              </div>
            </div>
          )}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Entity Context Sidebar */}
        {showEntitySidebar && <EntityContextSidebar messages={messages} onClose={() => setShowEntitySidebar(false)} />}
        
        {/* Thread Members Sidebar */}
        {showThreadSidebar && threadId && (
          <ThreadMembersPanel
            threadId={threadId}
            currentConversationId={conversationId}
            onClose={() => setShowThreadSidebar(false)}
          />
        )}

        {/* Assets Sidebar */}
        {showAssetsSidebar && conversationAssets.length > 0 && (
          <div className="w-80 border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Attached Files</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowAssetsSidebar(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {conversationAssets.map((asset) => (
                  <MultimodalAssetDisplay
                    key={asset.id}
                    assetId={asset.id}
                    showDetails={false}
                    className="border"
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2">
            {/* Thread Sidebar Toggle */}
            {threadId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn('shrink-0 text-muted-foreground', showThreadSidebar && 'text-primary')}
                      onClick={() => setShowThreadSidebar(!showThreadSidebar)}
                    >
                      <Hash className="h-5 w-5" />
                      <span className="sr-only">Toggle thread sidebar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showThreadSidebar ? 'Hide thread members' : 'Show thread members'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Entity Sidebar Toggle */}
            {(() => {
              const hasEntities = messages.some(m => 
                (m.contextSources && m.contextSources.length > 0) || 
                (m.citations && m.citations.length > 0)
              )
              if (!hasEntities) return null
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn('shrink-0 text-muted-foreground', showEntitySidebar && 'text-primary')}
                        onClick={() => setShowEntitySidebar(!showEntitySidebar)}
                      >
                        <Link2 className="h-5 w-5" />
                        <span className="sr-only">Toggle entity sidebar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {showEntitySidebar ? 'Hide linked entities' : 'Show linked entities'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })()}

            {/* Assets Sidebar Toggle */}
            {conversationAssets.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn('shrink-0 text-muted-foreground', showAssetsSidebar && 'text-primary')}
                      onClick={() => setShowAssetsSidebar(!showAssetsSidebar)}
                    >
                      <FileImage className="h-5 w-5" />
                      {conversationAssets.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                          {conversationAssets.length}
                        </span>
                      )}
                      <span className="sr-only">Toggle assets sidebar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showAssetsSidebar ? 'Hide attached files' : `Show attached files (${conversationAssets.length})`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Attachment Button */}
            <MultimodalAssetUpload
              conversationId={currentConversationId || conversationId}
              onAssetUploaded={(assetId, url) => {
                // Add to pending assets to link when message is sent
                setPendingAssetIds((prev) => [...prev, assetId])
                toast.success('File uploaded and processing started')
              }}
            />

            {/* Text Input */}
            <div ref={inputContainerRef} className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setCursorPosition(e.target.selectionStart)
                }}
                onKeyDown={(e) => {
                  handleKeyDown(e)
                  // Update cursor position
                  if (textareaRef.current) {
                    setTimeout(() => {
                      setCursorPosition(textareaRef.current?.selectionStart || 0)
                    }, 0)
                  }
                }}
                onSelect={(e) => {
                  if (textareaRef.current) {
                    setCursorPosition(textareaRef.current.selectionStart)
                  }
                }}
                onClick={(e) => {
                  if (textareaRef.current) {
                    setCursorPosition(textareaRef.current.selectionStart)
                  }
                }}
                placeholder={isArchived ? 'This conversation is archived and read-only' : placeholder}
                className="min-h-[44px] max-h-[200px] resize-none pr-12"
                rows={1}
                disabled={isLoading || isArchived}
              />

              {/* Entity Autocomplete */}
              {showEntityAutocomplete && mentionDetection && (
                <EntityAutocomplete
                  query={mentionDetection.query}
                  projectId={projectId}
                  onSelect={handleEntitySelect}
                  onClose={() => setShowEntityAutocomplete(false)}
                  position={
                    textareaRef.current && inputContainerRef.current
                      ? {
                          top: -200, // Above the input
                          left: 0,
                        }
                      : undefined
                  }
                />
              )}
            </div>

            {/* Send/Stop Button */}
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={stopGeneration}
                className="shrink-0"
              >
                <StopCircle className="h-5 w-5" />
                <span className="sr-only">Stop generation</span>
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || isArchived}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </div>

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}

/**
 * ModelUnavailableError - Display when model selection fails
 */
function ModelUnavailableError({
  error,
  onRetry,
}: {
  error: ModelUnavailableResponse
  onRetry?: () => void
}) {
  const getIcon = () => {
    if (error.error === 'CONTENT_TYPE_UNSUPPORTED') {
      if (error.availableContentTypes?.includes('image')) return <Image className="h-5 w-5" />
      if (error.availableContentTypes?.includes('audio')) return <Music className="h-5 w-5" />
      if (error.availableContentTypes?.includes('video')) return <Video className="h-5 w-5" />
    }
    return <AlertCircle className="h-5 w-5" />
  }

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 space-y-3">
          <AlertTitle className="text-base font-semibold">{error.message}</AlertTitle>
          <AlertDescription className="space-y-3">
            {/* Suggested Action */}
            <div className="text-sm">
              <div className="font-medium mb-1">What you can do:</div>
              <p className="text-muted-foreground">{error.suggestedAction}</p>
            </div>

            {/* Available Alternatives */}
            {error.availableAlternatives && error.availableAlternatives.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-2">Available models:</div>
                <div className="space-y-2">
                  {error.availableAlternatives.map((alt) => (
                    <div
                      key={alt.modelId}
                      className="flex items-start gap-2 p-2 rounded-md bg-background/50 border border-border/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{alt.modelName}</div>
                        <div className="text-xs text-muted-foreground">
                          {alt.provider} • {alt.capabilities.join(', ')}
                        </div>
                        <div className="text-xs mt-1">{alt.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Content Types */}
            {error.availableContentTypes && error.availableContentTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {error.availableContentTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a href="/settings/ai" target="_blank" rel="noopener noreferrer">
                  Configure AI Models
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
              {error.error === 'CONTENT_TYPE_UNSUPPORTED' && onRetry && (
                <Button size="sm" onClick={onRetry}>
                  Use Text Response
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

/**
 * MessageBubble - Individual message display
 */
function MessageBubble({
  message,
  assistantName,
  conversationId,
  projectId,
}: {
  message: ChatMessage
  assistantName: string
  conversationId?: string | null
  projectId?: string
}) {
  const isUser = message.role === 'user'
  
  // Fetch assets attached to this message
  const { data: messageAssetsData } = useMultimodalAssets({
    messageId: message.id,
    limit: 20,
  })
  const messageAssets = messageAssetsData?.assets || []
  const isError = message.status === 'error' || message.contentType === 'error'
  const isStreaming = message.status === 'streaming'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const editMessage = useEditMessage()
  const regenerateAfterEdit = useRegenerateAfterEdit()
  const regenerateMessage = useRegenerateMessage()
  const { data: editHistory } = useMessageEditHistory(
    conversationId || '',
    message.id,
    !!conversationId && isUser && !!message.editedAt
  )

  // Handle message regeneration for assistant messages
  const handleRegenerate = async () => {
    if (!conversationId || !message.id) return
    try {
      await regenerateMessage.mutateAsync({
        messageId: message.id,
        conversationId,
      })
    } catch (error) {
      // Error is handled by the hook (toast notification)
    }
  }

  // Try to parse model unavailable error
  let modelUnavailableError: ModelUnavailableResponse | null = null
  if (isError && !isUser && message.content) {
    try {
      const parsed = JSON.parse(message.content)
      if (parsed.error && ['MODEL_UNAVAILABLE', 'NO_CONNECTIONS', 'CONTENT_TYPE_UNSUPPORTED'].includes(parsed.error)) {
        modelUnavailableError = parsed
      }
    } catch {
      // Not a model unavailable error
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {isUser ? (
          <>
            <AvatarFallback className="bg-secondary">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarFallback className="bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 space-y-2',
          isUser && 'flex flex-col items-end'
        )}
      >
        {/* Name and Model */}
        <div className={cn('flex items-center gap-2', isUser && 'flex-row-reverse')}>
          <span className="text-sm font-medium">
            {isUser ? 'You' : assistantName}
          </span>
          {!isUser && (message.connectionName || message.modelName || message.modelId) && (
            <Badge variant="outline" className="text-xs">
              {message.connectionName || message.modelName || message.modelId}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div
          className={cn(
            'rounded-lg max-w-[85%]',
            isUser && 'px-4 py-3 bg-primary text-primary-foreground',
            !isUser && !isError && 'px-4 py-3 bg-muted',
            isError && !modelUnavailableError && 'px-4 py-3 bg-destructive/10 border border-destructive/20'
          )}
        >
          {modelUnavailableError ? (
            <ModelUnavailableError error={modelUnavailableError} />
          ) : isError ? (
            <AIInsightErrorDisplay
              error={message.content}
              onRetry={handleRegenerate}
              className="border-0 bg-transparent p-0"
            />
          ) : isUser ? (
            <div className="space-y-2">
              {/* Display assets attached to this message */}
              {messageAssets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {messageAssets.map((asset) => (
                    <MultimodalAssetDisplay
                      key={asset.id}
                      assetId={asset.id}
                      showDetails={false}
                      className="max-w-xs"
                    />
                  ))}
                </div>
              )}
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] text-sm bg-background text-foreground"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!conversationId) return
                        await editMessage.mutateAsync({
                          conversationId,
                          messageId: message.id,
                          data: { content: editContent },
                        })
                        setIsEditing(false)
                        // Regenerate next response
                        await regenerateAfterEdit.mutateAsync({
                          conversationId,
                          messageId: message.id,
                        })
                      }}
                      disabled={editMessage.isPending || !editContent.trim()}
                    >
                      Save & Regenerate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditContent(message.content)
                        setIsEditing(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ) : (
            <StreamingText
              content={message.content}
              isStreaming={isStreaming}
            />
          )}
        </div>

        {/* Context Sources / Entity Links */}
        {message.contextSources && message.contextSources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.contextSources.map((source) => (
              <TooltipProvider key={source.shardId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80 flex items-center gap-1 border-primary/20"
                    >
                      <Link2 className="h-3 w-3" />
                      {source.shardName}
                      {source.score && (
                        <span className="text-[10px] opacity-70">
                          ({Math.round(source.score * 100)}%)
                        </span>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{source.shardName}</p>
                      <p className="text-xs text-muted-foreground">Type: {source.shardTypeId}</p>
                      {source.highlight && (
                        <p className="text-xs mt-1 italic">{source.highlight}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.citations.map((citation, index) => (
              <TooltipProvider key={citation.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                    >
                      [{index + 1}] {citation.sourceShardName}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{citation.text}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Grounding Warnings */}
        {!isUser && message.warnings && message.warnings.length > 0 && (
          <div className="mt-3">
            <GroundingWarning warnings={message.warnings} />
          </div>
        )}

        {/* Context Quality Indicator */}
        {!isUser && message.metadata?.contextQuality && (
          <div className="mt-3">
            <ContextQualityIndicator 
              contextQuality={message.metadata.contextQuality} 
              compact={true}
            />
          </div>
        )}

        {/* Feedback Buttons (for assistant messages) */}
        {!isUser && message.status === 'complete' && (
          <div className="flex items-center gap-2">
            <FeedbackButtons
              messageId={message.id}
              content={message.content}
              initialFeedback={message.feedback}
              onRegenerate={conversationId ? handleRegenerate : undefined}
              showRegenerate={!!conversationId}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        )}

        {/* Usage Stats */}
        {!isUser && message.usage && message.status === 'complete' && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{message.usage.totalTokens} tokens</span>
            {message.cost !== undefined && (
              <span>${message.cost.toFixed(4)}</span>
            )}
            {message.latencyMs !== undefined && (
              <span>{(message.latencyMs / 1000).toFixed(1)}s</span>
            )}
          </div>
        )}

        {/* Edit History & Actions for User Messages */}
        {isUser && message.status === 'complete' && conversationId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {message.editedAt && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edited
                      {message.editHistory && message.editHistory.length > 0 && (
                        <span className="ml-1">({message.editHistory.length})</span>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Edited {message.editedAt ? new Date(message.editedAt).toLocaleString() : ''}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {message.isRegenerated && (
              <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerated
              </Badge>
            )}
            <div className="flex gap-1">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setEditContent(message.content)
                    setIsEditing(true)
                  }}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              {editHistory && editHistory.editHistory && editHistory.editHistory.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      <History className="h-3 w-3 mr-1" />
                      History
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit History</DialogTitle>
                      <DialogDescription>
                        View all edits made to this message
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {editHistory.originalContent && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs font-medium mb-1">Original</div>
                          <div className="text-sm">{editHistory.originalContent}</div>
                        </div>
                      )}
                      {editHistory.editHistory.map((edit, index) => (
                        <div key={edit.id} className="p-3 border rounded-lg">
                          <div className="text-xs font-medium mb-1">
                            Edit #{index + 1} - {new Date(edit.editedAt).toLocaleString()}
                          </div>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Previous: </span>
                              {edit.previousContent}
                            </div>
                            <div>
                              <span className="text-muted-foreground">New: </span>
                              {edit.newContent}
                            </div>
                            {edit.reason && (
                              <div className="text-xs text-muted-foreground italic">
                                Reason: {edit.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}

        {/* Comments Section */}
        {conversationId && message.status === 'complete' && (
          <div className="mt-3 pt-3 border-t">
            <MessageComments
              conversationId={conversationId}
              messageId={message.id}
            />
          </div>
        )}
      </div>

      {/* Share Dialog for Assistant Messages */}
      {!isUser && message.status === 'complete' && conversationId && (
        <ShareInsightDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          sourceType="conversation"
          sourceId={message.id}
          defaultTitle={`AI Insight from ${assistantName}`}
          defaultContent={message.content}
          defaultSummary={message.content.substring(0, 200)}
          relatedShardIds={
            message.contextSources?.map((s) => s.shardId) || []
          }
          onSuccess={() => {
            setShowShareDialog(false);
          }}
        />
      )}
    </div>
  )
}

export default ChatInterface






