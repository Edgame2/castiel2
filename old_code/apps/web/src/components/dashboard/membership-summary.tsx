"use client"

import { Users, UserPlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMembershipSummary } from "@/hooks/use-invitations"
import { Skeleton } from "@/components/ui/skeleton"

export function MembershipSummary() {
  const { data, isLoading } = useMembershipSummary()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending join requests</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data?.joinRequests.pending ?? 0}</div>
          <p className="text-sm text-muted-foreground">Awaiting action from admins</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending invitations</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data?.invitations.pending ?? 0}</div>
          <p className="text-sm text-muted-foreground">
            {data?.invitations.expiringSoon ?? 0} expiring within 72h
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
