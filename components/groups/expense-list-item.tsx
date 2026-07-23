import { format, formatDistanceToNow } from "date-fns";

import { CategoryIcon } from "@/components/groups/category-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Expense, Member, SplitType } from "@/lib/data/types";
import { formatCurrency } from "@/lib/splits/currency";

const SPLIT_TYPE_LABELS: Partial<Record<SplitType, string>> = {
  exact: "Exact amounts",
  percentage: "By percentage",
  shares: "By shares",
};

export function ExpenseListItem({
  expense,
  payer,
}: {
  expense: Expense;
  payer: Member | undefined;
}) {
  const expenseDate = new Date(expense.date);
  const splitTypeLabel = SPLIT_TYPE_LABELS[expense.splitType];

  return (
    <li className="flex items-center gap-4 py-3">
      <span title={expense.category} className="shrink-0">
        <CategoryIcon category={expense.category} className="md:size-5" />
        <span className="sr-only">{expense.category}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-text-primary md:text-sm">
          {expense.description}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-tertiary md:text-xs">
          <Avatar size="sm">
            <AvatarFallback
              className="text-white"
              style={{ backgroundColor: payer?.avatarColor }}
            >
              {payer?.name.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span>Paid by {payer?.name ?? "Unknown member"}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={expense.date} title={format(expenseDate, "PPP")}>
            {formatDistanceToNow(expenseDate, { addSuffix: true })}
          </time>
          {splitTypeLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{splitTypeLabel}</span>
            </>
          )}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs font-semibold text-text-primary tabular-nums md:text-sm">
        {formatCurrency(expense.amount, expense.currency)}
      </span>
    </li>
  );
}
