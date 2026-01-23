'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  ChevronDown,
  Shield,
  ShieldOff,
  Trash2,
  UserCog,
  Mail,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  status: string
  roles: string[]
}

interface BulkOperationsProps {
  selectedUsers: User[]
  tenantId: string
  onComplete?: () => void
}

type BulkAction = 'activate' | 'deactivate' | 'delete' | 'add-role' | 'remove-role' | 'send-password-reset'

const AVAILABLE_ROLES = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
]

export function BulkOperations({ selectedUsers, tenantId, onComplete }: BulkOperationsProps) {
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, userIds, role }: { action: BulkAction; userIds: string[]; role?: string }) => {
      const response = await fetch(`/api/tenants/${tenantId}/users/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userIds, role }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Bulk operation failed' }))
        throw new Error(error.message)
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || `Successfully updated ${selectedUsers.length} users`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onComplete?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Bulk operation failed')
    },
    onSettled: () => {
      setConfirmAction(null)
      setSelectedRole(null)
    },
  })

  const handleAction = (action: BulkAction, role?: string) => {
    if (action === 'delete' || action === 'deactivate') {
      setConfirmAction(action)
      return
    }
    
    if ((action === 'add-role' || action === 'remove-role') && role) {
      setSelectedRole(role)
      setConfirmAction(action)
      return
    }

    // Execute immediately for non-destructive actions
    bulkActionMutation.mutate({
      action,
      userIds: selectedUsers.map(u => u.id),
      role,
    })
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    
    bulkActionMutation.mutate({
      action: confirmAction,
      userIds: selectedUsers.map(u => u.id),
      role: selectedRole || undefined,
    })
  }

  const getConfirmationMessage = () => {
    switch (confirmAction) {
      case 'delete':
        return `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`
      case 'deactivate':
        return `Are you sure you want to deactivate ${selectedUsers.length} user(s)? They will not be able to log in.`
      case 'add-role':
        return `Add the "${selectedRole}" role to ${selectedUsers.length} user(s)?`
      case 'remove-role':
        return `Remove the "${selectedRole}" role from ${selectedUsers.length} user(s)?`
      default:
        return ''
    }
  }

  const getConfirmationTitle = () => {
    switch (confirmAction) {
      case 'delete':
        return 'Delete Users'
      case 'deactivate':
        return 'Deactivate Users'
      case 'add-role':
        return 'Add Role'
      case 'remove-role':
        return 'Remove Role'
      default:
        return 'Confirm Action'
    }
  }

  if (selectedUsers.length === 0) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={bulkActionMutation.isPending}>
            {bulkActionMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserCog className="h-4 w-4 mr-2" />
            )}
            Bulk Actions ({selectedUsers.length})
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleAction('activate')}>
            <Shield className="h-4 w-4 mr-2" />
            Activate Users
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('deactivate')}>
            <ShieldOff className="h-4 w-4 mr-2" />
            Deactivate Users
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog className="h-4 w-4 mr-2" />
              Add Role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {AVAILABLE_ROLES.map(role => (
                <DropdownMenuItem 
                  key={role.value}
                  onClick={() => handleAction('add-role', role.value)}
                >
                  {role.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog className="h-4 w-4 mr-2" />
              Remove Role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {AVAILABLE_ROLES.map(role => (
                <DropdownMenuItem 
                  key={role.value}
                  onClick={() => handleAction('remove-role', role.value)}
                >
                  {role.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleAction('send-password-reset')}>
            <Mail className="h-4 w-4 mr-2" />
            Send Password Reset
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => handleAction('delete')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Users
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmationTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
              
              {selectedUsers.length <= 5 && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">Selected users:</p>
                  <ul className="list-disc list-inside text-sm">
                    {selectedUsers.map(user => (
                      <li key={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {bulkActionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

