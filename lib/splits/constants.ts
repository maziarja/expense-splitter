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

export type PredefinedCategory = (typeof PREDEFINED_CATEGORIES)[number];

// Fixed, not user-configurable — unlike custom categories' colors, these are
// shared/global across every group, so they can't be picked per-instance.
// "Other" is deliberately left out (falls back to a neutral gray), since a
// catch-all bucket reading as "uncategorized" is more honest than forcing it
// into a 9th arbitrary color. Drawn from the same palette avatars use
// (`AVATAR_COLOR_PALETTE`) to keep the app to one color vocabulary; the 4
// colors left out here stay available for auto-assigning custom categories
// without an immediate visual clash.
export const PREDEFINED_CATEGORY_COLORS: Partial<
  Record<PredefinedCategory, string>
> = {
  "Food & Drink": "#F59E0B",
  Transport: "#3B82F6",
  Accommodation: "#8B5CF6",
  Housing: "#14B8A6",
  Entertainment: "#EC4899",
  Shopping: "#F43F5E",
  Utilities: "#06B6D4",
  Groceries: "#10B981",
};

// Collapses internal whitespace runs (e.g. "Food   &  Drink" -> "Food & Drink")
// in addition to trimming, so visually-identical names can't be saved as
// separate categories just by differing in spacing.
export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
