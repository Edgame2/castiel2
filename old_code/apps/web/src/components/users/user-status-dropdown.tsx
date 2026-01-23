'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'pending_approval' | 'deleted'

interface UserStatusDropdownProps {
  userId: string
  tenantId: string
  currentStatus: UserStatus
  userName?: string
  disabled?: boolean
  onStatusChange?: (newStatus: UserStatus) => void
}

const statusConfig: Record<UserStatus, { label: string; color: string; description: string }> = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    description: 'User can log in and access the system',
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-red-100 text-red-800 hover:bg-red-200',
    description: 'User is blocked from accessing the system',
  },
  pending_verification: {
    label: 'Pending Verification',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    description: 'User needs to verify their email',
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    description: 'User is waiting for admin approval',
  },
  deleted: {
    label: 'Deleted',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    description: 'User account has been deleted',
  },
}

export function UserStatusDropdown({
  userId,
  tenantId,
  currentStatus,
  userName,
  disabled = false,
  onStatusChange,
}: UserStatusDropdownProps) {
  const queryClient = useQueryClient()
  const [pendingStatus, setPendingStatus] = useState<UserStatus | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: UserStatus) => {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update status' }))
        throw new Error(error.message)
      }
      return response.json()
    },
    onSuccess: (_, newStatus) => {
      toast.success(`User status changed to ${statusConfig[newStatus].label}`)
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onStatusChange?.(newStatus)
      setConfirmDialogOpen(false)
      setPendingStatus(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user status')
      setConfirmDialogOpen(false)
      setPendingStatus(null)
    },
  })

  const handleStatusSelect = (newStatus: UserStatus) => {
    if (newStatus === currentStatus) return
    
    // Confirm before making destructive changes
    if (newStatus === 'suspended' || newStatus === 'deleted') {
      setPendingStatus(newStatus)
      setConfirmDialogOpen(true)
    } else {
      updateStatusMutation.mutate(newStatus)
    }
  }

  const handleConfirm = () => {
    if (pendingStatus) {
      updateStatusMutation.mutate(pendingStatus)
    }
  }

  return (
    <>
      <Select
        value={currentStatus}
        onValueChange={(value) => handleStatusSelect(value as UserStatus)}
        disabled={disabled || updateStatusMutation.isPending}
      >
        <SelectTrigger className="w-[180px]">
          {updateStatusMutation.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          ) : (
            <SelectValue>
              <Badge className={statusConfig[currentStatus]?.color || 'bg-gray-100'}>
                {statusConfig[currentStatus]?.label || currentStatus}
              </Badge>
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([status, config]) => (
            <SelectItem key={status} value={status}>
              <div className="flex flex-col">
                <span className="font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">{config.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Confirmation Dialog for Destructive Actions */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === 'suspended' ? 'Suspend User' : 'Delete User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === 'suspended' ? (
                <>
                  Are you sure you want to suspend <strong>{userName || 'this user'}</strong>?
                  They will not be able to log in until their account is reactivated.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{userName || 'this user'}</strong>?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={pendingStatus === 'deleted' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : pendingStatus === 'suspended' ? (
                'Suspend User'
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

