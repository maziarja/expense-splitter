import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import { expenseSchema } from "./schema";

const baseExpense = {
  id: "x",
  description: "d",
  amount: 100,
  currency: "USD",
  exchangeRate: 1,
  paidBy: "m1",
  date: "2024-01-01T00:00:00Z",
  category: "Other",
};

describe("expenseSchema", () => {
  it("validates every real expense in the seed data", () => {
    for (const group of sampleData.groups) {
      for (const expense of group.expenses) {
        const result = expenseSchema.safeParse(expense);
        expect(result.success, `${group.name} / ${expense.id}`).toBe(true);
      }
    }
  });

  it("rejects a negative amount", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      amount: -5,
      splitType: "equal",
      splits: [{ memberId: "m1", amount: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a shares split missing the shares field", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      splitType: "shares",
      splits: [{ memberId: "m1", amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-shares split that has a shares field", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      splitType: "equal",
      splits: [{ memberId: "m1", amount: 100, shares: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a percentage split missing the percentage field", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      splitType: "percentage",
      splits: [{ memberId: "m1", amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate members within one expense's splits", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      splitType: "equal",
      splits: [
        { memberId: "m1", amount: 50 },
        { memberId: "m1", amount: 50 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported currency", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      currency: "XYZ",
      splitType: "equal",
      splits: [{ memberId: "m1", amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-ISO date", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      date: "01/01/2024",
      splitType: "equal",
      splits: [{ memberId: "m1", amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an exact split that doesn't sum to the total", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      splitType: "exact",
      splits: [
        { memberId: "m1", amount: 50 },
        { memberId: "m2", amount: 49.99 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a percentage split that doesn't sum to 100", () => {
    const result = expenseSchema.safeParse({
      ...baseExpense,
      splitType: "percentage",
      splits: [
        { memberId: "m1", amount: 50, percentage: 50 },
        { memberId: "m2", amount: 40, percentage: 40 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
