import { format } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Expense, Member } from "@/lib/data/types";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

export function ExpenseDetailPanel({
  expense,
  membersById,
  groupCurrency,
}: {
  expense: Expense;
  membersById: Map<string, Member>;
  groupCurrency: CurrencyCode;
}) {
  const expenseDate = new Date(expense.date);

  return (
    <div className="mt-3 ml-10 flex flex-col gap-3 border-t border-border-subtle pt-3 text-xs text-text-secondary md:text-sm">
      <p className="text-text-tertiary">
        {format(expenseDate, "PPP")} · {expense.category}
      </p>
      <div>
        <p className="font-medium text-text-primary">Split</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {expense.splits.map((split) => {
            const member = membersById.get(split.memberId);
            return (
              <li
                key={split.memberId}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5">
                  <Avatar size="sm">
                    <AvatarFallback
                      className="text-white"
                      style={{ backgroundColor: member?.avatarColor }}
                    >
                      {member?.name.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {member?.name ?? "Unknown member"}
                  {expense.splitType === "percentage" &&
                    split.percentage !== undefined && (
                      <span className="text-text-tertiary">
                        ({split.percentage}%)
                      </span>
                    )}
                  {expense.splitType === "shares" &&
                    split.shares !== undefined && (
                      <span className="text-text-tertiary">
                        ({split.shares}{" "}
                        {split.shares === 1 ? "share" : "shares"})
                      </span>
                    )}
                </span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(split.amount, expense.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {expense.currency !== groupCurrency && (
        <p>
          Converted at rate {expense.exchangeRate}
          {expense.rateIsUserSet && (
            <span className="text-text-tertiary"> (manually set)</span>
          )}
          :{" "}
          <span className="font-mono tabular-nums">
            {formatCurrency(
              expense.amount * expense.exchangeRate,
              groupCurrency,
            )}
          </span>
        </p>
      )}
      {expense.notes && <p>{expense.notes}</p>}
    </div>
  );
}
