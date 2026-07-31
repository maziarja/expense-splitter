import { cache } from "react";
import { prisma } from "../prisma";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../splits/constants";
import { ExchangeRateApiError, fetchLatestRates } from "./client";

export const STALE_AFTER_MS = 60 * 60 * 1000;

export function isStale(fetchedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - fetchedAt.getTime() > STALE_AFTER_MS;
}

export type ExchangeRateLookup = {
  rate: number;
  fetchedAt: Date;

  stale: boolean;
};

export const getExchangeRate = cache(
  async (
    base: CurrencyCode,
    quote: CurrencyCode,
  ): Promise<ExchangeRateLookup> => {
    if (base === quote) {
      return { rate: 1, fetchedAt: new Date(), stale: false };
    }

    const cached = await prisma.exchangeRateCache.findUnique({
      where: { base_quote: { base, quote } },
    });

    if (cached && !isStale(cached.fetchedAt)) {
      return {
        rate: cached.rate.toNumber(),
        fetchedAt: cached.fetchedAt,
        stale: false,
      };
    }

    try {
      const snapshot = await fetchLatestRates(base);

      const fetchedAt = new Date();
      await prisma.$transaction(
        SUPPORTED_CURRENCIES.map((currency) =>
          prisma.exchangeRateCache.upsert({
            where: { base_quote: { base, quote: currency } },
            update: { rate: snapshot.rates[currency], fetchedAt },
            create: {
              base,
              quote: currency,
              rate: snapshot.rates[currency],
              fetchedAt,
            },
          }),
        ),
      );

      return { rate: snapshot.rates[quote], fetchedAt, stale: false };
    } catch (err) {
      // Only a known API failure falls back to stale data — anything else
      // (e.g. a Prisma error from the upsert) is a real failure, not a
      // "rates may be outdated" situation, and should propagate as-is.
      if (err instanceof ExchangeRateApiError && cached) {
        return {
          rate: cached.rate.toNumber(),
          fetchedAt: cached.fetchedAt,
          stale: true,
        };
      }
      throw err;
    }
  },
);
