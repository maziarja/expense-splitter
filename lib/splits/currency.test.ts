import { describe, expect, it } from "vitest";
import { SUPPORTED_CURRENCIES } from "./constants";
import {
  formatCurrency,
  fromMinorUnits,
  getCurrencyOptions,
  getCurrencySymbol,
  isNegligibleAmount,
  minorUnitDecimals,
  roundToCurrencyPrecision,
  sanitizeDecimalInput,
  toMinorUnits,
} from "./currency";

describe("minorUnitDecimals", () => {
  it("returns 0 for JPY and 2 for every other supported currency", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(minorUnitDecimals(currency)).toBe(currency === "JPY" ? 0 : 2);
    }
  });
});

describe("toMinorUnits / fromMinorUnits", () => {
  it("round-trips decimal amounts through minor units", () => {
    expect(toMinorUnits(24.5, "USD")).toBe(2450);
    expect(fromMinorUnits(2450, "USD")).toBe(24.5);
    expect(toMinorUnits(4850, "JPY")).toBe(4850);
    expect(fromMinorUnits(4850, "JPY")).toBe(4850);
  });

  it("round-trips negative amounts", () => {
    expect(toMinorUnits(-24.5, "USD")).toBe(-2450);
    expect(fromMinorUnits(-2450, "USD")).toBe(-24.5);
  });

  it("rounds fractional JPY input to the nearest whole yen", () => {
    expect(toMinorUnits(4850.4, "JPY")).toBe(4850);
    expect(toMinorUnits(4850.6, "JPY")).toBe(4851);
  });
});

describe("roundToCurrencyPrecision", () => {
  it("rounds to 2 decimals for standard currencies and 0 for JPY", () => {
    expect(roundToCurrencyPrecision(10 / 3, "USD")).toBe(3.33);
    expect(roundToCurrencyPrecision(10 / 3, "JPY")).toBe(3);
  });

  it("is a no-op on values already at the correct precision", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      const amount = currency === "JPY" ? 100 : 24.5;
      expect(roundToCurrencyPrecision(amount, currency)).toBe(amount);
    }
  });

  it("rounds negative amounts to the same precision as positive ones", () => {
    expect(roundToCurrencyPrecision(-10 / 3, "USD")).toBe(-3.33);
    expect(roundToCurrencyPrecision(-10 / 3, "JPY")).toBe(-3);
  });

  it("rounds a half-cent input using Math.round's half-up-towards-+Infinity rule", () => {
    expect(roundToCurrencyPrecision(2.005, "USD")).toBe(2.01);
    expect(roundToCurrencyPrecision(-2.005, "USD")).toBe(-2);
  });
});

describe("isNegligibleAmount", () => {
  it("treats a 1-minor-unit residual as negligible but 2 as real", () => {
    expect(isNegligibleAmount(0.01, "USD")).toBe(true);
    expect(isNegligibleAmount(-0.01, "USD")).toBe(true);
    expect(isNegligibleAmount(0.02, "USD")).toBe(false);
    expect(isNegligibleAmount(1, "JPY")).toBe(true);
    expect(isNegligibleAmount(2, "JPY")).toBe(false);
  });
});

describe("formatCurrency", () => {
  it("formats standard currencies with 2 decimals and thousands separators", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("formats zero-decimal currencies with no decimals", () => {
    expect(formatCurrency(4850, "JPY")).toBe("¥4,850");
  });

  it("formats negative amounts with a leading minus sign", () => {
    expect(formatCurrency(-45, "USD")).toBe("-$45.00");
  });

  it("formats a negative zero-decimal amount", () => {
    expect(formatCurrency(-4850, "JPY")).toBe("-¥4,850");
  });

  it("formats a currency whose symbol isn't $ or ¥", () => {
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50");
    expect(formatCurrency(1234.5, "GBP")).toBe("£1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
    expect(formatCurrency(0, "JPY")).toBe("¥0");
  });

  it("formats large amounts with grouping separators beyond thousands", () => {
    expect(formatCurrency(1234567.89, "USD")).toBe("$1,234,567.89");
  });
});

describe("getCurrencySymbol", () => {
  it("resolves each currency's own symbol, including non-Intl-derived ones", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("CAD")).toBe("$");
    expect(getCurrencySymbol("AUD")).toBe("$");
    expect(getCurrencySymbol("MXN")).toBe("$");
    expect(getCurrencySymbol("CHF")).toBe("Fr.");
    expect(getCurrencySymbol("JPY")).toBe("¥");
    expect(getCurrencySymbol("CNY")).toBe("¥");
    expect(getCurrencySymbol("INR")).toBe("₹");
  });
});

describe("getCurrencyOptions", () => {
  it("returns every supported currency, in order, with a matching symbol and name", () => {
    const options = getCurrencyOptions();
    expect(options.map((option) => option.code)).toEqual(SUPPORTED_CURRENCIES);
    for (const option of options) {
      expect(option.symbol).toBe(getCurrencySymbol(option.code));
      expect(option.name.length).toBeGreaterThan(0);
    }
  });
});

describe("sanitizeDecimalInput", () => {
  it("strips non-digit, non-dot characters", () => {
    expect(sanitizeDecimalInput("$1,234.5")).toBe("1234.5");
  });

  it("collapses multiple dots down to the first one", () => {
    expect(sanitizeDecimalInput("12.34.56")).toBe("12.3456");
  });

  it("leaves a lone leading dot in place", () => {
    expect(sanitizeDecimalInput(".")).toBe(".");
    expect(sanitizeDecimalInput(".5")).toBe(".5");
  });

  it("returns an empty string for input with no digits or dot", () => {
    expect(sanitizeDecimalInput("abc")).toBe("");
    expect(sanitizeDecimalInput("")).toBe("");
  });
});
