"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";

import { AddExpenseForm } from "@/components/groups/expense/add-expense-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Category, Member } from "@/lib/data/types";
import type { CurrencyCode } from "@/lib/splits/constants";

export function AddExpensePanel({
  groupId,
  activeMembers,
  groupCurrency,
  categories,
  defaultPayerId,
}: {
  groupId: string;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
  categories: Category[];
  defaultPayerId?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Desktop swaps the trigger button for an inline form (no Dialog/Sheet, so
  // no automatic focus-restore) — return focus to the trigger on close.
  useEffect(() => {
    if (wasOpenRef.current && !open && !isMobile) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open, isMobile]);

  const form = (
    <AddExpenseForm
      groupId={groupId}
      activeMembers={activeMembers}
      groupCurrency={groupCurrency}
      categories={categories}
      defaultPayerId={defaultPayerId}
      onSuccess={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <>
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon aria-hidden="true" />
          Add expense
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add expense</SheetTitle>
              <SheetDescription>
                Log a new expense and split it with the group.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{form}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  if (!open) {
    return (
      <Button ref={triggerRef} size="sm" onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden="true" />
        Add expense
      </Button>
    );
  }

  return form;
}
