"use client"

import { useRouter } from "next/navigation"
import { BarChart3, FileUp, Layers, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function QuickActions() {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="default"
          className="w-full justify-start"
          onClick={() => router.push("/shards/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Shard
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => router.push("/shard-types/new")}
        >
          <Layers className="h-4 w-4 mr-2" />
          Create Shard Type
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => router.push("/shards/import")}
        >
          <FileUp className="h-4 w-4 mr-2" />
          Import Data
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => router.push("/analytics")}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
      </CardContent>
    </Card>
  )
}
