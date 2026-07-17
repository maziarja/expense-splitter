import type { CurrencyCode } from "./constants";
import { fromMinorUnits, toMinorUnits } from "./currency";
import type { Split } from "./schema";

export type PercentageSplitEntry = {
  memberId: string;
  percentage: number;
};

export type PercentageSplitInput = {
  amount: number;
  currency: CurrencyCode;
  splits: PercentageSplitEntry[];
};

export type PercentageValidation = {
  valid: boolean;
  sum: number;
};

const BASIS_POINTS_PER_PERCENT = 100;
const FULL_BASIS_POINTS = 100 * BASIS_POINTS_PER_PERCENT;

function toBasisPoints(percentage: number): number {
  return Math.round(percentage * BASIS_POINTS_PER_PERCENT);
}

export function validatePercentageSplit(
  percentages: number[],
): PercentageValidation {
  const sum = percentages.reduce((total, value) => total + value, 0);
  const sumBasisPoints = percentages.reduce(
    (total, value) => total + toBasisPoints(value),
    0,
  );
  return {
    valid: sumBasisPoints === FULL_BASIS_POINTS,
    sum,
  };
}

export function calculatePercentageSplit({
  amount,
  currency,
  splits,
}: PercentageSplitInput): Split[] {
  const { valid } = validatePercentageSplit(
    splits.map((split) => split.percentage),
  );
  if (!valid) {
    throw new Error(
      "calculatePercentageSplit requires percentages that sum to 100",
    );
  }

  const totalMinorUnits = toMinorUnits(amount, currency);

  const shares = splits.map((split) => {
    const idealMinorUnits = (totalMinorUnits * split.percentage) / 100;
    const baseMinorUnits = Math.floor(idealMinorUnits);
    return {
      memberId: split.memberId,
      percentage: split.percentage,
      baseMinorUnits,
      remainder: idealMinorUnits - baseMinorUnits,
    };
  });

  const allocatedMinorUnits = shares.reduce(
    (sum, share) => sum + share.baseMinorUnits,
    0,
  );
  let unitsLeftToDistribute = totalMinorUnits - allocatedMinorUnits;

  const byRemainderDesc = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (const share of byRemainderDesc) {
    if (unitsLeftToDistribute <= 0) break;
    share.baseMinorUnits += 1;
    unitsLeftToDistribute -= 1;
  }

  return shares.map((share) => ({
    memberId: share.memberId,
    amount: fromMinorUnits(share.baseMinorUnits, currency),
    percentage: share.percentage,
  }));
}
