"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { GroupSidebarShell } from "@/components/groups/group-sidebar-shell";
import type { GroupSummary } from "@/lib/data/types";

export function DashboardSidebar({ groups }: { groups: GroupSummary[] }) {
  return (
    <GroupSidebarShell
      groups={groups}
      basePath="/dashboard"
      footer={<SignOutButton />}
    />
  );
}
