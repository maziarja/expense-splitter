import type { CurrencyCode } from "./constants";
import {
  fromMinorUnits,
  roundToCurrencyPrecision,
  toMinorUnits,
} from "./currency";

export type ExpenseForBalance = {
  paidBy: string;
  currency: CurrencyCode;
  exchangeRate: number;
  splits: { memberId: string; amount: number }[];
};

export type SettlementForBalance = {
  from: string;
  to: string;
  currency: CurrencyCode;
  exchangeRate: number;
  amount: number;
};

export type MemberBalance = {
  memberId: string;
  // In the group's default currency. Positive: owed money. Negative: owes
  // money. Matches spec wording exactly: "total they paid - total they owe."
  netBalance: number;
};

export type SettlementSuggestion = {
  from: string; // owes
  to: string; // is owed
  amount: number; // in the group's default currency, always positive
};

export type BalanceCalculationInput = {
  memberIds: string[];
  expenses: ExpenseForBalance[];
  settlements: SettlementForBalance[];
  groupCurrency: CurrencyCode;
};

export type BalanceCalculationResult = {
  memberBalances: MemberBalance[];
  settlementSuggestions: SettlementSuggestion[];
};

// Converts an amount from its own currency to the group's default currency
// using the rate stored at the time it was recorded, in integer minor units
// of the group currency.
function convertedMinorUnits(
  amount: number,
  exchangeRate: number,
  groupCurrency: CurrencyCode,
): number {
  const converted = roundToCurrencyPrecision(
    amount * exchangeRate,
    groupCurrency,
  );
  return toMinorUnits(converted, groupCurrency);
}

export function calculateBalances({
  memberIds,
  expenses,
  settlements,
  groupCurrency,
}: BalanceCalculationInput): BalanceCalculationResult {
  const netMinorUnits = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const adjust = (memberId: string, minorUnits: number) =>
    netMinorUnits.set(
      memberId,
      (netMinorUnits.get(memberId) ?? 0) + minorUnits,
    );

  // Pairwise ledger — owedBy[debtor][creditor] = minor units debtor owes
  // creditor — kept separate from netMinorUnits above (rather than derived
  // from it) so the two independently-computed totals can be cross-checked
  // against each other in verification.
  const owedBy = new Map<string, Map<string, number>>();
  const addDebt = (debtor: string, creditor: string, minorUnits: number) => {
    if (debtor === creditor || minorUnits === 0) return;
    if (!owedBy.has(debtor)) owedBy.set(debtor, new Map());
    const row = owedBy.get(debtor)!;
    row.set(creditor, (row.get(creditor) ?? 0) + minorUnits);
  };

  for (const expense of expenses) {
    // Convert each split first, then sum the converted values for the
    // payer's credit — rather than separately converting expense.amount —
    // so the payer's credit exactly equals the sum of participants' debits
    // for this expense, even after currency-conversion rounding.
    const convertedSplits = expense.splits.map((split) => ({
      memberId: split.memberId,
      minorUnits: convertedMinorUnits(
        split.amount,
        expense.exchangeRate,
        groupCurrency,
      ),
    }));
    const totalMinorUnits = convertedSplits.reduce(
      (sum, split) => sum + split.minorUnits,
      0,
    );

    adjust(expense.paidBy, totalMinorUnits);
    for (const split of convertedSplits) {
      adjust(split.memberId, -split.minorUnits);
      addDebt(split.memberId, expense.paidBy, split.minorUnits);
    }
  }

  for (const settlement of settlements) {
    const minorUnits = convertedMinorUnits(
      settlement.amount,
      settlement.exchangeRate,
      groupCurrency,
    );
    // `from` paid `to`, so from's balance rises (debt paid off) and to's
    // falls (they've now been paid what they were owed).
    adjust(settlement.from, minorUnits);
    adjust(settlement.to, -minorUnits);
    addDebt(settlement.from, settlement.to, -minorUnits);
  }

  const memberBalances: MemberBalance[] = memberIds.map((memberId) => ({
    memberId,
    netBalance: fromMinorUnits(netMinorUnits.get(memberId) ?? 0, groupCurrency),
  }));

  const allLedgerIds = new Set<string>(memberIds);
  for (const [debtor, row] of owedBy) {
    allLedgerIds.add(debtor);
    for (const creditor of row.keys()) allLedgerIds.add(creditor);
  }
  const sortedIds = [...allLedgerIds].sort();

  const settlementSuggestions: SettlementSuggestion[] = [];
  for (let i = 0; i < sortedIds.length; i++) {
    for (let j = i + 1; j < sortedIds.length; j++) {
      const a = sortedIds[i];
      const b = sortedIds[j];
      const aOwesB = owedBy.get(a)?.get(b) ?? 0;
      const bOwesA = owedBy.get(b)?.get(a) ?? 0;
      const net = aOwesB - bOwesA;

      if (net > 0) {
        settlementSuggestions.push({
          from: a,
          to: b,
          amount: fromMinorUnits(net, groupCurrency),
        });
      } else if (net < 0) {
        settlementSuggestions.push({
          from: b,
          to: a,
          amount: fromMinorUnits(-net, groupCurrency),
        });
      }
    }
  }

  return { memberBalances, settlementSuggestions };
}
