"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import {
  MemberContributionChart,
  type MemberContributionRow,
} from "@/components/groups/expense/member-contribution-chart";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Category, Expense, Member } from "@/lib/data/types";
import {
  calculateCategoryBreakdown,
  calculateMemberContribution,
} from "@/lib/splits/balance";
import { PREDEFINED_CATEGORY_COLORS } from "@/lib/splits/constants";
import type { CurrencyCode } from "@/lib/splits/constants";

export function MemberContributionCard({
  expenses,
  activeMembers,
  categories,
  groupCurrency,
  youId,
}: {
  expenses: Expense[];
  activeMembers: Member[];
  categories: Category[];
  groupCurrency: CurrencyCode;
  youId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Same category list/order/colors the donut card already established —
  // sharing one vocabulary means a category renders in the identical color
  // in both charts.
  const breakdown = calculateCategoryBreakdown(expenses, groupCurrency);
  const colorByCategory = (category: string): string | undefined =>
    categories.find((c) => c.name === category)?.color ??
    PREDEFINED_CATEGORY_COLORS[
      category as keyof typeof PREDEFINED_CATEGORY_COLORS
    ];

  const contributionByMemberId = new Map(
    calculateMemberContribution(
      activeMembers.map((m) => m.id),
      expenses,
      groupCurrency,
    ).map((entry) => [entry.memberId, entry] as const),
  );

  const rows: MemberContributionRow[] = activeMembers.map((member) => {
    const entry = contributionByMemberId.get(member.id);
    const row: MemberContributionRow = {
      memberId: member.id,
      memberName: member.name + (member.id === youId ? " (You)" : ""),
    };
    for (const { category } of breakdown) {
      row[category] = entry?.byCategory[category] ?? 0;
    }
    return row;
  });

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
          Member contribution
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
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-xs text-text-tertiary md:text-sm">
              Not enough expenses to chart yet.
            </p>
          ) : (
            <MemberContributionChart
              data={rows}
              categories={breakdown.map((entry) => entry.category)}
              colorByCategory={colorByCategory}
              groupCurrency={groupCurrency}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
