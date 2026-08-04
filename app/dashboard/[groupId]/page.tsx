import { notFound } from "next/navigation";

import { GroupDetailView } from "@/components/groups/group-detail-view";
import { requireAuth } from "@/lib/auth";
import {
  filterExpenses,
  filtersFromSearchParams,
} from "@/lib/data/expense-filters";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";

export default async function DashboardGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { groupId } = await params;
  const session = await requireAuth();
  const group = await prismaDataAccess.getGroup(groupId);

  if (!group) {
    notFound();
  }

  const you = group.members.find((m) => m.userId === session.user.id);

  const filters = filtersFromSearchParams(await searchParams);
  const filteredExpenses = filterExpenses(group.expenses, filters);

  return (
    <GroupDetailView
      group={group}
      groupId={groupId}
      basePath="/dashboard"
      you={you}
      filters={filters}
      filteredExpenses={filteredExpenses}
    />
  );
}
