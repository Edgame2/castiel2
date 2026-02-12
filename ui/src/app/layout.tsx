import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { I18nProvider } from "@/components/I18nProvider";
import { ProtectedLayout } from "@/components/ProtectedLayout";
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
        <I18nProvider>
          <ProtectedLayout>{children}</ProtectedLayout>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}

