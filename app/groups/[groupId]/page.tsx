"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import GroupNotFound from "@/app/groups/[groupId]/not-found";
import { GroupDashboardSkeleton } from "@/components/groups/dashboard/group-dashboard-skeleton";
import { GroupDetailView } from "@/components/groups/group-detail-view";
import { getCurrentMember } from "@/lib/data/current-member";
import {
  filterExpenses,
  filtersFromSearchParams,
  parseShowParam,
  sortByDateDesc,
} from "@/lib/data/expense-filters";
import { useGuestGroup, useGuestReady } from "@/lib/data/guest-hooks";

function GroupDashboardPageInner() {
  const { groupId } = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const ready = useGuestReady();
  const group = useGuestGroup(groupId);

  if (!ready) {
    return <GroupDashboardSkeleton />;
  }

  if (!group) {
    return <GroupNotFound />;
  }

  const you = getCurrentMember(group.members);

  const sp = Object.fromEntries(searchParams.entries());
  const filters = filtersFromSearchParams(sp);
  const show = parseShowParam(sp.show);
  const filteredExpenses = filterExpenses(group.expenses, filters);
  const visibleExpenses = sortByDateDesc(filteredExpenses).slice(0, show);

  return (
    <GroupDetailView
      group={group}
      groupId={groupId}
      basePath="/groups"
      you={you}
      filters={filters}
      filteredExpenses={filteredExpenses}
      visibleExpenses={visibleExpenses}
    />
  );
}

export default function GroupDashboardPage() {
  // useSearchParams() requires a Suspense boundary somewhere above it.
  return (
    <Suspense fallback={<GroupDashboardSkeleton />}>
      <GroupDashboardPageInner />
    </Suspense>
  );
}
