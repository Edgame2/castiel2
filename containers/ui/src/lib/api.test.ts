import { describe, it, expect, afterEach } from "vitest";
import { getApiBaseUrl, GENERIC_ERROR_MESSAGE } from "./api";

const original = process.env.NEXT_PUBLIC_API_BASE_URL;

describe("api", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = original;
  });

  describe("getApiBaseUrl", () => {
    it("returns empty string when NEXT_PUBLIC_API_BASE_URL is unset", () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = "";
      expect(getApiBaseUrl()).toBe("");
    });

    it("returns base URL without trailing slash", () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/";
      expect(getApiBaseUrl()).toBe("https://api.example.com");
    });

    it("returns base URL as-is when no trailing slash", () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
      expect(getApiBaseUrl()).toBe("https://api.example.com");
    });
  });

  describe("GENERIC_ERROR_MESSAGE", () => {
    it("is a non-empty user-facing message", () => {
      expect(GENERIC_ERROR_MESSAGE).toBe("Something went wrong. Please try again.");
    });
  });
});
