import { CategoryBreakdownCard } from "@/components/groups/expense/category-breakdown-card";
import { MemberContributionCard } from "@/components/groups/expense/member-contribution-card";
import { SpendingOverTimeCard } from "@/components/groups/expense/spending-over-time-card";
import type { Category, Expense, Member } from "@/lib/data/types";
import type { CurrencyCode } from "@/lib/splits/constants";

// Grouped into one module (rather than each card importing recharts
// separately) so the code-split chunk in group-detail-view.tsx bundles
// recharts once instead of once per card.
export function ChartsSection({
  spendingExpenses,
  breakdownExpenses,
  memberContributionExpenses,
  activeMembers,
  categories,
  groupCurrency,
  youId,
}: {
  spendingExpenses: Expense[];
  breakdownExpenses: Expense[];
  memberContributionExpenses: Expense[];
  activeMembers: Member[];
  categories: Category[];
  groupCurrency: CurrencyCode;
  youId: string | undefined;
}) {
  return (
    <>
      <SpendingOverTimeCard
        expenses={spendingExpenses}
        groupCurrency={groupCurrency}
      />

      <CategoryBreakdownCard
        expenses={breakdownExpenses}
        categories={categories}
        groupCurrency={groupCurrency}
      />

      <MemberContributionCard
        expenses={memberContributionExpenses}
        activeMembers={activeMembers}
        categories={categories}
        groupCurrency={groupCurrency}
        youId={youId}
      />
    </>
  );
}
