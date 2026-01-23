import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"

interface DashboardStats {
  totalShards: number
  publicShards: number
  privateShards: number
  totalUsers: number
  recentActivity: {
    shardsCreatedToday: number
    shardsUpdatedToday: number
  }
  trends: {
    shards: number // percentage change from last month
    users: number
  }
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>("/api/v1/dashboard/stats")
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
