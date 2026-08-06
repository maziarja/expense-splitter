"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { FALLBACK_COLOR } from "@/components/groups/expense/category-breakdown-donut";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

export type MemberContributionRow = {
  memberId: string;
  memberName: string;
} & Record<string, number | string>;

// Custom content (rather than Recharts' default tooltip), same surface/
// border/mono-tabular convention as the donut and spending-over-time
// tooltips. Recharts groups every active Bar series at the hovered member
// into one payload array; zero-value categories (ones that member didn't
// pay for) are filtered out rather than listed as "$0.00".
function ContributionTooltip({
  active,
  payload,
  label,
  groupCurrency,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  groupCurrency: CurrencyCode;
}) {
  if (!active || !payload?.length) return null;
  const nonZero = payload.filter((p) => p.value > 0);
  if (nonZero.length === 0) return null;
  const total = nonZero.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-xs text-text-tertiary">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {nonZero.map((p) => (
          <li
            key={p.dataKey}
            className="flex items-center gap-2 text-xs text-text-primary"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="flex-1">{p.dataKey}</span>
            <span className="font-mono tabular-nums">
              {formatCurrency(p.value, groupCurrency)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 border-t border-border-subtle pt-1 font-mono text-sm font-medium text-text-primary tabular-nums">
        {formatCurrency(total, groupCurrency)}
      </p>
    </div>
  );
}

export function MemberContributionChart({
  data,
  categories,
  colorByCategory,
  groupCurrency,
}: {
  data: MemberContributionRow[];
  categories: string[];
  colorByCategory: (category: string) => string | undefined;
  groupCurrency: CurrencyCode;
}) {
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          accessibilityLayer
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          maxBarSize={48}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          <XAxis
            dataKey="memberName"
            stroke="var(--color-text-tertiary)"
            fontSize={11}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v, groupCurrency)}
            tickCount={4}
            stroke="var(--color-text-tertiary)"
            fontSize={11}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={
              <ContributionTooltip
                groupCurrency={groupCurrency}
                active={false}
              />
            }
            cursor={{ fill: "var(--color-bg-tertiary)" }}
          />
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="contribution"
              fill={colorByCategory(category) ?? FALLBACK_COLOR}
              stroke="var(--color-surface)"
              strokeWidth={2}
              radius={
                index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
