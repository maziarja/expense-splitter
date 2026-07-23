"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

import GroupNotFound from "@/app/groups/[groupId]/not-found";
import { GroupSummaryCard } from "@/components/groups/group-summary-card";
import { PersonalBalanceCard } from "@/components/groups/personal-balance-card";
import { RecentExpensesCard } from "@/components/groups/recent-expenses-card";
import { SettlementSuggestionsCard } from "@/components/groups/settlement-suggestions-card";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { getCurrentMember } from "@/lib/data/current-member";
import { useGuestGroup } from "@/lib/data/guest-hooks";
import { calculateTotalSpent } from "@/lib/splits/balance";

export default function GroupDashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useGuestGroup(groupId);

  const activeMembers = useMemo(
    () => group?.members.filter((m) => !m.deletedAt) ?? [],
    [group],
  );

  const membersById = useMemo(
    () => new Map(group?.members.map((m) => [m.id, m] as const) ?? []),
    [group],
  );
  const totalSpent = useMemo(
    () => (group ? calculateTotalSpent(group.expenses, group.currency) : 0),
    [group],
  );

  if (!group) {
    return <GroupNotFound />;
  }

  const you = getCurrentMember(group.members);
  const yourBalance = group.memberBalances.find((b) => b.memberId === you?.id);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-bg-primary p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl md:text-3xl">
              {group.name}
            </h1>
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
          <p className="text-sm text-text-secondary md:text-base">
            {activeMembers.length} member
            {activeMembers.length === 1 ? "" : "s"} · {group.expenses.length}{" "}
            expense{group.expenses.length === 1 ? "" : "s"}
          </p>
        </header>

        {you && (
          <PersonalBalanceCard
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
        />

        <RecentExpensesCard
          expenses={group.expenses}
          membersById={membersById}
        />

        <SettlementSuggestionsCard
          settlementSuggestions={group.settlementSuggestions}
          membersById={membersById}
          currency={group.currency}
        />
      </div>
    </main>
  );
}
