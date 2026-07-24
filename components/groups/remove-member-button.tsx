"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataAccessError } from "@/lib/data/data-access";
import { guestDataAccess } from "@/lib/data/guest-store";
import type { Member } from "@/lib/data/types";

export function RemoveMemberButton({
  groupId,
  member,
}: {
  groupId: string;
  member: Member;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRemove() {
    setPending(true);
    setError(null);
    try {
      await guestDataAccess.removeMember(groupId, member.id);
      setOpen(false);
    } catch (err) {
      if (err instanceof DataAccessError && err.code === "MEMBER_HAS_BALANCE") {
        setError(
          `${member.name} has an outstanding balance and can't be removed until it's settled.`,
        );
      } else {
        setError("Couldn't remove this member. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-text-tertiary hover:text-destructive"
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">Remove {member.name}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They won&apos;t be included in new expenses. Past expenses and
            settlements involving them stay in the group&apos;s history.
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
              void handleRemove();
            }}
          >
            {pending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
