"use client";

import { FilterIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  // Local optimistic overlay for expense creation (see Phase 11's "feel
  // <1s end-to-end" step) — not persisted state, just what's shown between
  // submit and the real write settling. A settled entry lingers (still
  // shown as pending) until visibleExpenses next changes, so it's never
  // pulled before the real row can replace it, and never before we know
  // the write actually finished (an unrelated visibleExpenses change —
  // e.g. someone else's write, a filter change — must not drop an
  // in-flight entry).
  const [optimisticExpenses, setOptimisticExpenses] = useState<
    { expense: Expense; settled: boolean }[]
  >([]);

  useEffect(() => {
    setOptimisticExpenses((prev) => prev.filter((o) => !o.settled));
  }, [visibleExpenses]);

  function handleOptimisticCreate(expense: Expense) {
    setOptimisticExpenses((prev) => [...prev, { expense, settled: false }]);
    // Safety net: guest mode's write can settle (and its reactive store
    // already reflect the real expense) before this component next
    // re-renders for any other reason — leaving nothing to re-trigger the
    // visibleExpenses effect above, and the entry stuck showing "Adding…"
    // forever. This guarantees it's cleared within a few seconds
    // regardless, well past authenticated mode's typical refresh time so
    // it doesn't preempt that path's normal (flash-free) reconciliation.
    setTimeout(() => {
      setOptimisticExpenses((prev) =>
        prev.filter((o) => o.expense.id !== expense.id),
      );
    }, 5000);
  }
  function handleOptimisticSettled(tempId: string) {
    setOptimisticExpenses((prev) =>
      prev.map((o) => (o.expense.id === tempId ? { ...o, settled: true } : o)),
    );
  }
  function handleOptimisticFailed(tempId: string) {
    setOptimisticExpenses((prev) =>
      prev.filter((o) => o.expense.id !== tempId),
    );
  }

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
          onOptimisticCreate={handleOptimisticCreate}
          onOptimisticSettled={handleOptimisticSettled}
          onOptimisticFailed={handleOptimisticFailed}
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
        {totalCount === 0 &&
        optimisticExpenses.length === 0 &&
        hasActiveFilters(filters) ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No expenses match your filters.
          </p>
        ) : totalCount === 0 && optimisticExpenses.length === 0 ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No expenses yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {optimisticExpenses.map(({ expense }) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                payer={membersById.get(expense.paidBy)}
                membersById={membersById}
                groupId={groupId}
                activeMembers={activeMembers}
                groupCurrency={groupCurrency}
                categories={categories}
                pending
              />
            ))}
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
