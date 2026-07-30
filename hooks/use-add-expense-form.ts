import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { createExpenseInputSchema } from "@/lib/data/data-access";
import { useDataAccessContext } from "@/lib/data/data-access-context";
import type { Expense, Member } from "@/lib/data/types";
import { dateInputToIso, todayDateValue } from "@/lib/forms/date-input";
import {
  PREDEFINED_CATEGORIES,
  type CurrencyCode,
  type PredefinedCategory,
} from "@/lib/splits/constants";
import {
  formatCurrency,
  fromMinorUnits,
  sanitizeDecimalInput,
} from "@/lib/splits/currency";
import { calculateEqualSplit } from "@/lib/splits/equal";
import { validateExactSplit } from "@/lib/splits/exact";
import {
  calculatePercentageSplit,
  validatePercentageSplit,
} from "@/lib/splits/percentage";
import type { Split, SplitType } from "@/lib/splits/schema";
import { calculateSharesSplit } from "@/lib/splits/shares";

function dateValueFromIso(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

function categoryFromExpense(expense: Expense): PredefinedCategory {
  return (PREDEFINED_CATEGORIES as readonly string[]).includes(expense.category)
    ? (expense.category as PredefinedCategory)
    : "Other";
}

function splitValuesFromExpense(expense: Expense): {
  exactAmounts: Record<string, string>;
  percentages: Record<string, string>;
  shareCounts: Record<string, string>;
} {
  const exactAmounts: Record<string, string> = {};
  const percentages: Record<string, string> = {};
  const shareCounts: Record<string, string> = {};
  for (const split of expense.splits) {
    if (expense.splitType === "exact") {
      exactAmounts[split.memberId] = String(split.amount);
    } else if (expense.splitType === "percentage" && split.percentage) {
      percentages[split.memberId] = String(split.percentage);
    } else if (expense.splitType === "shares" && split.shares) {
      shareCounts[split.memberId] = String(split.shares);
    }
  }
  return { exactAmounts, percentages, shareCounts };
}

type SplitComputation = { splits: Split[]; error: string | null };

export function useAddExpenseForm({
  groupId,
  activeMembers,
  groupCurrency,
  defaultPayerId,
  expense,
  onSuccess,
}: {
  groupId: string;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
  defaultPayerId?: string;
  expense?: Expense;
  onSuccess: () => void;
}) {
  const dataAccess = useDataAccessContext();
  const [amountInput, setAmountInput] = useState(() =>
    expense ? String(expense.amount) : "",
  );
  const [description, setDescription] = useState(
    () => expense?.description ?? "",
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => expense?.currency ?? groupCurrency,
  );
  const [exchangeRateInput, setExchangeRateInput] = useState(() =>
    expense ? String(expense.exchangeRate) : "1",
  );
  const [paidBy, setPaidBy] = useState(() =>
    expense
      ? expense.paidBy
      : (activeMembers.find((m) => m.id === defaultPayerId)?.id ?? ""),
  );
  const [category, setCategory] = useState<PredefinedCategory>(() =>
    expense ? categoryFromExpense(expense) : "Other",
  );
  const [date, setDate] = useState(() =>
    expense ? dateValueFromIso(expense.date) : todayDateValue(),
  );
  const [splitType, setSplitType] = useState<SplitType>(
    () => expense?.splitType ?? "equal",
  );
  const [participantIds, setParticipantIds] = useState<string[]>(() =>
    expense
      ? expense.splits.map((s) => s.memberId)
      : activeMembers.map((m) => m.id),
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    () => (expense ? splitValuesFromExpense(expense).exactAmounts : {}),
  );
  const [percentages, setPercentages] = useState<Record<string, string>>(() =>
    expense ? splitValuesFromExpense(expense).percentages : {},
  );
  const [shareCounts, setShareCounts] = useState<Record<string, string>>(() =>
    expense ? splitValuesFromExpense(expense).shareCounts : {},
  );
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const amount = parseFloat(amountInput);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const exchangeRate = parseFloat(exchangeRateInput);

  function toggleParticipant(memberId: string) {
    setParticipantIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  function selectPayer(memberId: string) {
    setPaidBy(memberId);

    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev : [...prev, memberId],
    );
  }

  const computation: SplitComputation | null = useMemo(() => {
    if (!hasValidAmount || participantIds.length === 0) return null;

    if (splitType === "equal") {
      return {
        splits: calculateEqualSplit({ amount, currency, participantIds }),
        error: null,
      };
    }

    if (splitType === "exact") {
      const splits: Split[] = participantIds.map((id) => ({
        memberId: id,
        amount: parseFloat(exactAmounts[id] ?? "") || 0,
      }));
      const { valid, differenceMinorUnits } = validateExactSplit(
        amount,
        currency,
        splits.map((s) => s.amount),
      );
      if (valid) return { splits, error: null };
      const diff = fromMinorUnits(Math.abs(differenceMinorUnits), currency);
      const word = differenceMinorUnits > 0 ? "over" : "under";
      return {
        splits,
        error: `Splits are ${formatCurrency(diff, currency)} ${word} the total`,
      };
    }

    if (splitType === "percentage") {
      const values = participantIds.map(
        (id) => parseFloat(percentages[id] ?? "") || 0,
      );
      const { valid, sum } = validatePercentageSplit(values);
      if (!valid) {
        return {
          splits: [],
          error: `Percentages sum to ${sum}%, not 100%`,
        };
      }
      const splits = calculatePercentageSplit({
        amount,
        currency,
        splits: participantIds.map((id, i) => ({
          memberId: id,
          percentage: values[i],
        })),
      });
      return { splits, error: null };
    }

    // shares
    const shareValues = participantIds.map(
      (id) => parseFloat(shareCounts[id] ?? "") || 0,
    );
    const totalShares = shareValues.reduce((sum, v) => sum + v, 0);
    if (totalShares <= 0) {
      return { splits: [], error: "Enter at least one share" };
    }
    const splits = calculateSharesSplit({
      amount,
      currency,
      splits: participantIds.map((id, i) => ({
        memberId: id,
        shares: shareValues[i],
      })),
    });
    return { splits, error: null };
  }, [
    hasValidAmount,
    amount,
    currency,
    participantIds,
    splitType,
    exactAmounts,
    percentages,
    shareCounts,
  ]);

  const splitAmountByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const split of computation?.splits ?? []) {
      map.set(split.memberId, split.amount);
    }
    return map;
  }, [computation]);

  const paidByError = !paidBy
    ? touched
      ? "Choose who paid."
      : null
    : !participantIds.includes(paidBy)
      ? "The payer must be included in the split."
      : null;

  const splitSectionError =
    participantIds.length === 0
      ? "Select at least one person to split with."
      : (computation?.error ?? null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);

    if (!description.trim()) return;
    if (!hasValidAmount) return;
    if (!paidBy) return;
    if (participantIds.length === 0) return;
    if (!participantIds.includes(paidBy)) return;
    if (!computation || computation.error) return;

    const input = {
      description: description.trim(),
      amount,
      currency,
      exchangeRate:
        currency === groupCurrency
          ? 1
          : Number.isFinite(exchangeRate) && exchangeRate > 0
            ? exchangeRate
            : 1,
      rateIsUserSet: currency === groupCurrency ? undefined : true,
      paidBy,
      splitType,
      splits: computation.splits,
      date: dateInputToIso(date),
      category,
    };

    const parsed = createExpenseInputSchema.safeParse(input);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Invalid expense.");
      return;
    }

    setPending(true);
    try {
      if (expense) {
        await dataAccess.updateExpense(groupId, expense.id, parsed.data);
      } else {
        await dataAccess.createExpense(groupId, parsed.data);
      }
      onSuccess();
    } catch {
      setSubmitError("Couldn't save this expense. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return {
    amountInput,
    onAmountInputChange: (value: string) =>
      setAmountInput(sanitizeDecimalInput(value)),
    description,
    setDescription,
    currency,
    onCurrencyChange: (next: CurrencyCode) => {
      setCurrency(next);
      if (next === groupCurrency) setExchangeRateInput("1");
    },
    exchangeRateInput,
    onExchangeRateInputChange: (value: string) =>
      setExchangeRateInput(sanitizeDecimalInput(value)),
    paidBy,
    selectPayer,
    category,
    setCategory,
    date,
    setDate,
    splitType,
    setSplitType,
    participantIds,
    toggleParticipant,
    exactAmounts,
    onExactAmountChange: (memberId: string, value: string) =>
      setExactAmounts((prev) => ({
        ...prev,
        [memberId]: sanitizeDecimalInput(value),
      })),
    percentages,
    onPercentageChange: (memberId: string, value: string) =>
      setPercentages((prev) => ({
        ...prev,
        [memberId]: sanitizeDecimalInput(value),
      })),
    shareCounts,
    onShareCountChange: (memberId: string, value: string) =>
      setShareCounts((prev) => ({
        ...prev,
        [memberId]: sanitizeDecimalInput(value),
      })),
    touched,
    hasValidAmount,
    paidByError,
    splitSectionError,
    splitAmountByMember,
    submitError,
    pending,
    handleSubmit,
  };
}
