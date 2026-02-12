"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
  const { t } = useTranslation();
  if (isPublicPath(pathname ?? "")) return null;

  return (
    <nav className="border-b border-border bg-card px-6 py-3 flex flex-wrap items-center gap-4 text-sm">
      <div className="flex flex-wrap gap-4">
        <Link href="/" className="font-medium hover:underline">{t("nav.home")}</Link>
        <Link href="/dashboard" className="font-medium hover:underline">{t("nav.dashboard")}</Link>
        <Link href="/dashboard/manager" className="font-medium hover:underline">{t("nav.manager")}</Link>
        <Link href="/opportunities" className="font-medium hover:underline">{t("nav.opportunities")}</Link>
        <Link href="/recommendations" className="font-medium hover:underline">{t("nav.recommendations")}</Link>
        <Link href="/conversations" className="font-medium hover:underline">{t("nav.conversations")}</Link>
        <Link href="/search" className="font-medium hover:underline">{t("nav.search")}</Link>
        <Link href="/analytics/forecast" className="font-medium hover:underline">{t("nav.forecast")}</Link>
        <Link href="/analytics/competitive" className="font-medium hover:underline">{t("nav.competitive")}</Link>
        <Link href="/analytics/benchmarks" className="font-medium hover:underline">{t("nav.benchmarks")}</Link>
        <Link href="/analytics/portfolios" className="font-medium hover:underline">{t("nav.portfolios")}</Link>
        <Link href="/settings" className="font-medium hover:underline">{t("nav.settings")}</Link>
        <Link href="/settings/competitors" className="font-medium hover:underline">{t("nav.competitors")}</Link>
        <Link href="/settings/industries" className="font-medium hover:underline">{t("nav.industries")}</Link>
        <Link href="/settings/integrations" className="font-medium hover:underline">{t("nav.integrations")}</Link>
        <Link href="/login" className="font-medium hover:underline">{t("nav.login")}</Link>
        <Link href="/register" className="font-medium hover:underline">{t("nav.register")}</Link>
        <Link href="/logout" className="font-medium hover:underline">{t("nav.logout")}</Link>
        <Link href="/admin" className="font-medium hover:underline text-purple-600">{t("nav.admin")}</Link>
      </div>
      <div className="ml-auto">
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
