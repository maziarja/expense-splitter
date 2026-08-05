import { GroupSummaryCard } from "@/components/groups/dashboard/group-summary-card";
import { PersonalBalanceCard } from "@/components/groups/dashboard/personal-balance-card";
import { SettlementSuggestionsCard } from "@/components/groups/dashboard/settlement-suggestions-card";
import { CategoryBreakdownCard } from "@/components/groups/expense/category-breakdown-card";
import { RecentExpensesCard } from "@/components/groups/expense/recent-expenses-card";
import { GroupActionsMenu } from "@/components/groups/group/group-actions-menu";
import { MembersCard } from "@/components/groups/members/members-card";
import { SettlementHistoryCard } from "@/components/groups/settlement/settlement-history-card";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import {
  filterExpenses,
  type ExpenseFilterState,
} from "@/lib/data/expense-filters";
import type { Expense, GroupDetail, Member } from "@/lib/data/types";
import { calculateTotalSpent } from "@/lib/splits/balance";

export function GroupDetailView({
  group,
  groupId,
  basePath,
  you,
  filters,
  filteredExpenses,
}: {
  group: GroupDetail;
  groupId: string;
  basePath: string;
  you: Member | undefined;
  filters: ExpenseFilterState;
  filteredExpenses: Expense[];
}) {
  const activeMembers = group.members.filter((m) => !m.deletedAt);
  const membersById = new Map(group.members.map((m) => [m.id, m] as const));
  const totalSpent = calculateTotalSpent(group.expenses, group.currency);
  const yourBalance = group.memberBalances.find((b) => b.memberId === you?.id);

  const breakdownExpenses = filterExpenses(group.expenses, {
    ...filters,
    category: null,
  });

  return (
    <main className="flex flex-1 flex-col gap-6 bg-bg-primary px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-bold text-text-primary sm:text-xl md:text-2xl">
                {group.name}
              </h1>
              <div className="pt-1">
                <GroupActionsMenu
                  group={{
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    currency: group.currency,
                  }}
                  hasExpenses={group.expenses.length > 0}
                  basePath={basePath}
                />
              </div>
            </div>
            <AvatarGroup>
              {activeMembers.map((member) => (
                <Avatar key={member.id}>
                  <AvatarFallback
                    className="text-white"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          </div>
          <p className="text-xs text-text-secondary md:text-sm">
            {activeMembers.length} member
            {activeMembers.length === 1 ? "" : "s"} · {group.expenses.length}{" "}
            expense{group.expenses.length === 1 ? "" : "s"}
          </p>
        </header>

        <MembersCard
          groupId={groupId}
          members={activeMembers}
          youId={you?.id}
        />

        {you && (
          <PersonalBalanceCard
            groupId={groupId}
            youId={you.id}
            yourBalance={yourBalance}
            settlementSuggestions={group.settlementSuggestions}
            membersById={membersById}
            currency={group.currency}
          />
        )}

        <GroupSummaryCard
          members={activeMembers}
          memberBalances={group.memberBalances}
          totalSpent={totalSpent}
          expenseCount={group.expenses.length}
          currency={group.currency}
          youId={you?.id}
        />

        <RecentExpensesCard
          groupId={groupId}
          expenses={filteredExpenses}
          membersById={membersById}
          activeMembers={activeMembers}
          groupCurrency={group.currency}
          categories={group.categories}
          filters={filters}
          defaultPayerId={you?.id}
        />

        <CategoryBreakdownCard
          expenses={breakdownExpenses}
          groupCurrency={group.currency}
        />

        <SettlementHistoryCard
          settlements={group.settlements}
          membersById={membersById}
        />

        <SettlementSuggestionsCard
          groupId={groupId}
          settlementSuggestions={group.settlementSuggestions}
          membersById={membersById}
          currency={group.currency}
        />
      </div>
    </main>
  );
}
