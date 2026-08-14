"use client";

import { FilterIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { AddExpensePanel } from "@/components/groups/expense/add-expense-panel";
import { ExpenseFilters } from "@/components/groups/expense/expense-filters";
import { ExpenseListItem } from "@/components/groups/expense/expense-list-item";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  filtersToQueryString,
  hasActiveFilters,
  INITIAL_VISIBLE_EXPENSES,
  LOAD_MORE_INCREMENT,
  type ExpenseFilterState,
} from "@/lib/data/expense-filters";
import type { Category, Expense, Member } from "@/lib/data/types";
import type { CurrencyCode } from "@/lib/splits/constants";

export function RecentExpensesCard({
  groupId,
  visibleExpenses,
  totalCount,
  membersById,
  activeMembers,
  groupCurrency,
  categories,
  filters,
  defaultPayerId,
}: {
  groupId: string;
  visibleExpenses: Expense[];
  totalCount: number;
  membersById: Map<string, Member>;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
  categories: Category[];
  filters: ExpenseFilterState;
  defaultPayerId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigateToShow(show: number | null) {
    const qs = filtersToQueryString(filters, show);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [filtersOpen, setFiltersOpen] = useState(() =>
    hasActiveFilters(filters),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Recent expenses
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AddExpensePanel
          groupId={groupId}
          activeMembers={activeMembers}
          groupCurrency={groupCurrency}
          categories={categories}
          defaultPayerId={defaultPayerId}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FilterIcon aria-hidden="true" />
          Filters
          {hasActiveFilters(filters) && (
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent"
            />
          )}
        </Button>
        {filtersOpen && (
          <ExpenseFilters
            filters={filters}
            activeMembers={activeMembers}
            categories={categories}
            membersById={membersById}
          />
        )}
        {totalCount === 0 && hasActiveFilters(filters) ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No expenses match your filters.
          </p>
        ) : totalCount === 0 ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No expenses yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {visibleExpenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                payer={membersById.get(expense.paidBy)}
                membersById={membersById}
                groupId={groupId}
                activeMembers={activeMembers}
                groupCurrency={groupCurrency}
                categories={categories}
              />
            ))}
          </ul>
        )}
      </CardContent>
      {totalCount > visibleExpenses.length ? (
        <CardFooter className="justify-center border-t-0 bg-transparent">
          <Button
            variant="link"
            onClick={() =>
              navigateToShow(visibleExpenses.length + LOAD_MORE_INCREMENT)
            }
          >
            Load{" "}
            {Math.min(LOAD_MORE_INCREMENT, totalCount - visibleExpenses.length)}{" "}
            more
          </Button>
        </CardFooter>
      ) : visibleExpenses.length > INITIAL_VISIBLE_EXPENSES ? (
        <CardFooter className="justify-center border-t-0 bg-transparent">
          <Button variant="link" onClick={() => navigateToShow(null)}>
            Show less
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
