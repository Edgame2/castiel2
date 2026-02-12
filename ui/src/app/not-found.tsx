/**
 * 404 — Not found. Plan §2.10.
 * Rendered when a route does not match or when notFound() is called from next/navigation.
 * Content uses i18n (NotFoundContent) so language switcher applies when shown in-app.
 */

import type { Metadata } from "next";
import { NotFoundContent } from "./not-found-content";

export const metadata: Metadata = {
  title: "Page not found | Castiel",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return <NotFoundContent />;
}
