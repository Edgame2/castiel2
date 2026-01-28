import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Castiel",
  description: "Enterprise AI-Powered Business Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b px-6 py-3 flex gap-4 text-sm">
          <Link href="/" className="font-medium hover:underline">Home</Link>
          <Link href="/dashboard" className="font-medium hover:underline">Dashboard</Link>
          <Link href="/dashboard/manager" className="font-medium hover:underline">Manager</Link>
          <Link href="/opportunities" className="font-medium hover:underline">Opportunities</Link>
          <Link href="/analytics/competitive" className="font-medium hover:underline">Competitive</Link>
          <Link href="/analytics/benchmarks" className="font-medium hover:underline">Benchmarks</Link>
          <Link href="/analytics/portfolios" className="font-medium hover:underline">Portfolios</Link>
          <Link href="/settings/competitors" className="font-medium hover:underline">Competitors</Link>
          <Link href="/settings/industries" className="font-medium hover:underline">Industries</Link>
          <Link href="/settings/integrations" className="font-medium hover:underline">Integrations</Link>
          <Link href="/admin" className="font-medium hover:underline text-purple-600">Admin</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}

