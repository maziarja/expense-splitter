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
