"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataAccessError } from "@/lib/data/data-access";
import { useDataAccessContext } from "@/lib/data/data-access-context";

export function DeleteGroupDialog({
  groupId,
  groupName,
  basePath,
  open,
  onOpenChange,
}: {
  groupId: string;
  groupName: string;
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const dataAccess = useDataAccessContext();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await dataAccess.deleteGroup(groupId);
      onOpenChange(false);
      router.push(basePath);
    } catch (err) {
      if (err instanceof DataAccessError && err.code === "GROUP_NOT_SETTLED") {
        setError(
          "This group has unsettled balances and can't be deleted until everyone's settled up.",
        );
      } else {
        setError("Couldn't delete this group. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {groupName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the group, its members, and its expenses.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {pending ? "Deleting…" : "Delete group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
