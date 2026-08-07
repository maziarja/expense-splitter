"use client";

import { format } from "date-fns";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Expense } from "@/lib/data/types";
import {
  calculateSpendingOverTime,
  pickSpendingGranularity,
  type SpendingGranularity,
} from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

const GRANULARITIES: { value: SpendingGranularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function formatAxisTick(
  bucketStart: string,
  granularity: SpendingGranularity,
): string {
  const date = new Date(bucketStart);
  return granularity === "month"
    ? format(date, "MMM yyyy")
    : format(date, "MMM d");
}

function formatTooltipLabel(
  bucketStart: string,
  granularity: SpendingGranularity,
): string {
  const date = new Date(bucketStart);
  if (granularity === "month") return format(date, "MMMM yyyy");
  if (granularity === "week") return `Week of ${format(date, "MMM d, yyyy")}`;
  return format(date, "MMM d, yyyy");
}

// Custom content (rather than Recharts' default tooltip) so the amount
// matches the brand kit's mono-tabular monetary-figure convention and the
// card sits on this app's own surface/border tokens instead of Recharts'
// defaults. Recharts clones this element and injects active/payload/label
// itself; groupCurrency/granularity are passed through untouched.
function SpendingTooltip({
  active,
  payload,
  groupCurrency,
  granularity,
}: {
  active?: boolean;
  payload?: { value: number; payload: { bucketStart: string } }[];
  groupCurrency: CurrencyCode;
  granularity: SpendingGranularity;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-xs text-text-tertiary">
        {formatTooltipLabel(entry.payload.bucketStart, granularity)}
      </p>
      <p className="font-mono text-sm font-medium text-text-primary tabular-nums">
        {formatCurrency(entry.value, groupCurrency)}
      </p>
    </div>
  );
}

export function SpendingOverTimeCard({
  expenses,
  groupCurrency,
}: {
  expenses: Expense[];
  groupCurrency: CurrencyCode;
}) {
  // Auto-picked from the data until the user first touches the toggle, then
  // stays put — same "computed default, still overridable" shape as this
  // app's other smart defaults (e.g. avatar color, currency pre-fill).
  const [isOpen, setIsOpen] = useState(false);
  const [granularityOverride, setGranularityOverride] =
    useState<SpendingGranularity | null>(null);
  const granularity = granularityOverride ?? pickSpendingGranularity(expenses);

  const data = useMemo(
    () => calculateSpendingOverTime(expenses, groupCurrency, granularity),
    [expenses, groupCurrency, granularity],
  );

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
          Spending over time
        </CardTitle>
        <CardAction className="flex items-center gap-2 self-center">
          {isOpen && (
            <div onClick={(e) => e.stopPropagation()}>
              <Tabs
                value={granularity}
                onValueChange={(v) =>
                  setGranularityOverride(v as SpendingGranularity)
                }
              >
                <TabsList>
                  {GRANULARITIES.map((g) => (
                    <TabsTrigger key={g.value} value={g.value}>
                      {g.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
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
        <CardContent>
          {data.length === 0 ? (
            <p className="text-xs text-text-tertiary md:text-sm">
              Not enough expenses to chart yet.
            </p>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  accessibilityLayer
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="spendingOverTimeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-accent)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="bucketStart"
                    tickFormatter={(v: string) =>
                      formatAxisTick(v, granularity)
                    }
                    stroke="var(--color-text-tertiary)"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      formatCurrency(v, groupCurrency)
                    }
                    stroke="var(--color-text-tertiary)"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    content={
                      <SpendingTooltip
                        groupCurrency={groupCurrency}
                        granularity={granularity}
                        active={false}
                      />
                    }
                    cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#spendingOverTimeGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
