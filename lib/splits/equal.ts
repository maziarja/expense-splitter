import type { CurrencyCode } from "./constants";
import { fromMinorUnits, toMinorUnits } from "./currency";
import type { Split } from "./schema";

export type EqualSplitInput = {
  amount: number;
  currency: CurrencyCode;
  participantIds: string[];
};

export function calculateEqualSplit({
  amount,
  currency,
  participantIds,
}: EqualSplitInput): Split[] {
  if (participantIds.length === 0) {
    throw new Error("calculateEqualSplit requires at least one participant");
  }

  const totalMinorUnits = toMinorUnits(amount, currency);
  const participantCount = participantIds.length;
  const baseShareMinorUnits = Math.floor(totalMinorUnits / participantCount);
  const remainder = totalMinorUnits - baseShareMinorUnits * participantCount;

  return participantIds.map((memberId, index) => {
    const shareMinorUnits = baseShareMinorUnits + (index < remainder ? 1 : 0);
    return {
      memberId,
      amount: fromMinorUnits(shareMinorUnits, currency),
    };
  });
}
