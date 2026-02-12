"use client";

import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

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
  return PUBLIC_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`)
  );
}

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (isPublicPath(pathname ?? "")) {
    return <>{children}</>;
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
