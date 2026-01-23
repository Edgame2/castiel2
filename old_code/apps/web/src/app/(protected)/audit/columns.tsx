"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { CheckCircle2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { AuditLog } from "@/types/api"

export const auditColumns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => {
      const log = row.original
      return (
        <div className="flex flex-col">
          <span className="text-sm">{format(new Date(log.timestamp), "MMM d, yyyy")}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(log.timestamp), "HH:mm:ss")}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const log = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{log.action}</span>
          <span className="text-xs text-muted-foreground">{log.resource}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "userName",
    header: "User",
    cell: ({ row }) => {
      const log = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{log.userName}</span>
          <span className="text-xs text-muted-foreground">{log.userEmail}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "resourceId",
    header: "Resource ID",
    cell: ({ row }) => {
      const log = row.original
      if (!log.resourceId) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <span className="font-mono text-xs">
          {log.resourceId.substring(0, 8)}...
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const log = row.original
      return (
        <div className="flex items-center gap-2">
          {log.status === 'success' ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <Badge variant="default">Success</Badge>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <Badge variant="destructive">Failure</Badge>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "ipAddress",
    header: "IP Address",
    cell: ({ row }) => {
      const log = row.original
      return log.ipAddress ? (
        <span className="font-mono text-xs">{log.ipAddress}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
  },
]
