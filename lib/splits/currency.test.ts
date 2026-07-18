import { describe, expect, it } from "vitest";
import { SUPPORTED_CURRENCIES } from "./constants";
import {
  fromMinorUnits,
  minorUnitDecimals,
  roundToCurrencyPrecision,
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
});
