"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import type { CategoryBreakdownEntry } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

// Falls back to a neutral gray for "Other" and any category that somehow
// has neither a fixed predefined color nor a matching custom Category row
// (e.g. one that's since been deleted) — exported so category-breakdown-card
// .tsx's list bars use the exact same fallback and never drift out of sync.
export const FALLBACK_COLOR = "var(--color-text-tertiary)";

const DONUT_SIZE = 176;
const DONUT_INNER_RADIUS = 56;
const DONUT_OUTER_RADIUS = 80;

// Custom content (rather than Recharts' default tooltip) to match this
// app's card surface/border tokens and the brand kit's mono-tabular
// monetary-figure convention, same approach as SpendingOverTimeCard's
// tooltip. Recharts clones this element and injects active/payload itself.
function CategoryTooltip({
  active,
  payload,
  groupCurrency,
}: {
  active?: boolean;
  payload?: { payload: CategoryBreakdownEntry }[];
  groupCurrency: CurrencyCode;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-xs text-text-tertiary">{entry.category}</p>
      <p className="font-mono text-sm font-medium text-text-primary tabular-nums">
        {formatCurrency(entry.total, groupCurrency)}
        <span className="ml-1 text-text-tertiary">
          ({entry.percentage.toFixed(0)}%)
        </span>
      </p>
    </div>
  );
}

// Assumes breakdown.length > 0 — the parent card renders its own empty
// state ("No expenses to break down.") and doesn't mount this otherwise.
export function CategoryBreakdownDonut({
  breakdown,
  groupCurrency,
  colorByCategory,
}: {
  breakdown: CategoryBreakdownEntry[];
  groupCurrency: CurrencyCode;
  colorByCategory: (category: string) => string | undefined;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = breakdown.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <div
      className="relative mx-auto shrink-0 md:mx-0"
      style={{ width: DONUT_SIZE, height: DONUT_SIZE }}
    >
      <PieChart width={DONUT_SIZE} height={DONUT_SIZE}>
        <Pie
          data={breakdown}
          dataKey="total"
          nameKey="category"
          innerRadius={DONUT_INNER_RADIUS}
          outerRadius={DONUT_OUTER_RADIUS}
          paddingAngle={breakdown.length > 1 ? 2 : 0}
          cornerRadius={4}
          stroke="none"
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {breakdown.map((entry, index) => (
            <Cell
              key={entry.category}
              fill={colorByCategory(entry.category) ?? FALLBACK_COLOR}
              opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
            />
          ))}
        </Pie>
        <Tooltip
          content={
            <CategoryTooltip groupCurrency={groupCurrency} active={false} />
          }
        />
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-text-tertiary md:text-xs">
          Total spent
        </span>
        <span className="font-mono text-sm font-semibold text-text-primary tabular-nums md:text-base">
          {formatCurrency(total, groupCurrency)}
        </span>
      </div>
    </div>
  );
}
