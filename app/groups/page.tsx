"use client";

import { PlusIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { GroupDashboardSkeleton } from "@/components/groups/group-dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { useCreateGroupDialogStore } from "@/lib/data/create-group-dialog-store";
import { useGuestGroups, useGuestReady } from "@/lib/data/guest-hooks";

export default function GroupsIndexPage() {
  const ready = useGuestReady();
  const groups = useGuestGroups();

  if (ready && groups.length > 0) {
    redirect(`/groups/${groups[0].id}`);
  }

  if (ready && groups.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-semibold text-text-primary">No groups yet</p>
        <p className="text-xs text-text-secondary md:text-sm">
          Create a group to start splitting expenses.
        </p>
        <Button
          size="sm"
          onClick={() => useCreateGroupDialogStore.getState().setOpen(true)}
        >
          <PlusIcon aria-hidden="true" />
          New group
        </Button>
      </main>
    );
  }

  return <GroupDashboardSkeleton />;
}
