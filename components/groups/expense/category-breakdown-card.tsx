"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import {
  CategoryBreakdownDonut,
  FALLBACK_COLOR,
} from "@/components/groups/expense/category-breakdown-donut";
import { CategoryIcon } from "@/components/groups/expense/category-icon";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Category, Expense } from "@/lib/data/types";
import { calculateCategoryBreakdown } from "@/lib/splits/balance";
import { PREDEFINED_CATEGORY_COLORS } from "@/lib/splits/constants";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

export function CategoryBreakdownCard({
  expenses,
  categories,
  groupCurrency,
}: {
  expenses: Expense[];
  categories: Category[];
  groupCurrency: CurrencyCode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const breakdown = calculateCategoryBreakdown(expenses, groupCurrency);
  const colorByCategory = (category: string): string | undefined =>
    categories.find((c) => c.name === category)?.color ??
    PREDEFINED_CATEGORY_COLORS[
      category as keyof typeof PREDEFINED_CATEGORY_COLORS
    ];

  return (
    <Card>
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((v) => !v);
          }
        }}
        className="cursor-pointer rounded-t-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Spending by category
        </CardTitle>
        <CardAction className="self-center">
          {isOpen ? (
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-text-tertiary"
            />
          ) : (
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-text-tertiary"
            />
          )}
          <span className="sr-only">
            {isOpen ? "Hide chart" : "Show chart"}
          </span>
        </CardAction>
      </CardHeader>
      {isOpen && (
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
          {breakdown.length === 0 ? (
            <p className="text-xs text-text-tertiary md:text-sm">
              No expenses to break down.
            </p>
          ) : (
            <>
              <CategoryBreakdownDonut
                breakdown={breakdown}
                groupCurrency={groupCurrency}
                colorByCategory={colorByCategory}
              />
              <ul className="flex flex-1 flex-col gap-3">
                {breakdown.map((entry) => {
                  const color = colorByCategory(entry.category);
                  return (
                    <li key={entry.category} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-xs text-text-primary md:text-sm">
                          <CategoryIcon
                            category={entry.category}
                            color={color}
                          />
                          <span className="truncate">{entry.category}</span>
                        </span>
                        <span className="flex shrink-0 items-baseline gap-2 font-mono tabular-nums">
                          <span className="text-xs text-text-tertiary md:text-sm">
                            {entry.percentage.toFixed(0)}%
                          </span>
                          <span className="text-xs font-medium text-text-primary md:text-sm">
                            {formatCurrency(entry.total, groupCurrency)}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${entry.percentage}%`,
                            backgroundColor: color ?? FALLBACK_COLOR,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
