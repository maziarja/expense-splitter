import { ZERO_DECIMAL_CURRENCIES, type CurrencyCode } from "./constants";

// Number of decimal places a currency's minor unit uses — 0 for JPY
// (whole yen only), 2 for everything else we support.
export function minorUnitDecimals(currency: CurrencyCode): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
}

// Converts a decimal amount (24.50) to an integer count of minor units
// (2450 cents, or 4850 for zero-decimal JPY) so splits can be computed
// with integer arithmetic instead of floating point.
export function toMinorUnits(amount: number, currency: CurrencyCode): number {
  const factor = 10 ** minorUnitDecimals(currency);
  return Math.round(amount * factor);
}

export function fromMinorUnits(
  minorUnits: number,
  currency: CurrencyCode,
): number {
  const factor = 10 ** minorUnitDecimals(currency);
  return minorUnits / factor;
}
