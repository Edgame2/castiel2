'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/auth-context'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  RefreshCw,
  MoreVertical,
  Mail,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { InviteUserDialog } from '@/components/users/invite-user-dialog'

interface Invitation {
  id: string
  tenantId: string
  email: string
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
  inviterUserId: string
  issuerDisplayName: string
  message?: string
  roles: string[]
  rolesPreset?: string
  expiresAt: string
  createdAt: string
  respondedAt?: string
  isExpired: boolean
}

interface InvitationsResponse {
  invitations: Invitation[]
  total: number
  limit: number
  offset: number
}

export default function InvitationsPage() {
  const { t } = useTranslation('users')
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null)

  const tenantId = user?.tenantId

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: t('invitations.status.pending' as any) },
    accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('invitations.status.accepted' as any) },
    declined: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: t('invitations.status.declined' as any) },
    expired: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: t('invitations.status.expired' as any) },
    revoked: { color: 'bg-red-100 text-red-800', icon: Trash2, label: t('invitations.status.revoked' as any) },
  }

  // Fetch invitations
  const { data, isLoading, refetch } = useQuery<InvitationsResponse>({
    queryKey: ['invitations', tenantId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      const response = await fetch(`/api/tenants/${tenantId}/invitations?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch invitations')
      return response.json()
    },
    enabled: !!tenantId,
  })

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/tenants/${tenantId}/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to revoke invitation')
      return response.json()
    },
    onSuccess: () => {
      toast.success(t('invitations.revokeSuccess' as any))
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setRevokeDialogOpen(false)
      setSelectedInvitation(null)
    },
    onError: () => {
      toast.error(t('invite.error' as any))
    },
  })

  // Resend mutation
  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/tenants/${tenantId}/invitations/${invitationId}/resend`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to resend invitation')
      return response.json()
    },
    onSuccess: () => {
      toast.success(t('invitations.resendSuccess' as any))
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
    onError: () => {
      toast.error(t('invite.error' as any))
    },
  })

  const handleRevoke = (invitation: Invitation) => {
    setSelectedInvitation(invitation)
    setRevokeDialogOpen(true)
  }

  const handleResend = (invitation: Invitation) => {
    resendMutation.mutate(invitation.id)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('invitations.title' as any)}</h1>
          <p className="text-muted-foreground">
            {t('invitations.subtitle' as any)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('invitations.refresh' as any)}
          </Button>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('inviteUser' as any)}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invitations.total' as any)}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invitations.pending' as any)}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.invitations?.filter(i => i.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invitations.accepted' as any)}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.invitations?.filter(i => i.status === 'accepted').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invitations.expiredRevoked' as any)}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.invitations?.filter(i => ['expired', 'revoked'].includes(i.status)).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('filters.title' as any)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Label htmlFor="status">{t('filters.status' as any)}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder={t('filters.allStatuses' as any)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses' as any)}</SelectItem>
                  <SelectItem value="pending">{t('invitations.status.pending' as any)}</SelectItem>
                  <SelectItem value="accepted">{t('invitations.status.accepted' as any)}</SelectItem>
                  <SelectItem value="declined">{t('invitations.status.declined' as any)}</SelectItem>
                  <SelectItem value="expired">{t('invitations.status.expired' as any)}</SelectItem>
                  <SelectItem value="revoked">{t('invitations.status.revoked' as any)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invitations.title' as any)}</CardTitle>
          <CardDescription>
            {data?.total || 0} {t('invitations.total' as any).toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invitations.table.email' as any)}</TableHead>
                <TableHead>{t('invitations.table.status' as any)}</TableHead>
                <TableHead>{t('invitations.table.invitedBy' as any)}</TableHead>
                <TableHead>{t('invitations.table.roles' as any)}</TableHead>
                <TableHead>{t('invitations.table.expires' as any)}</TableHead>
                <TableHead>{t('invitations.table.created' as any)}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('common:loading' as any)}
                  </TableCell>
                </TableRow>
              ) : data?.invitations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('invitations.noInvitations' as any)}
                  </TableCell>
                </TableRow>
              ) : (
                data?.invitations?.map((invitation) => {
                  const StatusIcon = statusConfig[invitation.status]?.icon || Clock
                  
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[invitation.status]?.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[invitation.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{invitation.issuerDisplayName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {invitation.roles?.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invitation.status === 'pending' && !invitation.isExpired ? (
                          <span className="text-sm text-muted-foreground">
                            {getTimeRemaining(invitation.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(invitation.expiresAt)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invitation.createdAt)}
                      </TableCell>
                      <TableCell>
                        {invitation.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleResend(invitation)}
                                disabled={resendMutation.isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                {t('invitations.actions.resend' as any)}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRevoke(invitation)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('invitations.actions.revoke' as any)}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open)
          if (!open) {
            // Invalidate queries when dialog closes (after successful invite)
            queryClient.invalidateQueries({ queryKey: ['invitations'] })
          }
        }}
      />

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invitations.actions.revoke' as any)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invitations.revokeConfirm', { email: selectedInvitation?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel' as any)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedInvitation && revokeMutation.mutate(selectedInvitation.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('invitations.actions.revoke' as any)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

