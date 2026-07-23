"use client";

import { useMemo, useState } from "react";

import { ExpenseListItem } from "@/components/groups/expense-list-item";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Expense, Member } from "@/lib/data/types";

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
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Recent expenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No expenses yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {visible.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                payer={membersById.get(expense.paidBy)}
              />
            ))}
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
