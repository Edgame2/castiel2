"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-8 dark:border-gray-700 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t("notFound.title")}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("notFound.description")}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {t("notFound.home")}
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {t("notFound.dashboard")}
          </Link>
          <Link href="/login" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {t("notFound.login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
