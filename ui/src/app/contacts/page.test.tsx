/**
 * Contacts list page — module and default export (smoke).
 */

import { describe, it, expect } from "vitest";
import ContactsListPage from "./page";

describe("ContactsListPage", () => {
  it("exports a default component", () => {
    expect(ContactsListPage).toBeDefined();
    expect(typeof ContactsListPage).toBe("function");
  });
});
