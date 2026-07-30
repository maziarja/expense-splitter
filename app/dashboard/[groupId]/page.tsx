import { notFound } from "next/navigation";

import { GroupDetailView } from "@/components/groups/group-detail-view";
import { requireAuth } from "@/lib/auth";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";

export default async function DashboardGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await requireAuth();
  const group = await prismaDataAccess.getGroup(groupId);

  if (!group) {
    notFound();
  }

  const you = group.members.find((m) => m.userId === session.user.id);

  return (
    <GroupDetailView
      group={group}
      groupId={groupId}
      basePath="/dashboard"
      you={you}
    />
  );
}
