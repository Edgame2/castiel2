/**
 * Settings landing — links to profile, security, competitors, industries, integrations, entity linking, processing.
 * UI inventory §3.10.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings | Castiel",
  description: "Profile, security, and tenant settings",
};

const SECTIONS = [
  { href: '/settings/profile', title: 'Profile', description: 'Edit your name and account details' },
  { href: '/settings/security', title: 'Security', description: 'Sessions and multi-factor authentication' },
  { href: '/settings/competitors', title: 'Competitors', description: 'Manage competitors' },
  { href: '/settings/industries', title: 'Industries', description: 'View industries' },
  { href: '/settings/integrations', title: 'Integrations', description: 'Connect and manage integrations' },
  { href: '/settings/entity-linking', title: 'Entity linking', description: 'Entity linking configuration' },
  { href: '/settings/processing', title: 'Processing', description: 'Document, email, and meeting processing' },
];

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your profile, security, and tenant settings.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, title, description }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-1">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
