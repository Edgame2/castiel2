"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Plus, ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChatInterface } from "@/components/ai-insights/chat-interface"
import { insightsApi, ConversationSummary } from "@/lib/api/insights"
import { Project } from "@/types/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface ProjectChatWidgetProps {
    project: Project
    className?: string
}

export function ProjectChatWidget({ project, className }: ProjectChatWidgetProps) {
    const [view, setView] = useState<"list" | "chat">("list")
    const [conversations, setConversations] = useState<ConversationSummary[]>([])
    const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(false)

    const fetchConversations = async () => {
        setIsLoading(true)
        try {
            const response = await insightsApi.listConversations({
                tags: [`project:${project.id}`],
                limit: 20,
                orderBy: "lastActivityAt",
                orderDirection: "desc",
            })
            setConversations(response.conversations)
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to fetch conversations", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (view === "list") {
            fetchConversations()
        }
    }, [view, project.id])

    const startNewChat = () => {
        setSelectedConversationId(undefined)
        setView("chat")
    }

    const openChat = (id: string) => {
        setSelectedConversationId(id)
        setView("chat")
    }

    const handleConversationCreated = (id: string) => {
        // Tag the new conversation with the project ID
        insightsApi.updateConversation(id, {
            tags: [`project:${project.id}`],
        }).then(() => {
            setSelectedConversationId(id)
        }).catch(err => {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace("Failed to tag conversation", 3, {
                errorMessage: errorObj.message,
                conversationId: id,
                projectId: project.id,
            })
        })
    }

    const deleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        try {
            await insightsApi.deleteConversation(id)
            setConversations(conversations.filter(c => c.id !== id))
            toast.success("Conversation deleted")
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to delete conversation", 3, {
                errorMessage: errorObj.message,
                conversationId: id,
                projectId: project.id,
            })
            toast.error("Failed to delete conversation")
        }
    }

    if (view === "chat") {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2 border-b">
                    <Button variant="ghost" size="sm" onClick={() => setView("list")} className="mr-2">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <CardTitle className="text-sm font-medium">
                        {selectedConversationId ? "Chat" : "New Chat"}
                    </CardTitle>
                </CardHeader>
                <div className="h-[500px]">
                    <ChatInterface
                        conversationId={selectedConversationId}
                        scope={{ projectId: project.id }}
                        projectId={project.id}
                        onConversationCreated={handleConversationCreated}
                        placeholder="Ask about this project..."
                        welcomeMessage={`Ask me anything about ${project.name}.`}
                        suggestedQuestions={[
                            "Summarize this project",
                            "What are the key risks?",
                            "Draft a status update",
                        ]}
                    />
                </div>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Project Chats</CardTitle>
                <Button variant="ghost" size="sm" onClick={startNewChat}>
                    <Plus className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : conversations.length > 0 ? (
                        <div className="space-y-2">
                            {conversations.map((conversation) => (
                                <div
                                    key={conversation.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                                    onClick={() => openChat(conversation.id)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                                            <MessageSquare className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-medium truncate">
                                                {conversation.title || "Untitled Chat"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(conversation.lastActivityAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => deleteConversation(e, conversation.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No conversations yet.</p>
                            <Button variant="link" onClick={startNewChat}>
                                Start a new chat
                            </Button>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
