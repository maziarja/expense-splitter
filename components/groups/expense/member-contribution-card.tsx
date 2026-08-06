import {
  MemberContributionChart,
  type MemberContributionRow,
} from "@/components/groups/expense/member-contribution-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Member contribution
        </CardTitle>
      </CardHeader>
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
    </Card>
  );
}
