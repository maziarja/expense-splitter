import type { CurrencyCode } from "./constants";
import { fromMinorUnits, toMinorUnits } from "./currency";
import type { Split } from "./schema";

export type SharesSplitEntry = {
  memberId: string;
  shares: number;
};

export type SharesSplitInput = {
  amount: number;
  currency: CurrencyCode;
  splits: SharesSplitEntry[];
};

// Derives each member's amount from their proportion of the total shares
// (2 shares out of 6 total = 1/3 of the amount). Same "divide a whole
// amount proportionally" problem as calculatePercentageSplit, just with
// shares instead of percentages as the weights, so it uses the same
// largest-remainder rounding: floor everyone's ideal share, then hand out
// the leftover minor units to whoever was closest to rounding up. Unlike
// percentages, shares have no fixed target to sum to (2:2:1:1 and 5:3:2 are
// both valid), so there's no separate sum validator — only the degenerate
// all-zero case needs guarding against.
export function calculateSharesSplit({
  amount,
  currency,
  splits,
}: SharesSplitInput): Split[] {
  const totalShares = splits.reduce((sum, split) => sum + split.shares, 0);
  if (totalShares <= 0) {
    throw new Error(
      "calculateSharesSplit requires the shares to total more than zero",
    );
  }

  const totalMinorUnits = toMinorUnits(amount, currency);

  const allocations = splits.map((split) => {
    const idealMinorUnits = (totalMinorUnits * split.shares) / totalShares;
    const baseMinorUnits = Math.floor(idealMinorUnits);
    return {
      memberId: split.memberId,
      shares: split.shares,
      baseMinorUnits,
      remainder: idealMinorUnits - baseMinorUnits,
    };
  });

  const allocatedMinorUnits = allocations.reduce(
    (sum, allocation) => sum + allocation.baseMinorUnits,
    0,
  );
  let unitsLeftToDistribute = totalMinorUnits - allocatedMinorUnits;

  const byRemainderDesc = [...allocations].sort(
    (a, b) => b.remainder - a.remainder,
  );
  for (const allocation of byRemainderDesc) {
    if (unitsLeftToDistribute <= 0) break;
    allocation.baseMinorUnits += 1;
    unitsLeftToDistribute -= 1;
  }

  return allocations.map((allocation) => ({
    memberId: allocation.memberId,
    amount: fromMinorUnits(allocation.baseMinorUnits, currency),
    shares: allocation.shares,
  }));
}
