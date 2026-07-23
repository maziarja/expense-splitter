"use client";

import { format, formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/groups/category-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Expense, Member } from "@/lib/data/types";
import { formatCurrency } from "@/lib/splits/currency";

const VISIBLE_COUNT = 5;

export function RecentExpensesCard({
  expenses,
  membersById,
}: {
  expenses: Expense[];
  membersById: Map<string, Member>;
}) {
  const sorted = useMemo(
    () =>
      [...expenses].sort(
        (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf(),
      ),
    [expenses],
  );
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_COUNT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-text-primary md:text-xl">
          Recent expenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-text-tertiary md:text-base">
            No expenses yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {visible.map((expense) => {
              const payer = membersById.get(expense.paidBy);
              const expenseDate = new Date(expense.date);
              return (
                <li key={expense.id} className="flex items-center gap-4 py-3">
                  <span title={expense.category} className="shrink-0">
                    <CategoryIcon
                      category={expense.category}
                      className="md:size-5"
                    />
                    <span className="sr-only">{expense.category}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary md:text-base">
                      {expense.description}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary md:text-sm">
                      <Avatar size="sm" className="size-4 md:size-5">
                        <AvatarFallback
                          className="text-[8px] text-white md:text-[9px]"
                          style={{ backgroundColor: payer?.avatarColor }}
                        >
                          {payer?.name.charAt(0).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>Paid by {payer?.name ?? "Unknown member"}</span>
                      <span aria-hidden="true">·</span>
                      <time
                        dateTime={expense.date}
                        title={format(expenseDate, "PPP")}
                      >
                        {formatDistanceToNow(expenseDate, { addSuffix: true })}
                      </time>
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-medium text-text-primary tabular-nums md:text-base">
                    {formatCurrency(expense.amount, expense.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {sorted.length > VISIBLE_COUNT && (
        <CardFooter className="justify-center border-t-0 bg-transparent">
          <Button variant="link" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : `View all ${sorted.length} expenses`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
