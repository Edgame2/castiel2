"use client"

import { useState } from "react"
import { Users, UserPlus, Trash2, Shield, Eye, MessageSquare, Loader2, MoreVertical } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useConversation, useRemoveParticipant, useAddParticipant } from "@/hooks/use-insights"
import { useUsers } from "@/hooks/use-users"
import { useQueryClient } from "@tanstack/react-query"
import { insightKeys } from "@/hooks/use-insights"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { UserPicker } from "@/components/ui/user-picker"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ConversationParticipantsPanelProps {
  conversationId: string
  className?: string
}

function getUserInitials(userId: string, user?: { firstName?: string; lastName?: string; email: string }): string {
  if (user) {
    const first = user.firstName?.[0] || ""
    const last = user.lastName?.[0] || ""
    if (first || last) return `${first}${last}`.toUpperCase()
    return user.email[0].toUpperCase()
  }
  return userId[0].toUpperCase()
}

function getUserDisplayName(user?: { firstName?: string; lastName?: string; email: string }): string {
  if (!user) return "Unknown User"
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim()
  }
  return user.email
}

export function ConversationParticipantsPanel({
  conversationId,
  className,
}: ConversationParticipantsPanelProps) {
  const queryClient = useQueryClient()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'owner' | 'participant' | 'viewer'>('participant')

  const { data: conversation, isLoading: conversationLoading } = useConversation(conversationId)
  const { data: usersData } = useUsers({ limit: 100 })
  const removeParticipant = useRemoveParticipant()
  const addParticipant = useAddParticipant()
  const { user: currentUser } = useAuth()

  const participants = conversation?.participants || []
  const currentUserId = currentUser?.id
  const currentUserParticipant = participants.find(p => p.userId === currentUserId)
  const isOwner = currentUserParticipant?.role === 'owner'

  // Get user details for each participant
  const participantsWithUsers = participants.map(participant => {
    const user = usersData?.users.find(u => u.id === participant.userId)
    return {
      ...participant,
      user,
    }
  })

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) return

    try {
      await removeParticipant.mutateAsync({
        conversationId,
        participantId,
      })
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const handleAddParticipant = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user")
      return
    }

    try {
      await addParticipant.mutateAsync({
        conversationId,
        userId: selectedUserId,
        role: selectedRole,
      })
      setIsAddDialogOpen(false)
      setSelectedUserId(null)
      setSelectedRole('participant')
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="h-3 w-3" />
      case 'viewer':
        return <Eye className="h-3 w-3" />
      default:
        return <MessageSquare className="h-3 w-3" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  if (conversationLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-md border bg-card">
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col flex-1 gap-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Participants</CardTitle>
          <CardDescription>
            {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
          </CardDescription>
        </div>
        {isOwner && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" title="Add participant">
                <UserPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add Participant</DialogTitle>
                <DialogDescription>
                  Add a user to this conversation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <UserPicker
                    value={selectedUserId}
                    onChange={(value) => {
                      const userId = typeof value === 'string' ? value : null
                      // Check if user is already a participant
                      if (userId && participants.some(p => p.userId === userId)) {
                        toast.error("This user is already a participant")
                        return
                      }
                      setSelectedUserId(userId)
                    }}
                    placeholder="Select a user..."
                    displayFormat="full"
                    showAvatar
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'owner' | 'participant' | 'viewer')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Can view messages only</SelectItem>
                      <SelectItem value="participant">Participant - Can view and send messages</SelectItem>
                      <SelectItem value="owner">Owner - Full access including managing participants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddParticipant} disabled={!selectedUserId || addParticipant.isPending}>
                  {addParticipant.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Participant
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participantsWithUsers.length > 0 ? (
            participantsWithUsers.map((participant) => {
              const user = participant.user
              const canRemove = isOwner && participant.role !== 'owner' && participant.userId !== currentUserId
              const isCurrentUser = participant.userId === currentUserId

              return (
                <div
                  key={participant.userId}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden w-full">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>
                        {getUserInitials(participant.userId, user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {getUserDisplayName(user)}
                          {isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getRoleColor(participant.role)}`}>
                          {getRoleIcon(participant.role)}
                          <span className="ml-1 capitalize">{participant.role}</span>
                        </Badge>
                        {/* joinedAt is not available in the participant type */}
                      </div>
                    </div>
                  </div>
                  {canRemove && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveParticipant(participant.userId)}
                          disabled={removeParticipant.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No participants yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

