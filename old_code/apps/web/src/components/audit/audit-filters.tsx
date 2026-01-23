"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AuditLogFilters } from "@/types/api"

interface AuditFiltersProps {
  filters: AuditLogFilters
  onFiltersChange: (filters: AuditLogFilters) => void
}

export function AuditFilters({ filters, onFiltersChange }: AuditFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters)

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  const handleClear = () => {
    const emptyFilters: AuditLogFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Input
              id="action"
              placeholder="e.g., user.created"
              value={localFilters.action || ""}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, action: e.target.value || undefined })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource">Resource</Label>
            <Input
              id="resource"
              placeholder="e.g., shard, user"
              value={localFilters.resource || ""}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, resource: e.target.value || undefined })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              placeholder="User ID"
              value={localFilters.userId || ""}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, userId: e.target.value || undefined })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={localFilters.status || ""}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, status: e.target.value || undefined })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={localFilters.startDate || ""}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, startDate: e.target.value || undefined })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={localFilters.endDate || ""}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, endDate: e.target.value || undefined })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClear}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  )
}
