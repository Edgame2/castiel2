/**
 * Admin layout: sets document title for all Super Admin pages.
 * Default: "Admin | Castiel". Child pages can export metadata.title (e.g. "Feedback Types")
 * to get "Feedback Types | Admin | Castiel".
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Admin | Castiel',
    template: '%s | Admin | Castiel',
  },
  description: 'Super Admin configuration and system administration',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
