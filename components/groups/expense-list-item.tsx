"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { PencilIcon } from "lucide-react";

import { AddExpenseForm } from "@/components/groups/add-expense-form";
import { CategoryIcon } from "@/components/groups/category-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Expense, Member, SplitType } from "@/lib/data/types";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

const SPLIT_TYPE_LABELS: Partial<Record<SplitType, string>> = {
  exact: "Exact amounts",
  percentage: "By percentage",
  shares: "By shares",
};

export function ExpenseListItem({
  expense,
  payer,
  groupId,
  activeMembers,
  groupCurrency,
}: {
  expense: Expense;
  payer: Member | undefined;
  groupId: string;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
}) {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const expenseDate = new Date(expense.date);
  const splitTypeLabel = SPLIT_TYPE_LABELS[expense.splitType];

  const editForm = (
    <AddExpenseForm
      groupId={groupId}
      activeMembers={activeMembers}
      groupCurrency={groupCurrency}
      expense={expense}
      onSuccess={() => setIsEditing(false)}
      onCancel={() => setIsEditing(false)}
    />
  );

  const row = (
    <li className="flex items-center gap-4 py-3">
      <span title={expense.category} className="shrink-0">
        <CategoryIcon category={expense.category} className="md:size-5" />
        <span className="sr-only">{expense.category}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-text-primary md:text-sm">
          {expense.description}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-tertiary md:text-xs">
          <Avatar size="sm">
            <AvatarFallback
              className="text-white"
              style={{ backgroundColor: payer?.avatarColor }}
            >
              {payer?.name.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span>Paid by {payer?.name ?? "Unknown member"}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={expense.date} title={format(expenseDate, "PPP")}>
            {formatDistanceToNow(expenseDate, { addSuffix: true })}
          </time>
          {splitTypeLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{splitTypeLabel}</span>
            </>
          )}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs font-semibold text-text-primary tabular-nums md:text-sm">
        {formatCurrency(expense.amount, expense.currency)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={() => setIsEditing(true)}
      >
        <PencilIcon aria-hidden="true" />
        <span className="sr-only">Edit expense</span>
      </Button>
    </li>
  );

  if (isMobile) {
    return (
      <>
        {row}
        <Sheet open={isEditing} onOpenChange={setIsEditing}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit expense</SheetTitle>
              <SheetDescription>
                Update this expense and its split.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{editForm}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  if (isEditing) {
    return <li className="py-3">{editForm}</li>;
  }

  return row;
}
