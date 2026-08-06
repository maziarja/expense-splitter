"use client";

import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExpenseActionsMenu({
  onEdit,
  onDelete,
  triggerRef,
}: {
  onEdit: () => void;
  onDelete: () => void;
  triggerRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
        >
          <MoreVerticalIcon aria-hidden="true" />
          <span className="sr-only">Expense actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon aria-hidden="true" />
          Edit expense
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2Icon aria-hidden="true" />
          Delete expense
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
