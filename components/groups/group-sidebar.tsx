"use client";

import { GuestSignupPrompt } from "@/components/groups/dashboard/guest-signup-prompt";
import { GroupSidebarShell } from "@/components/groups/group-sidebar-shell";
import { useGuestGroups, useGuestReady } from "@/lib/data/guest-hooks";

export function GroupSidebar() {
  const ready = useGuestReady();
  const groups = useGuestGroups();

  return (
    <GroupSidebarShell
      groups={groups}
      ready={ready}
      basePath="/groups"
      footer={<GuestSignupPrompt />}
    />
  );
}
