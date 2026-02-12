import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Revimize - Sales Risk Intelligence",
  description: "High-fidelity UI mockup: opportunities, risk, recommendations, chain of thought.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b bg-card">
          <div className="container mx-auto flex h-14 items-center px-4">
            <Link href="/" className="font-semibold">
              Revimize
            </Link>
            <nav className="ml-6 flex gap-4">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Opportunities
              </Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
