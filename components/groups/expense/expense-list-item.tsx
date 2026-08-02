"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { AddExpenseForm } from "@/components/groups/expense/add-expense-form";
import { CategoryIcon } from "@/components/groups/expense/category-icon";
import { DeleteExpenseDialog } from "@/components/groups/expense/delete-expense-dialog";
import { ExpenseActionsMenu } from "@/components/groups/expense/expense-actions-menu";
import { ExpenseDetailPanel } from "@/components/groups/expense/expense-detail-panel";
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
import type { Category, Expense, Member, SplitType } from "@/lib/data/types";
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
  membersById,
  groupId,
  activeMembers,
  groupCurrency,
  categories,
}: {
  expense: Expense;
  payer: Member | undefined;
  membersById: Map<string, Member>;
  groupId: string;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
  categories: Category[];
}) {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const expenseDate = new Date(expense.date);
  const splitTypeLabel = SPLIT_TYPE_LABELS[expense.splitType];

  const editForm = (
    <AddExpenseForm
      groupId={groupId}
      activeMembers={activeMembers}
      groupCurrency={groupCurrency}
      categories={categories}
      expense={expense}
      onSuccess={() => setIsEditing(false)}
      onCancel={() => setIsEditing(false)}
    />
  );

  const chevronButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      onClick={() => setIsExpanded((v) => !v)}
      aria-expanded={isExpanded}
    >
      {isExpanded ? (
        <ChevronDownIcon aria-hidden="true" />
      ) : (
        <ChevronRightIcon aria-hidden="true" />
      )}
      <span className="sr-only">
        {isExpanded ? "Hide details" : "Show details"}
      </span>
    </Button>
  );

  const actionsMenu = (
    <ExpenseActionsMenu
      onEdit={() => setIsEditing(true)}
      onDelete={() => setIsDeleting(true)}
    />
  );

  const expandedDetail = isExpanded && (
    <ExpenseDetailPanel
      expense={expense}
      membersById={membersById}
      groupCurrency={groupCurrency}
    />
  );

  const deleteDialog = (
    <DeleteExpenseDialog
      groupId={groupId}
      expenseId={expense.id}
      expenseDescription={expense.description}
      open={isDeleting}
      onOpenChange={setIsDeleting}
    />
  );

  const mobileRow = (
    <li className="py-3">
      <div className="flex items-start gap-1">
        {chevronButton}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-text-primary">
              {expense.description}
            </p>
            {actionsMenu}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-tertiary">
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback
                  className="text-white"
                  style={{ backgroundColor: payer?.avatarColor }}
                >
                  {payer?.name.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {payer?.name ?? "Unknown member"}
              </span>
              <span aria-hidden="true" className="shrink-0">
                ·
              </span>
              <time
                dateTime={expense.date}
                title={format(expenseDate, "PPP")}
                className="shrink-0"
              >
                {formatDistanceToNow(expenseDate, { addSuffix: true })}
              </time>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold text-text-primary tabular-nums">
              {formatCurrency(expense.amount, expense.currency)}
            </span>
          </div>
        </div>
      </div>
      {expandedDetail}
      {deleteDialog}
    </li>
  );

  const desktopRow = (
    <li className="py-3">
      <div className="flex items-center gap-4">
        {chevronButton}
        <span title={expense.category} className="shrink-0">
          <CategoryIcon category={expense.category} className="size-5" />
          <span className="sr-only">{expense.category}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-text-primary">
            {expense.description}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-tertiary">
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
        <span className="shrink-0 font-mono text-sm font-semibold text-text-primary tabular-nums">
          {formatCurrency(expense.amount, expense.currency)}
        </span>
        {actionsMenu}
      </div>
      {expandedDetail}
      {deleteDialog}
    </li>
  );

  if (isMobile) {
    return (
      <>
        {mobileRow}
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

  return desktopRow;
}
