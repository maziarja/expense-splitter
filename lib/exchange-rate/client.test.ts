import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_CURRENCIES } from "../splits/constants";
import { ExchangeRateApiError, fetchLatestRates } from "./client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

describe("fetchLatestRates", () => {
  beforeEach(() => {
    vi.stubEnv("CURRENCY_API_KEY", "test-key");
    vi.stubEnv("CURRENCY_API_BASE_URL", "https://v6.exchangerate-api.com/v6");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("filters conversion_rates down to only SUPPORTED_CURRENCIES", async () => {
    const conversionRates: Record<string, number> = {
      AWG: 1.79, // a currency we don't support, should be dropped
    };
    for (const currency of SUPPORTED_CURRENCIES) {
      conversionRates[currency] = currency === "JPY" ? 148.1 : 1;
    }

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        result: "success",
        base_code: "USD",
        time_last_update_unix: 1690848001,
        conversion_rates: conversionRates,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await fetchLatestRates("USD");

    expect(snapshot.base).toBe("USD");
    expect(Object.keys(snapshot.rates).sort()).toEqual(
      [...SUPPORTED_CURRENCIES].sort(),
    );
    expect(snapshot.rates.JPY).toBe(148.1);
    expect(snapshot.fetchedAt).toEqual(new Date(1690848001 * 1000));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://v6.exchangerate-api.com/v6/test-key/latest/USD",
    );
  });

  it("throws with the API's own error-type on a result: error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          result: "error",
          "error-type": "invalid-key",
        }),
      ),
    );

    await expect(fetchLatestRates("USD")).rejects.toMatchObject({
      code: "invalid-key",
    });
    await expect(fetchLatestRates("USD")).rejects.toBeInstanceOf(
      ExchangeRateApiError,
    );
  });

  it("throws network-error when fetch itself rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connection reset")),
    );

    await expect(fetchLatestRates("USD")).rejects.toMatchObject({
      code: "network-error",
    });
  });

  it("throws invalid-response on a non-JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not json", {
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    await expect(fetchLatestRates("USD")).rejects.toMatchObject({
      code: "invalid-response",
    });
  });

  it("throws invalid-response on an unexpected success-like shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          result: "success",
          base_code: "USD",
          // missing time_last_update_unix / conversion_rates
        }),
      ),
    );

    await expect(fetchLatestRates("USD")).rejects.toMatchObject({
      code: "invalid-response",
    });
  });
});
