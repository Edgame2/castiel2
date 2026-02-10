"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}

const navMain: { href: string; labelKey: string }[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/dashboard/manager", labelKey: "nav.manager" },
  { href: "/opportunities", labelKey: "nav.opportunities" },
  { href: "/recommendations", labelKey: "nav.recommendations" },
  { href: "/conversations", labelKey: "nav.conversations" },
  { href: "/search", labelKey: "nav.search" },
];

const navAnalytics: { href: string; labelKey: string }[] = [
  { href: "/analytics/forecast", labelKey: "nav.forecast" },
  { href: "/analytics/competitive", labelKey: "nav.competitive" },
  { href: "/analytics/benchmarks", labelKey: "nav.benchmarks" },
  { href: "/analytics/portfolios", labelKey: "nav.portfolios" },
];

const navSettings: { href: string; labelKey: string }[] = [
  { href: "/settings", labelKey: "nav.settings" },
  { href: "/settings/competitors", labelKey: "nav.competitors" },
  { href: "/settings/industries", labelKey: "nav.industries" },
  { href: "/settings/integrations", labelKey: "nav.integrations" },
];

function displayName(profile: UserProfile | null): string {
  if (!profile) return "";
  if (profile.name?.trim()) return profile.name;
  const first = profile.firstName?.trim();
  const last = profile.lastName?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return profile.email ?? "";
}

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/users/me");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const data = json?.data ?? json;
        if (data && typeof data === "object") setProfile(data);
      } catch {
        // Leave profile null; footer still shows Edit profile / Logout
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (href: string) => {
    const norm = (pathname ?? "").replace(/\/$/, "") || "/";
    if (href === "/") return norm === "/";
    return norm === href || norm.startsWith(`${href}/`);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-2">
          <Link href="/" className="font-semibold text-sidebar-foreground">
            {t("common.appName")}
          </Link>
          <LanguageSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.home")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map(({ href, labelKey }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>{t(labelKey)}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.forecast")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navAnalytics.map(({ href, labelKey }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>{t(labelKey)}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.settings")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSettings.map(({ href, labelKey }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>{t(labelKey)}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.admin")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin")}>
                  <Link href="/admin" className="text-purple-600 dark:text-purple-400">
                    {t("nav.admin")}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2 px-2 py-2">
          {profileLoading ? (
            <>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </>
          ) : (
            <>
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {displayName(profile) || t("common.sidebar.user")}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/80">
                {profile?.email ?? ""}
              </p>
            </>
          )}
          <div className="mt-1 flex flex-col gap-1 border-t border-sidebar-border pt-2">
            <Link
              href="/settings/profile"
              className="text-xs text-sidebar-foreground hover:underline"
            >
              {t("common.sidebar.editProfile")}
            </Link>
            <Link
              href="/logout"
              className="text-xs text-sidebar-foreground hover:underline"
            >
              {t("nav.logout")}
            </Link>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
