import { ZERO_DECIMAL_CURRENCIES, type CurrencyCode } from "./constants";

export function minorUnitDecimals(currency: CurrencyCode): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
}

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

export function roundToCurrencyPrecision(
  amount: number,
  currency: CurrencyCode,
): number {
  return fromMinorUnits(toMinorUnits(amount, currency), currency);
}

export function isNegligibleAmount(
  amount: number,
  currency: CurrencyCode,
): boolean {
  return Math.abs(toMinorUnits(amount, currency)) <= 1;
}
