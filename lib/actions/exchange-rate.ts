"use server";

import {
  getExchangeRate,
  type ExchangeRateLookup,
} from "@/lib/exchange-rate/cache";
import type { CurrencyCode } from "@/lib/splits/constants";

export type ExchangeRateActionResult =
  { ok: true; data: ExchangeRateLookup } | { ok: false; message: string };

// Unlike every other lib/actions file, this one deliberately skips
// requireAuth(): the ExchangeRateCache table isn't scoped to a user or
// group, and both guest and authenticated add-expense forms need a live
// rate to prefill the exchange-rate field, so this is callable from either.
export async function getExchangeRateAction(
  base: CurrencyCode,
  quote: CurrencyCode,
): Promise<ExchangeRateActionResult> {
  try {
    return { ok: true, data: await getExchangeRate(base, quote) };
  } catch {
    return {
      ok: false,
      message: "Couldn't fetch a live exchange rate. Enter it manually.",
    };
  }
}
