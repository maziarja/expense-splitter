import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_CURRENCIES } from "../splits/constants";
import { ExchangeRateApiError } from "./client";

const findUnique = vi.fn();
const upsert = vi.fn();
const $transaction = vi.fn();
const fetchLatestRates = vi.fn();

vi.mock("../prisma", () => ({
  prisma: {
    exchangeRateCache: {
      get findUnique() {
        return findUnique;
      },
      get upsert() {
        return upsert;
      },
    },
    get $transaction() {
      return $transaction;
    },
  },
}));

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    fetchLatestRates: (...args: unknown[]) => fetchLatestRates(...args),
  };
});

// Imported after the mocks above so `getExchangeRate` picks up the mocked
// `prisma`/`fetchLatestRates` bindings rather than the real modules.
const { STALE_AFTER_MS, isStale, getExchangeRate } = await import("./cache");

function cachedRow(rate: number, fetchedAt: Date) {
  return { rate: { toNumber: () => rate }, fetchedAt };
}

function ratesSnapshot(overrides: Partial<Record<string, number>> = {}) {
  const rates = {} as Record<string, number>;
  for (const currency of SUPPORTED_CURRENCIES) {
    rates[currency] = overrides[currency] ?? 1;
  }
  return {
    base: "USD",
    rates,
    fetchedAt: new Date("2026-08-01T00:00:00.000Z"),
  };
}

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

describe("getExchangeRate", () => {
  afterEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    $transaction.mockReset();
    fetchLatestRates.mockReset();
  });

  it("short-circuits to rate 1 for the same base and quote, without touching the cache", async () => {
    const result = await getExchangeRate("USD", "USD");

    expect(result.rate).toBe(1);
    expect(result.stale).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
    expect(fetchLatestRates).not.toHaveBeenCalled();
  });

  it("returns a fresh cached rate without re-fetching", async () => {
    const fetchedAt = new Date();
    findUnique.mockResolvedValue(cachedRow(1.1, fetchedAt));

    const result = await getExchangeRate("USD", "EUR");

    expect(result).toEqual({ rate: 1.1, fetchedAt, stale: false });
    expect(fetchLatestRates).not.toHaveBeenCalled();
  });

  it("fetches and caches new rates on a cold cache", async () => {
    findUnique.mockResolvedValue(null);
    fetchLatestRates.mockResolvedValue(ratesSnapshot({ EUR: 0.92 }));
    $transaction.mockResolvedValue(undefined);

    const result = await getExchangeRate("USD", "EUR");

    expect(result.rate).toBe(0.92);
    expect(result.stale).toBe(false);
    expect(fetchLatestRates).toHaveBeenCalledWith("USD");
    expect(upsert).toHaveBeenCalledTimes(SUPPORTED_CURRENCIES.length);
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("re-fetches and caches new rates when the cached row is stale", async () => {
    const staleFetchedAt = new Date(Date.now() - STALE_AFTER_MS - 1000);
    findUnique.mockResolvedValue(cachedRow(1, staleFetchedAt));
    fetchLatestRates.mockResolvedValue(ratesSnapshot({ EUR: 0.93 }));
    $transaction.mockResolvedValue(undefined);

    const result = await getExchangeRate("USD", "EUR");

    expect(result.rate).toBe(0.93);
    expect(result.stale).toBe(false);
    expect(fetchLatestRates).toHaveBeenCalledWith("USD");
  });

  it("falls back to the stale cached rate when the API call fails", async () => {
    const staleFetchedAt = new Date(Date.now() - STALE_AFTER_MS - 1000);
    findUnique.mockResolvedValue(cachedRow(1.05, staleFetchedAt));
    fetchLatestRates.mockRejectedValue(
      new ExchangeRateApiError("quota exceeded", "quota-reached"),
    );

    const result = await getExchangeRate("USD", "EUR");

    expect(result).toEqual({
      rate: 1.05,
      fetchedAt: staleFetchedAt,
      stale: true,
    });
  });

  it("rethrows the API error when there's no cached row to fall back to", async () => {
    findUnique.mockResolvedValue(null);
    fetchLatestRates.mockRejectedValue(
      new ExchangeRateApiError("quota exceeded", "quota-reached"),
    );

    await expect(getExchangeRate("USD", "EUR")).rejects.toBeInstanceOf(
      ExchangeRateApiError,
    );
  });

  it("rethrows a non-API error (e.g. a database failure) even with a stale cached row available", async () => {
    const staleFetchedAt = new Date(Date.now() - STALE_AFTER_MS - 1000);
    findUnique.mockResolvedValue(cachedRow(1.05, staleFetchedAt));
    fetchLatestRates.mockResolvedValue(ratesSnapshot());
    $transaction.mockRejectedValue(new Error("connection lost"));

    await expect(getExchangeRate("USD", "EUR")).rejects.toThrow(
      "connection lost",
    );
  });
});
