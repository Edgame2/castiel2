'use client'

/**
 * New Chat Page
 * Start a new AI conversation
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/ai-insights'

export default function NewChatPage() {
  const router = useRouter()

  const handleConversationCreated = (conversationId: string) => {
    // Navigate to the conversation page
    router.replace(`/chat/${conversationId}`)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/chat')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-semibold">New Conversation</h1>
      </div>

      {/* Chat Interface */}
      <ChatInterface
        className="flex-1"
        welcomeMessage="I'm your AI assistant. Ask me anything about your projects, analyze data, or get recommendations."
        suggestedQuestions={[
          'Summarize my active projects',
          'What are the top risks across my portfolio?',
          'Show me recent activity',
          'What opportunities should I focus on?',
        ]}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  )
}











