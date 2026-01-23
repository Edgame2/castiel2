"use client"

import { useState } from "react"
import { UserPlus, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPicker } from "@/components/ui/user-picker"
import { useInviteUsersToConversation } from "@/hooks/use-insights"
import { toast } from "sonner"

interface ConversationShareDialogProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConversationShareDialog({
  conversationId,
  open,
  onOpenChange,
}: ConversationShareDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [role, setRole] = useState<'owner' | 'participant' | 'viewer'>('participant')
  const [notify, setNotify] = useState(true)

  const inviteUsers = useInviteUsersToConversation()

  const handleInvite = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user to invite")
      return
    }

    try {
      await inviteUsers.mutateAsync({
        conversationId,
        userIds: selectedUserIds,
        options: {
          role,
          notify,
        },
      })
      
      // Reset form
      setSelectedUserIds([])
      setRole('participant')
      setNotify(true)
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Invite users to collaborate on this conversation. They will be able to view and participate based on their role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="users">Select Users</Label>
            <UserPicker
              value={selectedUserIds}
              onChange={(value) => setSelectedUserIds(Array.isArray(value) ? value : value ? [value] : [])}
              multiple
              placeholder="Search and select users..."
              displayFormat="full"
              showAvatar
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'owner' | 'participant' | 'viewer')}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer - Can view messages only</SelectItem>
                <SelectItem value="participant">Participant - Can view and send messages</SelectItem>
                <SelectItem value="owner">Owner - Full access including managing participants</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notify"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="notify" className="text-sm font-normal cursor-pointer">
              Send notification email to invited users
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inviteUsers.isPending}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={inviteUsers.isPending || selectedUserIds.length === 0}>
            {inviteUsers.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Users
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

