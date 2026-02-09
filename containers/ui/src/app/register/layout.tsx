import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account | Castiel",
  description: "Create a new Castiel account",
};

export default function RegisterLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
