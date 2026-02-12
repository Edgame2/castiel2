/**
 * Dashboard layout (Plan §6.2, §889).
 * Wraps /dashboard and /dashboard/manager. Nav in root layout.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Castiel",
  description: "Dashboard overview and views for manager, executive, and board.",
};

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col"><main className="flex-1 p-6">{children}</main></div>;
}
