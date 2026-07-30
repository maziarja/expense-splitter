import { describe, expect, it } from "vitest";
import { DataAccessError } from "@/lib/data/data-access";
import { unwrapActionResult } from "./action-result";

describe("unwrapActionResult", () => {
  it("returns the data on success", () => {
    expect(unwrapActionResult({ ok: true, data: { id: "g1" } })).toEqual({
      id: "g1",
    });
  });

  it("throws a matching DataAccessError on failure", () => {
    expect(() =>
      unwrapActionResult({
        ok: false,
        code: "GROUP_NOT_FOUND",
        message: 'Group "g1" not found',
      }),
    ).toThrow(DataAccessError);

    try {
      unwrapActionResult({
        ok: false,
        code: "GROUP_NOT_FOUND",
        message: 'Group "g1" not found',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(DataAccessError);
      expect((err as DataAccessError).code).toBe("GROUP_NOT_FOUND");
      expect((err as DataAccessError).message).toBe('Group "g1" not found');
    }
  });
});
