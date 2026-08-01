/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { format, parseISO } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DataAccess } from "@/lib/data/data-access";
import { DataAccessProvider } from "@/lib/data/data-access-context";
import type { Expense, Member } from "@/lib/data/types";

import { useAddExpenseForm } from "./use-add-expense-form";

const getExchangeRateAction = vi.fn();
vi.mock("@/lib/actions/exchange-rate", () => ({
  getExchangeRateAction: (...args: unknown[]) => getExchangeRateAction(...args),
}));

const createExpense = vi.fn();
const updateExpense = vi.fn();
const mockDataAccess = {
  createExpense,
  updateExpense,
} as unknown as DataAccess;

type SubmitHandler = ReturnType<typeof useAddExpenseForm>["handleSubmit"];
function fakeSubmitEvent() {
  return {
    preventDefault: () => {},
  } as unknown as Parameters<SubmitHandler>[0];
}

function makeMember(id: string, name: string): Member {
  return {
    id,
    groupId: "group-1",
    userId: null,
    name,
    email: null,
    avatarColor: "#000000",
    deletedAt: null,
  };
}

const alex = makeMember("alex", "Alex Chen");
const jordan = makeMember("jordan", "Jordan Park");
const activeMembers = [alex, jordan];

function makeExpense(overrides?: Partial<Expense>): Expense {
  return {
    id: "expense-1",
    description: "Groceries",
    amount: 60,
    currency: "USD",
    exchangeRate: 1,
    paidBy: jordan.id,
    splitType: "shares",
    splits: [
      { memberId: alex.id, amount: 20, shares: 1 },
      { memberId: jordan.id, amount: 40, shares: 2 },
    ],
    date: "2026-01-15T12:00:00.000Z",
    category: "Groceries",
    ...overrides,
  };
}

function setup(overrides?: {
  defaultPayerId?: string;
  groupCurrency?: "USD" | "EUR";
  expense?: Expense;
  onSuccess?: () => void;
}) {
  const onSuccess = overrides?.onSuccess ?? vi.fn();
  const hook = renderHook(
    () =>
      useAddExpenseForm({
        groupId: "group-1",
        activeMembers,
        groupCurrency: overrides?.groupCurrency ?? "USD",
        defaultPayerId: overrides?.defaultPayerId ?? alex.id,
        expense: overrides?.expense,
        onSuccess,
      }),
    {
      wrapper: ({ children }) => (
        <DataAccessProvider dataAccess={mockDataAccess}>
          {children}
        </DataAccessProvider>
      ),
    },
  );
  return { ...hook, onSuccess };
}

// Fills in a valid equal-split expense (description, amount, payer already
// resolved from defaultPayerId, all members participating) so tests that
// only care about one specific field can submit successfully.
function fillValidEqualSplit(result: {
  current: ReturnType<typeof useAddExpenseForm>;
}) {
  act(() => {
    result.current.setDescription("Dinner");
    result.current.onAmountInputChange("100");
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  createExpense.mockResolvedValue({} as never);
  updateExpense.mockResolvedValue({} as never);
  getExchangeRateAction.mockResolvedValue({
    ok: true,
    data: { rate: 1.1, fetchedAt: new Date(), stale: false },
  });
});

describe("initial state", () => {
  it("resolves paidBy from defaultPayerId when it matches an active member", () => {
    const { result } = setup({ defaultPayerId: jordan.id });
    expect(result.current.paidBy).toBe(jordan.id);
  });

  it("leaves paidBy unset when defaultPayerId doesn't match an active member, without falling back to the first member", () => {
    const { result } = setup({ defaultPayerId: "someone-not-active" });
    expect(result.current.paidBy).toBe("");
  });

  it("defaults participantIds to every active member", () => {
    const { result } = setup();
    expect(result.current.participantIds).toEqual([alex.id, jordan.id]);
  });
});

describe("paidByError", () => {
  it("stays null before touched, even with no payer resolved", () => {
    const { result } = setup({ defaultPayerId: "unresolvable" });
    expect(result.current.paidByError).toBeNull();
  });

  it("shows 'Choose who paid.' once touched via a submit attempt", async () => {
    const { result } = setup({ defaultPayerId: "unresolvable" });
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });
    expect(result.current.paidByError).toBe("Choose who paid.");
  });

  it("shows live (untouched) once the chosen payer is excluded from participants", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleParticipant(alex.id);
    });
    expect(result.current.paidBy).toBe(alex.id);
    expect(result.current.participantIds).not.toContain(alex.id);
    expect(result.current.paidByError).toBe(
      "The payer must be included in the split.",
    );
  });
});

describe("selectPayer", () => {
  it("auto-includes the newly selected payer as a participant", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleParticipant(jordan.id); // exclude Jordan first
    });
    expect(result.current.participantIds).not.toContain(jordan.id);

    act(() => {
      result.current.selectPayer(jordan.id);
    });
    expect(result.current.paidBy).toBe(jordan.id);
    expect(result.current.participantIds).toContain(jordan.id);
  });
});

describe("splitSectionError", () => {
  it("shows 'Select at least one person to split with.' once every participant is deselected", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleParticipant(alex.id);
      result.current.toggleParticipant(jordan.id);
    });
    expect(result.current.splitSectionError).toBe(
      "Select at least one person to split with.",
    );
  });

  it("surfaces the equal-split computation as null error when everything is valid", () => {
    const { result } = setup();
    act(() => {
      result.current.onAmountInputChange("100");
    });
    expect(result.current.splitSectionError).toBeNull();
    expect(result.current.splitAmountByMember.get(alex.id)).toBe(50);
    expect(result.current.splitAmountByMember.get(jordan.id)).toBe(50);
  });

  it("reports a mismatch for an exact split that doesn't sum to the total", () => {
    const { result } = setup();
    act(() => {
      result.current.onAmountInputChange("100");
      result.current.setSplitType("exact");
      result.current.onExactAmountChange(alex.id, "40");
      result.current.onExactAmountChange(jordan.id, "40");
    });
    expect(result.current.splitSectionError).toBe(
      "Splits are $20.00 under the total",
    );
  });

  it("reports percentages that don't sum to 100", () => {
    const { result } = setup();
    act(() => {
      result.current.onAmountInputChange("100");
      result.current.setSplitType("percentage");
      result.current.onPercentageChange(alex.id, "50");
      result.current.onPercentageChange(jordan.id, "30");
    });
    expect(result.current.splitSectionError).toBe(
      "Percentages sum to 80%, not 100%",
    );
  });

  it("requires at least one share for a shares split", () => {
    const { result } = setup();
    act(() => {
      result.current.onAmountInputChange("100");
      result.current.setSplitType("shares");
    });
    expect(result.current.splitSectionError).toBe("Enter at least one share");
  });
});

describe("decimal sanitization", () => {
  it("strips non-numeric characters from the amount input", () => {
    const { result } = setup();
    act(() => {
      result.current.onAmountInputChange("12a3b.4c5");
    });
    expect(result.current.amountInput).toBe("123.45");
  });

  it("strips letters entirely from an exact-split input", () => {
    const { result } = setup();
    act(() => {
      result.current.onExactAmountChange(alex.id, "sdkjfds");
    });
    expect(result.current.exactAmounts[alex.id]).toBe("");
  });
});

describe("handleSubmit validation", () => {
  it.each([
    ["empty description", () => {}],
    [
      "invalid amount",
      (result: { current: ReturnType<typeof useAddExpenseForm> }) => {
        result.current.setDescription("Dinner");
      },
    ],
  ])(
    "blocks submission and doesn't call createExpense (%s)",
    async (_label, arrange) => {
      const { result } = setup();
      act(() => arrange(result));
      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });
      expect(createExpense).not.toHaveBeenCalled();
    },
  );

  it("blocks submission when no payer is resolved", async () => {
    const { result } = setup({ defaultPayerId: "unresolvable" });
    fillValidEqualSplit(result);
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });
    expect(createExpense).not.toHaveBeenCalled();
    expect(result.current.paidByError).toBe("Choose who paid.");
  });

  it("blocks submission when the payer isn't a participant", async () => {
    const { result } = setup();
    fillValidEqualSplit(result);
    act(() => {
      result.current.toggleParticipant(alex.id); // exclude the payer
    });
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });
    expect(createExpense).not.toHaveBeenCalled();
  });

  it("blocks submission when the split computation has an error", async () => {
    const { result } = setup();
    fillValidEqualSplit(result);
    act(() => {
      result.current.setSplitType("exact");
      result.current.onExactAmountChange(alex.id, "10");
      result.current.onExactAmountChange(jordan.id, "10");
    });
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });
    expect(createExpense).not.toHaveBeenCalled();
  });
});

describe("handleSubmit success", () => {
  it("saves the expense and calls onSuccess for a valid equal split", async () => {
    const { result, onSuccess } = setup();
    fillValidEqualSplit(result);

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(createExpense).toHaveBeenCalledTimes(1);
    const [groupId, input] = createExpense.mock.calls[0]!;
    expect(groupId).toBe("group-1");
    expect(input).toMatchObject({
      description: "Dinner",
      amount: 100,
      currency: "USD",
      exchangeRate: 1,
      paidBy: alex.id,
      splitType: "equal",
      category: "Other",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("passes a user-set exchange rate when the expense currency differs from the group currency", async () => {
    const { result } = setup({ groupCurrency: "USD" });
    await act(async () => {
      result.current.onCurrencyChange("EUR");
    });
    act(() => {
      result.current.onExchangeRateInputChange("1.2");
    });
    fillValidEqualSplit(result);

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });

    const [, input] = createExpense.mock.calls[0]!;
    expect(input).toMatchObject({
      currency: "EUR",
      exchangeRate: 1.2,
      rateIsUserSet: true,
    });
  });

  it("sets submitError and doesn't call onSuccess when saving fails", async () => {
    createExpense.mockRejectedValueOnce(new Error("boom"));
    const { result, onSuccess } = setup();
    fillValidEqualSplit(result);

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(result.current.submitError).toBe(
      "Couldn't save this expense. Please try again.",
    );
    expect(result.current.pending).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("live exchange rate fetch", () => {
  it("prefills the exchange rate from a live fetch after switching currency", async () => {
    const { result } = setup({ groupCurrency: "USD" });

    await act(async () => {
      result.current.onCurrencyChange("EUR");
    });

    expect(getExchangeRateAction).toHaveBeenCalledWith("EUR", "USD");
    expect(result.current.exchangeRateInput).toBe("1.1");
    expect(result.current.fetchingRate).toBe(false);
    expect(result.current.rateFetchError).toBeNull();
  });

  it("resets the rate to 1 and skips fetching when switching back to the group currency", async () => {
    const { result } = setup({ groupCurrency: "USD" });
    await act(async () => {
      result.current.onCurrencyChange("EUR");
    });
    getExchangeRateAction.mockClear();

    await act(async () => {
      result.current.onCurrencyChange("USD");
    });

    expect(result.current.exchangeRateInput).toBe("1");
    expect(getExchangeRateAction).not.toHaveBeenCalled();
  });

  it("doesn't let a slow live fetch overwrite a rate the user already typed", async () => {
    let resolveFetch!: (value: {
      ok: true;
      data: { rate: number; fetchedAt: Date; stale: boolean };
    }) => void;
    getExchangeRateAction.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { result } = setup({ groupCurrency: "USD" });

    act(() => {
      result.current.onCurrencyChange("EUR");
    });
    act(() => {
      result.current.onExchangeRateInputChange("1.5");
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        data: { rate: 1.1, fetchedAt: new Date(), stale: false },
      });
    });

    expect(result.current.exchangeRateInput).toBe("1.5");
  });

  it("surfaces an error and leaves the default rate when the live fetch fails", async () => {
    getExchangeRateAction.mockResolvedValueOnce({
      ok: false,
      message: "Couldn't fetch a live exchange rate. Enter it manually.",
    });
    const { result } = setup({ groupCurrency: "USD" });

    await act(async () => {
      result.current.onCurrencyChange("EUR");
    });

    expect(result.current.rateFetchError).toBe(
      "Couldn't fetch a live exchange rate. Enter it manually.",
    );
    expect(result.current.exchangeRateInput).toBe("1");
  });

  it("flags the rate as stale when the fetch falls back to a cached value", async () => {
    getExchangeRateAction.mockResolvedValueOnce({
      ok: true,
      data: { rate: 1.05, fetchedAt: new Date(), stale: true },
    });
    const { result } = setup({ groupCurrency: "USD" });

    await act(async () => {
      result.current.onCurrencyChange("EUR");
    });

    expect(result.current.exchangeRateInput).toBe("1.05");
    expect(result.current.rateStale).toBe(true);
  });
});

describe("currency change clears currency-denominated fields", () => {
  it("clears the amount, since it was denominated in the old currency", async () => {
    const { result } = setup({ groupCurrency: "USD" });
    act(() => {
      result.current.onAmountInputChange("275");
    });
    expect(result.current.amountInput).toBe("275");

    await act(async () => {
      result.current.onCurrencyChange("MXN");
    });

    expect(result.current.amountInput).toBe("");
  });

  it("clears exact-split amounts, since they were denominated in the old currency", async () => {
    const { result } = setup({ groupCurrency: "USD" });
    act(() => {
      result.current.setSplitType("exact");
      result.current.onExactAmountChange(alex.id, "40");
      result.current.onExactAmountChange(jordan.id, "60");
    });
    expect(result.current.exactAmounts).toEqual({
      [alex.id]: "40",
      [jordan.id]: "60",
    });

    await act(async () => {
      result.current.onCurrencyChange("MXN");
    });

    expect(result.current.exactAmounts).toEqual({});
  });

  it("leaves percentages and share counts untouched, since they're dimensionless", async () => {
    const { result } = setup({ groupCurrency: "USD" });
    act(() => {
      result.current.setSplitType("percentage");
      result.current.onPercentageChange(alex.id, "50");
      result.current.onPercentageChange(jordan.id, "50");
    });

    await act(async () => {
      result.current.onCurrencyChange("MXN");
    });

    expect(result.current.percentages).toEqual({
      [alex.id]: "50",
      [jordan.id]: "50",
    });

    act(() => {
      result.current.setSplitType("shares");
      result.current.onShareCountChange(alex.id, "1");
      result.current.onShareCountChange(jordan.id, "2");
    });

    await act(async () => {
      result.current.onCurrencyChange("GBP");
    });

    expect(result.current.shareCounts).toEqual({
      [alex.id]: "1",
      [jordan.id]: "2",
    });
  });

  it("also clears the amount when switching back to the group currency", async () => {
    const { result } = setup({ groupCurrency: "USD" });
    await act(async () => {
      result.current.onCurrencyChange("EUR");
    });
    act(() => {
      result.current.onAmountInputChange("50");
    });
    expect(result.current.amountInput).toBe("50");

    await act(async () => {
      result.current.onCurrencyChange("USD");
    });

    expect(result.current.amountInput).toBe("");
  });
});

describe("edit mode", () => {
  it("seeds every field from the given expense", () => {
    const expense = makeExpense();
    const { result } = setup({ expense });

    expect(result.current.amountInput).toBe("60");
    expect(result.current.description).toBe("Groceries");
    expect(result.current.currency).toBe("USD");
    expect(result.current.exchangeRateInput).toBe("1");
    expect(result.current.paidBy).toBe(jordan.id);
    expect(result.current.category).toBe("Groceries");
    // Computed the same way the hook derives it, rather than a hardcoded
    // string, so this doesn't depend on the test runner's local timezone.
    expect(result.current.date).toBe(
      format(parseISO(expense.date), "yyyy-MM-dd"),
    );
    expect(result.current.splitType).toBe("shares");
    expect(result.current.participantIds).toEqual([alex.id, jordan.id]);
    expect(result.current.shareCounts).toEqual({
      [alex.id]: "1",
      [jordan.id]: "2",
    });
    // Only the matching record is seeded — the others start empty, same as
    // a fresh form, until the user switches to that split type.
    expect(result.current.exactAmounts).toEqual({});
    expect(result.current.percentages).toEqual({});
  });

  it("falls back to Other when the stored category isn't one of the predefined options", () => {
    const expense = makeExpense({ category: "Some Legacy Category" });
    const { result } = setup({ expense });
    expect(result.current.category).toBe("Other");
  });

  it("seeds exactAmounts for an exact-split expense", () => {
    const expense = makeExpense({
      splitType: "exact",
      splits: [
        { memberId: alex.id, amount: 25 },
        { memberId: jordan.id, amount: 35 },
      ],
    });
    const { result } = setup({ expense });
    expect(result.current.exactAmounts).toEqual({
      [alex.id]: "25",
      [jordan.id]: "35",
    });
  });

  it("seeds percentages for a percentage-split expense", () => {
    const expense = makeExpense({
      splitType: "percentage",
      splits: [
        { memberId: alex.id, amount: 30, percentage: 50 },
        { memberId: jordan.id, amount: 30, percentage: 50 },
      ],
    });
    const { result } = setup({ expense });
    expect(result.current.percentages).toEqual({
      [alex.id]: "50",
      [jordan.id]: "50",
    });
  });

  it("calls updateExpense with the expense's id instead of createExpense", async () => {
    const expense = makeExpense();
    const { result, onSuccess } = setup({ expense });

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(createExpense).not.toHaveBeenCalled();
    expect(updateExpense).toHaveBeenCalledTimes(1);
    const [groupId, expenseId, input] = updateExpense.mock.calls[0]!;
    expect(groupId).toBe("group-1");
    expect(expenseId).toBe("expense-1");
    expect(input).toMatchObject({
      description: "Groceries",
      amount: 60,
      paidBy: jordan.id,
      splitType: "shares",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("still blocks submission (and never calls updateExpense) when a field becomes invalid", async () => {
    const expense = makeExpense();
    const { result } = setup({ expense });

    act(() => {
      result.current.setDescription("");
    });
    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(updateExpense).not.toHaveBeenCalled();
  });
});
