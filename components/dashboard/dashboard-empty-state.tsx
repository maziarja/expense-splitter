"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCreateGroupDialogStore } from "@/lib/data/create-group-dialog-store";

export function DashboardEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
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
    </div>
  );
}
