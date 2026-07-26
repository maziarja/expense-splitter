/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { guestDataAccess } from "@/lib/data/guest-store";
import type { Member } from "@/lib/data/types";

import { useAddExpenseForm } from "./use-add-expense-form";

vi.mock("@/lib/data/guest-store", () => ({
  guestDataAccess: {
    createExpense: vi.fn(),
  },
}));

const createExpense = vi.mocked(guestDataAccess.createExpense);

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

function setup(overrides?: {
  defaultPayerId?: string;
  groupCurrency?: "USD" | "EUR";
  onSuccess?: () => void;
}) {
  const onSuccess = overrides?.onSuccess ?? vi.fn();
  const hook = renderHook(() =>
    useAddExpenseForm({
      groupId: "group-1",
      activeMembers,
      groupCurrency: overrides?.groupCurrency ?? "USD",
      defaultPayerId: overrides?.defaultPayerId ?? alex.id,
      onSuccess,
    }),
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
    fillValidEqualSplit(result);
    act(() => {
      result.current.onCurrencyChange("EUR");
      result.current.onExchangeRateInputChange("1.2");
    });

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
