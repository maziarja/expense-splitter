"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createSettlementInputSchema,
  DataAccessError,
} from "@/lib/data/data-access";
import { guestDataAccess } from "@/lib/data/guest-store";
import { dateInputToIso, todayDateValue } from "@/lib/forms/date-input";
import type { CurrencyCode } from "@/lib/splits/constants";
import { sanitizeDecimalInput } from "@/lib/splits/currency";

export function RecordSettlementDialog({
  groupId,
  from,
  to,
  fromName,
  toName,
  amount,
  currency,
  open,
  onOpenChange,
}: {
  groupId: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  amount: number;
  currency: CurrencyCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amountInput, setAmountInput] = useState(() => String(amount));
  const [dateValue, setDateValue] = useState(todayDateValue);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmountInput(String(amount));
      setDateValue(todayDateValue());
      setSubmitError(null);
    }
  }

  const parsedAmount = parseFloat(amountInput);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasValidDate = dateValue !== "" && dateValue <= todayDateValue();

  async function onSubmit() {
    if (!hasValidAmount || !hasValidDate) return;
    setPending(true);
    setSubmitError(null);
    try {
      const parsed = createSettlementInputSchema.safeParse({
        from,
        to,
        amount: parsedAmount,
        currency,
        exchangeRate: 1,
        date: dateInputToIso(dateValue),
      });
      if (!parsed.success) {
        setSubmitError("Couldn't record the settlement. Please try again.");
        return;
      }
      await guestDataAccess.createSettlement(groupId, parsed.data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof DataAccessError && err.code === "NO_DEBT_EXISTS") {
        setSubmitError(
          "This debt no longer exists — balances may have changed.",
        );
      } else {
        setSubmitError("Couldn't record the settlement. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record settlement</DialogTitle>
          <DialogDescription>
            {fromName} pays {toName}
          </DialogDescription>
        </DialogHeader>
        <form
          id="record-settlement-form"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <FieldGroup>
            <Field data-invalid={!hasValidAmount}>
              <FieldLabel htmlFor="settlement-amount">Amount</FieldLabel>
              <Input
                id="settlement-amount"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) =>
                  setAmountInput(sanitizeDecimalInput(e.target.value))
                }
                aria-invalid={!hasValidAmount}
                autoFocus
                className="font-mono text-base font-semibold"
              />
              <FieldDescription>
                Enter a smaller amount to record a partial settlement.
              </FieldDescription>
              {!hasValidAmount && (
                <FieldError>Enter an amount greater than zero.</FieldError>
              )}
            </Field>
            <Field data-invalid={!hasValidDate}>
              <FieldLabel htmlFor="settlement-date">Date</FieldLabel>
              <Input
                id="settlement-date"
                type="date"
                value={dateValue}
                max={todayDateValue()}
                onChange={(e) => setDateValue(e.target.value)}
                aria-invalid={!hasValidDate}
              />
              {!hasValidDate && (
                <FieldError>
                  Settlement date can&apos;t be in the future.
                </FieldError>
              )}
            </Field>
          </FieldGroup>
          {submitError && (
            <p role="alert" className="mt-3 text-xs text-destructive">
              {submitError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="record-settlement-form"
            disabled={pending || !hasValidAmount || !hasValidDate}
          >
            {pending ? "Recording…" : "Record settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
