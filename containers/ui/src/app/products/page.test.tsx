/**
 * Products list page — module and default export (smoke).
 */

import { describe, it, expect } from "vitest";
import ProductsListPage from "./page";

describe("ProductsListPage", () => {
  it("exports a default component", () => {
    expect(ProductsListPage).toBeDefined();
    expect(typeof ProductsListPage).toBe("function");
  });
});
