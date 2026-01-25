/**
 * Dashboard landing (Plan §6.2, §889).
 * Links to manager view and opportunities.
 */

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-4">
        Layout for manager and executive views. Plan §6.2.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <Link href="/dashboard/manager" className="hover:underline">
            Manager view
          </Link>
        </li>
        <li>
          <Link href="/dashboard/executive" className="hover:underline">
            Executive view
          </Link>
        </li>
        <li>
          <Link href="/dashboard/board" className="hover:underline">
            Board view
          </Link>
        </li>
        <li>
          <Link href="/opportunities" className="hover:underline">
            Opportunities
          </Link>
        </li>
      </ul>
    </div>
  );
}
