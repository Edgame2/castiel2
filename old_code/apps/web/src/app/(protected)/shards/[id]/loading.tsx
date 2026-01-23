export default function ShardDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse bg-muted rounded" />
          <div className="h-4 w-96 animate-pulse bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-20 animate-pulse bg-muted rounded" />
          <div className="h-10 w-24 animate-pulse bg-muted rounded" />
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 h-[600px] animate-pulse bg-muted rounded" />
        <div className="space-y-6">
          <div className="h-64 animate-pulse bg-muted rounded" />
          <div className="h-32 animate-pulse bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}
