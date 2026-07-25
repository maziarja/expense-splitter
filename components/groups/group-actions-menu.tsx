"use client";

import { useState } from "react";
import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { DeleteGroupDialog } from "@/components/groups/delete-group-dialog";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Group } from "@/lib/data/types";

export function GroupActionsMenu({
  group,
  hasExpenses,
}: {
  group: Pick<Group, "id" | "name" | "description" | "currency">;
  hasExpenses: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreVerticalIcon aria-hidden="true" />
            <span className="sr-only">Group actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <PencilIcon aria-hidden="true" />
            Edit group
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2Icon aria-hidden="true" />
            Delete group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditGroupDialog
        group={group}
        hasExpenses={hasExpenses}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteGroupDialog
        groupId={group.id}
        groupName={group.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
