import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Castiel",
  description: "Sign in to your Castiel account",
};

export default function LoginLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
