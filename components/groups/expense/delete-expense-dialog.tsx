"use client";

import { useState } from "react";

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
import {
  useDataAccessContext,
  useDataAccessRefresh,
} from "@/lib/data/data-access-context";

export function DeleteExpenseDialog({
  groupId,
  expenseId,
  expenseDescription,
  open,
  onOpenChange,
}: {
  groupId: string;
  expenseId: string;
  expenseDescription: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dataAccess = useDataAccessContext();
  const refresh = useDataAccessRefresh();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await dataAccess.deleteExpense(groupId, expenseId);
      onOpenChange(false);
      refresh();
    } catch {
      setError("Couldn't delete this expense. Please try again.");
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
          <AlertDialogTitle>
            Delete &quot;{expenseDescription}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the expense and its split from everyone&apos;s balance.
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
            {pending ? "Deleting…" : "Delete expense"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
