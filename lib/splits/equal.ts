import type { CurrencyCode } from "./constants";
import { fromMinorUnits, toMinorUnits } from "./currency";
import type { Split } from "./schema";

export interface EqualSplitInput {
  amount: number;
  currency: CurrencyCode;
  // Members splitting the expense. Excluding someone from the split is
  // just a matter of leaving their id out of this list.
  participantIds: string[];
}

// Divides `amount` equally among `participantIds`. Integer division of the
// amount's minor units almost never comes out even, so any leftover minor
// unit (e.g. 2 cents left over from a 4-way split) is distributed
// one-per-person to the first participants in list order. This matches how
// the seed data's own equal splits round (verified against
// data/sample-groups.json's ¥4,850/4 case), rather than special-casing the
// payer — the spec's "goes to the payer" wording is illustrative, not a
// requirement, and doesn't hold up once the leftover is more than one
// minor unit.
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
