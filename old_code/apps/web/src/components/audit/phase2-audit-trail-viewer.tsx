"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Activity,
  CalendarIcon,
  FileText,
  User,
  Shield,
  Eye,
  Edit,
  Trash2,
  Link as LinkIcon,
  Unlink,
} from "lucide-react"
import { usePhase2AuditTrail, type AuditTrailEventType } from "@/hooks/use-phase2-audit-trail"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const EVENT_TYPE_LABELS: Record<AuditTrailEventType, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  read: "Read",
  redacted_access: "Redacted Access",
  relationship_add: "Relationship Added",
  relationship_remove: "Relationship Removed",
}

const EVENT_TYPE_ICONS: Record<AuditTrailEventType, typeof FileText> = {
  create: FileText,
  update: Edit,
  delete: Trash2,
  read: Eye,
  redacted_access: Shield,
  relationship_add: LinkIcon,
  relationship_remove: Unlink,
}

export function Phase2AuditTrailViewer() {
  const [targetShardId, setTargetShardId] = useState<string>("")
  const [eventType, setEventType] = useState<AuditTrailEventType | undefined>()
  const [userId, setUserId] = useState<string>("")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [limit, setLimit] = useState<number>(100)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const queryParams = useMemo(() => ({
    targetShardId: targetShardId || undefined,
    eventType,
    userId: userId || undefined,
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
    limit,
  }), [targetShardId, eventType, userId, startDate, endDate, limit])

  const { data, isLoading, error } = usePhase2AuditTrail(queryParams, {
    enabled: true,
  })

  const logs = data?.logs || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Phase 2 Audit Trail
          </CardTitle>
          <CardDescription>
            Query shard-specific audit logs with detailed change tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="targetShardId">Target Shard ID</Label>
              <Input
                id="targetShardId"
                placeholder="Filter by shard ID"
                value={targetShardId}
                onChange={(e) => setTargetShardId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={eventType || ""}
                onValueChange={(value) => setEventType(value as AuditTrailEventType || undefined)}
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All events</SelectItem>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Filter by user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading..." : `${data?.count || 0} audit log${data?.count !== 1 ? "s" : ""} found`}
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                Failed to load audit trail: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No audit logs found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters or date range
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Target Shard</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const EventIcon = EVENT_TYPE_ICONS[log.eventType as AuditTrailEventType] || FileText
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {format(new Date(log.createdAt), "MMM d, yyyy")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.createdAt), "HH:mm:ss")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <EventIcon className="h-3 w-3" />
                              {EVENT_TYPE_LABELS[log.eventType as AuditTrailEventType]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <code className="text-xs">{log.targetShardId.substring(0, 8)}...</code>
                              <span className="text-xs text-muted-foreground">
                                {log.targetShardTypeId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <code className="text-xs">{log.userId.substring(0, 8)}...</code>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{log.action}</span>
                          </TableCell>
                          <TableCell>
                            {log.changes && log.changes.length > 0 ? (
                              <Badge variant="secondary">
                                {log.changes.length} change{log.changes.length !== 1 ? "s" : ""}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Details</SheetTitle>
            <SheetDescription>
              Detailed information about this audit event
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Event Type</Label>
                <div className="flex items-center gap-2">
                  {(() => {
                    const EventIcon = EVENT_TYPE_ICONS[selectedLog.eventType as AuditTrailEventType] || FileText
                    return (
                      <>
                        <EventIcon className="h-4 w-4" />
                        <Badge>{EVENT_TYPE_LABELS[selectedLog.eventType as AuditTrailEventType]}</Badge>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Target Shard</Label>
                <div className="space-y-1">
                  <code className="text-sm block">{selectedLog.targetShardId}</code>
                  <span className="text-xs text-muted-foreground">
                    Type: {selectedLog.targetShardTypeId}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">User</Label>
                <code className="text-sm">{selectedLog.userId}</code>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Action</Label>
                <p className="text-sm">{selectedLog.action}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Timestamp</Label>
                <p className="text-sm">
                  {format(new Date(selectedLog.createdAt), "PPpp")}
                </p>
              </div>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Changes</Label>
                  <div className="space-y-2 rounded-md border p-4">
                    {selectedLog.changes.map((change: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <code className="text-xs font-medium">{change.field}</code>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Old:</span>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(change.oldValue, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-muted-foreground">New:</span>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(change.newValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.metadata && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Metadata</Label>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}






