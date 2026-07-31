import { describe, expect, it } from "vitest";
import { STALE_AFTER_MS, isStale } from "./cache";

describe("isStale", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("is not stale just under the 1 hour threshold", () => {
    const fetchedAt = new Date(now.getTime() - STALE_AFTER_MS + 1);
    expect(isStale(fetchedAt, now)).toBe(false);
  });

  it("is not stale exactly at the 1 hour threshold", () => {
    const fetchedAt = new Date(now.getTime() - STALE_AFTER_MS);
    expect(isStale(fetchedAt, now)).toBe(false);
  });

  it("is stale just over the 1 hour threshold", () => {
    const fetchedAt = new Date(now.getTime() - STALE_AFTER_MS - 1);
    expect(isStale(fetchedAt, now)).toBe(true);
  });

  it("defaults `now` to the current time when omitted", () => {
    const fetchedAt = new Date(Date.now() - STALE_AFTER_MS - 1000);
    expect(isStale(fetchedAt)).toBe(true);
  });
});
