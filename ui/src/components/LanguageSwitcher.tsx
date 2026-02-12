"use client";

import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const;

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = i18n.language?.split("-")[0] ?? "en";

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-xs mr-1" aria-hidden>
        {t("nav.language")}:
      </span>
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => void i18n.changeLanguage(code)}
          className={`px-2 py-1 text-sm rounded font-medium hover:underline ${
            current === code ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          aria-pressed={current === code}
          aria-label={`${t("nav.language")} ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
