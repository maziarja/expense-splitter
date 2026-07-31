import { cache } from "react";
import { prisma } from "../prisma";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../splits/constants";
import { fetchLatestRates } from "./client";

export const STALE_AFTER_MS = 60 * 60 * 1000;

export function isStale(fetchedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - fetchedAt.getTime() > STALE_AFTER_MS;
}

export type ExchangeRateLookup = {
  rate: number;
  fetchedAt: Date;
};

export const getExchangeRate = cache(
  async (
    base: CurrencyCode,
    quote: CurrencyCode,
  ): Promise<ExchangeRateLookup> => {
    if (base === quote) {
      return { rate: 1, fetchedAt: new Date() };
    }

    const cached = await prisma.exchangeRateCache.findUnique({
      where: { base_quote: { base, quote } },
    });

    if (cached && !isStale(cached.fetchedAt)) {
      return { rate: cached.rate.toNumber(), fetchedAt: cached.fetchedAt };
    }

    // The API returns rates from `base` to every currency it supports in one
    // call, so this refresh populates the cache for every other
    // SUPPORTED_CURRENCIES quote against this base too, not just the one
    // requested.
    const snapshot = await fetchLatestRates(base);
    // Stamped with the local fetch time, not snapshot.fetchedAt (when the
    // upstream rate data itself last changed) — ExchangeRate-API's free tier
    // only updates that once a day, so reusing it here would make the same
    // stale row look "just refreshed" forever after the first hourly
    // refetch, defeating the staleness check.
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

    return { rate: snapshot.rates[quote], fetchedAt };
  },
);
