"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/accept-invitation",
  "/logout",
  "/unauthorized",
];

function isPublicPath(pathname: string): boolean {
  const normalized = (pathname || "").replace(/\/$/, "") || "/";
  return PUBLIC_PATHS.some((p) => normalized === p || normalized.startsWith(`${p}/`));
}

export function AppNav() {
  const pathname = usePathname();
  if (isPublicPath(pathname ?? "")) return null;

  return (
    <nav className="border-b border-border bg-card px-6 py-3 flex flex-wrap gap-4 text-sm">
      <Link href="/" className="font-medium hover:underline">Home</Link>
      <Link href="/dashboard" className="font-medium hover:underline">Dashboard</Link>
      <Link href="/dashboard/manager" className="font-medium hover:underline">Manager</Link>
      <Link href="/opportunities" className="font-medium hover:underline">Opportunities</Link>
      <Link href="/recommendations" className="font-medium hover:underline">Recommendations</Link>
      <Link href="/conversations" className="font-medium hover:underline">Conversations</Link>
      <Link href="/search" className="font-medium hover:underline">Search</Link>
      <Link href="/analytics/forecast" className="font-medium hover:underline">Forecast</Link>
      <Link href="/analytics/competitive" className="font-medium hover:underline">Competitive</Link>
      <Link href="/analytics/benchmarks" className="font-medium hover:underline">Benchmarks</Link>
      <Link href="/analytics/portfolios" className="font-medium hover:underline">Portfolios</Link>
      <Link href="/settings" className="font-medium hover:underline">Settings</Link>
      <Link href="/settings/competitors" className="font-medium hover:underline">Competitors</Link>
      <Link href="/settings/industries" className="font-medium hover:underline">Industries</Link>
      <Link href="/settings/integrations" className="font-medium hover:underline">Integrations</Link>
      <Link href="/login" className="font-medium hover:underline">Login</Link>
      <Link href="/register" className="font-medium hover:underline">Register</Link>
      <Link href="/logout" className="font-medium hover:underline">Logout</Link>
      <Link href="/admin" className="font-medium hover:underline text-purple-600">Admin</Link>
    </nav>
  );
}
