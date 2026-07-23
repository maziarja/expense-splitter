"use client";

import { redirect } from "next/navigation";

import { GroupDashboardSkeleton } from "@/components/groups/group-dashboard-skeleton";
import { useGuestGroups } from "@/lib/data/guest-hooks";

export default function GroupsIndexPage() {
  const groups = useGuestGroups();

  if (groups.length > 0) {
    redirect(`/groups/${groups[0].id}`);
  }

  return <GroupDashboardSkeleton />;
}
