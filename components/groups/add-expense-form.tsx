"use client";

import { ExpenseSplitFields } from "@/components/groups/expense-split-fields";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddExpenseForm } from "@/hooks/use-add-expense-form";
import type { Member } from "@/lib/data/types";
import { PREDEFINED_CATEGORIES } from "@/lib/splits/constants";
import type { CurrencyCode, PredefinedCategory } from "@/lib/splits/constants";
import { getCurrencyOptions } from "@/lib/splits/currency";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS = getCurrencyOptions();

export function AddExpenseForm({
  groupId,
  activeMembers,
  groupCurrency,
  defaultPayerId,
  onSuccess,
  onCancel,
}: {
  groupId: string;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
  defaultPayerId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    amountInput,
    onAmountInputChange,
    description,
    setDescription,
    currency,
    onCurrencyChange,
    exchangeRateInput,
    onExchangeRateInputChange,
    paidBy,
    selectPayer,
    category,
    setCategory,
    date,
    setDate,
    splitType,
    setSplitType,
    participantIds,
    toggleParticipant,
    exactAmounts,
    onExactAmountChange,
    percentages,
    onPercentageChange,
    shareCounts,
    onShareCountChange,
    touched,
    hasValidAmount,
    paidByError,
    splitSectionError,
    splitAmountByMember,
    submitError,
    pending,
    handleSubmit,
  } = useAddExpenseForm({
    groupId,
    activeMembers,
    groupCurrency,
    defaultPayerId,
    onSuccess,
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-secondary p-4"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="expense-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => onAmountInputChange(e.target.value)}
              aria-invalid={touched && !hasValidAmount}
              autoFocus
              className="font-mono text-base font-semibold"
            />
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.symbol} {option.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {touched && !hasValidAmount && (
            <FieldError>Enter an amount greater than zero.</FieldError>
          )}
        </Field>

        {currency !== groupCurrency && (
          <Field>
            <FieldLabel htmlFor="expense-rate">
              Exchange rate to {groupCurrency}
            </FieldLabel>
            <Input
              id="expense-rate"
              inputMode="decimal"
              value={exchangeRateInput}
              onChange={(e) => onExchangeRateInputChange(e.target.value)}
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="expense-description">Description</FieldLabel>
          <Input
            id="expense-description"
            placeholder="Dinner at..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={touched && !description.trim()}
          />
          {touched && !description.trim() && (
            <FieldError>Description is required.</FieldError>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="expense-date">Date</FieldLabel>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="expense-category">Category</FieldLabel>
            <Select
              value={category}
              onValueChange={(next: PredefinedCategory) => setCategory(next)}
            >
              <SelectTrigger id="expense-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel>Paid by</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {activeMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => selectPayer(member.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                  paidBy === member.id
                    ? "border-accent bg-accent-subtle text-text-primary"
                    : "border-border text-text-secondary hover:bg-bg-tertiary",
                )}
              >
                <span
                  className="flex size-4 items-center justify-center rounded-full text-[9px] font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                {member.name}
              </button>
            ))}
          </div>
          {paidByError && <FieldError>{paidByError}</FieldError>}
        </Field>

        <ExpenseSplitFields
          splitType={splitType}
          onSplitTypeChange={setSplitType}
          activeMembers={activeMembers}
          participantIds={participantIds}
          toggleParticipant={toggleParticipant}
          currency={currency}
          exactAmounts={exactAmounts}
          onExactAmountChange={onExactAmountChange}
          percentages={percentages}
          onPercentageChange={onPercentageChange}
          shareCounts={shareCounts}
          onShareCountChange={onShareCountChange}
          splitAmountByMember={splitAmountByMember}
          splitSectionError={splitSectionError}
        />
      </FieldGroup>

      {submitError && (
        <p role="alert" className="text-xs text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
