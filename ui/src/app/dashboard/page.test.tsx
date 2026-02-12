/**
 * Dashboard page — module and default export (smoke).
 */

import { describe, it, expect } from "vitest";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("exports a default component", () => {
    expect(DashboardPage).toBeDefined();
    expect(typeof DashboardPage).toBe("function");
  });
});
