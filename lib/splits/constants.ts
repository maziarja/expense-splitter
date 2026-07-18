// Minimum currency set required by spec/technical-requirements.md.
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
  "MXN",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<CurrencyCode> = new Set([
  "JPY",
]);

export const PREDEFINED_CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Accommodation",
  "Housing",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Groceries",
  "Other",
] as const;
