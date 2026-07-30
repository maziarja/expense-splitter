"use client";

import { useParams } from "next/navigation";

import GroupNotFound from "@/app/groups/[groupId]/not-found";
import { GroupDashboardSkeleton } from "@/components/groups/dashboard/group-dashboard-skeleton";
import { GroupDetailView } from "@/components/groups/group-detail-view";
import { getCurrentMember } from "@/lib/data/current-member";
import { useGuestGroup, useGuestReady } from "@/lib/data/guest-hooks";

export default function GroupDashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const ready = useGuestReady();
  const group = useGuestGroup(groupId);

  if (!ready) {
    return <GroupDashboardSkeleton />;
  }

  if (!group) {
    return <GroupNotFound />;
  }

  const you = getCurrentMember(group.members);

  return (
    <GroupDetailView
      group={group}
      groupId={groupId}
      basePath="/groups"
      you={you}
    />
  );
}
