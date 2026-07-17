import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./constants";
import { validateExactSplit } from "./exact";
import { validatePercentageSplit } from "./percentage";

export const splitTypeSchema = z.enum([
  "equal",
  "exact",
  "percentage",
  "shares",
]);
export type SplitType = z.infer<typeof splitTypeSchema>;

export const currencyCodeSchema = z.enum(SUPPORTED_CURRENCIES);

export const splitSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().min(0),
  shares: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
});
export type Split = z.infer<typeof splitSchema>;

export const expenseSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    amount: z.number().positive(),
    currency: currencyCodeSchema,
    exchangeRate: z.number().positive(),
    paidBy: z.string().min(1),
    splitType: splitTypeSchema,
    splits: z.array(splitSchema).min(1),
    date: z.iso.datetime(),
    category: z.string().min(1),
    notes: z.string().optional(),
    recurring: z.enum(["weekly", "biweekly", "monthly"]).optional(),
  })
  .superRefine((expense, ctx) => {
    const { splitType, splits } = expense;

    const memberIds = new Set<string>();
    for (const split of splits) {
      if (memberIds.has(split.memberId)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate member "${split.memberId}" in splits`,
          path: ["splits"],
        });
      }
      memberIds.add(split.memberId);
    }

    for (const [index, split] of splits.entries()) {
      if (splitType === "shares" && split.shares === undefined) {
        ctx.addIssue({
          code: "custom",
          message: 'shares is required when splitType is "shares"',
          path: ["splits", index, "shares"],
        });
      }
      if (splitType !== "shares" && split.shares !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: 'shares is only valid when splitType is "shares"',
          path: ["splits", index, "shares"],
        });
      }

      if (splitType === "percentage" && split.percentage === undefined) {
        ctx.addIssue({
          code: "custom",
          message: 'percentage is required when splitType is "percentage"',
          path: ["splits", index, "percentage"],
        });
      }
      if (splitType !== "percentage" && split.percentage !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: 'percentage is only valid when splitType is "percentage"',
          path: ["splits", index, "percentage"],
        });
      }
    }

    if (splitType === "exact") {
      const { valid } = validateExactSplit(
        expense.amount,
        expense.currency,
        splits.map((split) => split.amount),
      );
      if (!valid) {
        ctx.addIssue({
          code: "custom",
          message: "Exact splits must sum to the expense amount",
          path: ["splits"],
        });
      }
    }

    if (splitType === "percentage") {
      const { valid } = validatePercentageSplit(
        splits.map((split) => split.percentage ?? 0),
      );
      if (!valid) {
        ctx.addIssue({
          code: "custom",
          message: "Percentage splits must sum to 100",
          path: ["splits"],
        });
      }
    }
  });
export type Expense = z.infer<typeof expenseSchema>;
