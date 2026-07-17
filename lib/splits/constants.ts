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

// Currencies with zero minor units (no decimal places), per
// spec/technical-requirements.md's rounding guidance. Used by the
// currency-aware rounding step later in Phase 1.
export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<CurrencyCode> = new Set([
  "JPY",
]);

// Predefined list from spec/core-requirements.md feature 2. Custom
// categories are also allowed (feature 8), so schema validation only
// requires a non-empty string, not membership in this list.
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
