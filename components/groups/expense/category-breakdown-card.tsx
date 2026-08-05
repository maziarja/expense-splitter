import { CategoryIcon } from "@/components/groups/expense/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category, Expense } from "@/lib/data/types";
import { calculateCategoryBreakdown } from "@/lib/splits/balance";
import { PREDEFINED_CATEGORY_COLORS } from "@/lib/splits/constants";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

// Falls back to a neutral gray for "Other" and any category that somehow
// has neither a fixed predefined color nor a matching custom Category row
// (e.g. one that's since been deleted) — the bar still renders, just without
// a distinguishing color, same graceful-degradation behavior CategoryIcon
// already has for its icon.
const FALLBACK_BAR_COLOR = "var(--color-text-tertiary)";

export function CategoryBreakdownCard({
  expenses,
  categories,
  groupCurrency,
}: {
  expenses: Expense[];
  categories: Category[];
  groupCurrency: CurrencyCode;
}) {
  const breakdown = calculateCategoryBreakdown(expenses, groupCurrency);
  const colorByCategory = (category: string): string | undefined =>
    categories.find((c) => c.name === category)?.color ??
    PREDEFINED_CATEGORY_COLORS[
      category as keyof typeof PREDEFINED_CATEGORY_COLORS
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Spending by category
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {breakdown.length === 0 ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No expenses to break down.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {breakdown.map((entry) => {
              const color = colorByCategory(entry.category);
              return (
                <li key={entry.category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs text-text-primary md:text-sm">
                      <CategoryIcon category={entry.category} color={color} />
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
                        backgroundColor: color ?? FALLBACK_BAR_COLOR,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
