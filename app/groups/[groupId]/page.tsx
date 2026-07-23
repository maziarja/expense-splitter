"use client";

import { useParams } from "next/navigation";

import GroupNotFound from "@/app/groups/[groupId]/not-found";
import { getCurrentMember } from "@/lib/data/current-member";
import { useGuestGroup } from "@/lib/data/guest-hooks";
import { formatCurrency } from "@/lib/splits/currency";

export default function GroupDashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useGuestGroup(groupId);

  if (!group) {
    return <GroupNotFound />;
  }

  const you = getCurrentMember(group.members);
  const yourBalance = group.memberBalances.find((b) => b.memberId === you?.id);

  return (
    <main className="flex flex-1 flex-col gap-4 bg-bg-primary p-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{group.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {group.members.length} members · {group.expenses.length} expenses
        </p>
      </div>
      {yourBalance && (
        <p className="font-mono text-lg tabular-nums">
          Your balance:{" "}
          <span
            className={
              yourBalance.isSettled
                ? "text-text-tertiary"
                : yourBalance.netBalance > 0
                  ? "text-owed"
                  : "text-owe"
            }
          >
            {yourBalance.isSettled
              ? "Settled up"
              : formatCurrency(
                  Math.abs(yourBalance.netBalance),
                  group.currency,
                )}
          </span>
        </p>
      )}
      <p className="text-sm text-text-tertiary">
        Full group dashboard coming in the next step.
      </p>
    </main>
  );
}
