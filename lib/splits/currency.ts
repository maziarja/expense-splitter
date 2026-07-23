import {
  SUPPORTED_CURRENCIES,
  ZERO_DECIMAL_CURRENCIES,
  type CurrencyCode,
} from "./constants";

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

const CURRENCY_LOCALE = "en-US";

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const decimals = minorUnitDecimals(currency);
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  const part = new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency,
  })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  MXN: "Mexican Peso",
};

export type CurrencyOption = {
  code: CurrencyCode;
  symbol: string;
  name: string;
};

export function getCurrencyOptions(): CurrencyOption[] {
  return SUPPORTED_CURRENCIES.map((code) => ({
    code,
    symbol: getCurrencySymbol(code),
    name: CURRENCY_NAMES[code],
  }));
}
