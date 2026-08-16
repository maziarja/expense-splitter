import { afterEach, describe, expect, it, vi } from "vitest";

const getExchangeRate = vi.fn();

vi.mock("@/lib/exchange-rate/cache", () => ({
  getExchangeRate: (...args: unknown[]) => getExchangeRate(...args),
}));

const { getExchangeRateAction } = await import("./exchange-rate");

describe("getExchangeRateAction", () => {
  afterEach(() => {
    getExchangeRate.mockReset();
  });

  it("passes through a successful lookup", async () => {
    const lookup = { rate: 1.1, fetchedAt: new Date(), stale: false };
    getExchangeRate.mockResolvedValue(lookup);

    const result = await getExchangeRateAction("USD", "EUR");

    expect(result).toEqual({ ok: true, data: lookup });
    expect(getExchangeRate).toHaveBeenCalledWith("USD", "EUR");
  });

  it("returns an ok:false result with a manual-entry message when the lookup throws", async () => {
    getExchangeRate.mockRejectedValue(new Error("upstream down"));

    const result = await getExchangeRateAction("USD", "EUR");

    expect(result).toEqual({
      ok: false,
      message: "Couldn't fetch a live exchange rate. Enter it manually.",
    });
  });
});
