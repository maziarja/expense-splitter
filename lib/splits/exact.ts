import type { CurrencyCode } from "./constants";
import { toMinorUnits } from "./currency";

export type ExactSplitValidation = {
  valid: boolean;
  differenceMinorUnits: number;
};

export function validateExactSplit(
  amount: number,
  currency: CurrencyCode,
  splitAmounts: number[],
): ExactSplitValidation {
  const totalMinorUnits = toMinorUnits(amount, currency);
  const splitSumMinorUnits = splitAmounts.reduce(
    (sum, splitAmount) => sum + toMinorUnits(splitAmount, currency),
    0,
  );
  return {
    valid: splitSumMinorUnits === totalMinorUnits,
    differenceMinorUnits: splitSumMinorUnits - totalMinorUnits,
  };
}
