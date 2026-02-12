/**
 * ActivityList – activities (shards) for an opportunity with type, date, summary (Plan §6.3, §958).
 * Data from GET /api/v1/opportunities/:id/activities.
 */

'use client';

export type ActivityItem = {
  id: string;
  type: string;
  createdAt?: string;
  summary?: string;
};

export type ActivityListProps = {
  activities: ActivityItem[];
  emptyMessage?: string;
};

export function ActivityList({ activities, emptyMessage = 'No activities' }: ActivityListProps) {
  if (!activities || activities.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-2">
      {activities.map((a) => (
        <li key={a.id} className="flex flex-wrap items-baseline gap-2 rounded border px-3 py-2 text-sm">
          <span className="font-medium text-muted-foreground">{a.type}</span>
          {a.createdAt && (
            <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
          )}
          {a.summary && <span>{a.summary}</span>}
        </li>
      ))}
    </ul>
  );
}
