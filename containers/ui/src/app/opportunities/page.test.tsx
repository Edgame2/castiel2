/**
 * Opportunities list page — module and default export (smoke).
 */

import { describe, it, expect } from "vitest";
import OpportunitiesListPage from "./page";

describe("OpportunitiesListPage", () => {
  it("exports a default component", () => {
    expect(OpportunitiesListPage).toBeDefined();
    expect(typeof OpportunitiesListPage).toBe("function");
  });
});
