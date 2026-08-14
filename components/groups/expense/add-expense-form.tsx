"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { CategoryIcon } from "@/components/groups/expense/category-icon";
import { ManageCategoriesDialog } from "@/components/groups/expense/manage-categories-dialog";
import { ExpenseSplitFields } from "@/components/groups/expense/expense-split-fields";
import { ReceiptUploadField } from "@/components/groups/expense/receipt-upload-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAddExpenseForm } from "@/hooks/use-add-expense-form";
import type { Category, Expense, Member } from "@/lib/data/types";
import type { ReceiptExtraction } from "@/lib/receipt-extraction/schema";
import { PREDEFINED_CATEGORIES } from "@/lib/splits/constants";
import type { CurrencyCode } from "@/lib/splits/constants";
import { getCurrencyOptions } from "@/lib/splits/currency";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS = getCurrencyOptions();

// Shown next to a field's label when the AI extraction wasn't confident
// about that specific value — surfaced, not silently trusted, per this
// feature's design. Disappears the moment the user edits that field (see
// clearFieldConfidence below), rather than nagging indefinitely once
// they've already reviewed it.
function LowConfidenceFlag() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriangleAlertIcon
          aria-label="AI wasn't fully confident about this value — double-check it"
          className="inline size-3 shrink-0 text-warning"
        />
      </TooltipTrigger>
      <TooltipContent>
        AI wasn&apos;t fully confident about this value — double-check it.
      </TooltipContent>
    </Tooltip>
  );
}

export function AddExpenseForm({
  groupId,
  activeMembers,
  groupCurrency,
  categories,
  defaultPayerId,
  expense,
  onSuccess,
  onCancel,
  onOptimisticCreate,
  onOptimisticSettled,
  onOptimisticFailed,
}: {
  groupId: string;
  activeMembers: Member[];
  groupCurrency: CurrencyCode;
  categories: Category[];
  defaultPayerId?: string;
  expense?: Expense;
  onSuccess: () => void;
  onCancel: () => void;
  onOptimisticCreate?: (expense: Expense) => void;
  onOptimisticSettled?: (tempId: string) => void;
  onOptimisticFailed?: (tempId: string) => void;
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
    fetchingRate,
    rateFetchError,
    rateStale,
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
    expense,
    onSuccess,
    onOptimisticCreate,
    onOptimisticSettled,
    onOptimisticFailed,
  });

  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const latestReceiptUrlRef = useRef<string | null>(null);

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function runExtraction(url: string) {
    setExtracting(true);
    try {
      const response = await fetch("/api/receipt-extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      const body = await response.json();
      if (latestReceiptUrlRef.current !== url || !mountedRef.current) return;

      if (!response.ok) {
        setExtractionError(
          typeof body?.error === "string"
            ? body.error
            : "Couldn't extract receipt details.",
        );
        return;
      }

      const result = body as ReceiptExtraction;
      setExtraction(result);

      // Currency must be applied before amount: onCurrencyChange
      // unconditionally resets amountInput, so setting it after would wipe
      // the extracted amount right back out.
      if (result.currency && result.currency.value !== currency) {
        onCurrencyChange(result.currency.value);
      }
      if (result.amount) {
        onAmountInputChange(String(result.amount.value));
      }
      if (result.merchant) {
        setDescription(result.merchant.value);
      }
      if (result.date) {
        setDate(result.date.value);
      }
    } catch {
      if (latestReceiptUrlRef.current === url && mountedRef.current) {
        setExtractionError("Couldn't reach the extraction service.");
      }
    } finally {
      if (latestReceiptUrlRef.current === url && mountedRef.current) {
        setExtracting(false);
      }
    }
  }

  async function handleReceiptChange(url: string | null) {
    setReceiptImageUrl(url);
    latestReceiptUrlRef.current = url;
    setExtraction(null);
    setExtractionError(null);

    if (!url) return;
    await runExtraction(url);
  }

  function retryExtraction() {
    if (!receiptImageUrl) return;
    setExtractionError(null);
    runExtraction(receiptImageUrl);
  }

  function clearFieldConfidence(field: keyof ReceiptExtraction) {
    setExtraction((prev) => (prev ? { ...prev, [field]: null } : prev));
  }

  const [pendingCategories, setPendingCategories] = useState<Category[]>([]);
  const allCategories = useMemo(() => {
    const knownIds = new Set(categories.map((c) => c.id));
    return [
      ...categories,
      ...pendingCategories.filter((c) => !knownIds.has(c.id)),
    ];
  }, [categories, pendingCategories]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-secondary p-4"
    >
      <FieldGroup>
        <ReceiptUploadField
          value={receiptImageUrl}
          onChange={handleReceiptChange}
          extracting={extracting}
          extractionError={extractionError}
          onRetryExtraction={retryExtraction}
        />

        <Field>
          <FieldLabel htmlFor="expense-amount">
            Amount{" "}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>{" "}
            {extraction?.amount?.confidence === "low" && <LowConfidenceFlag />}
          </FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="expense-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => {
                onAmountInputChange(e.target.value);
                clearFieldConfidence("amount");
              }}
              aria-invalid={touched && !hasValidAmount}
              aria-required="true"
              autoFocus
              className="font-mono text-base font-semibold"
            />
            <Select
              value={currency}
              onValueChange={(v) => {
                onCurrencyChange(v as CurrencyCode);
                clearFieldConfidence("currency");
              }}
            >
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
            {extraction?.currency?.confidence === "low" && (
              <LowConfidenceFlag />
            )}
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
            {fetchingRate && (
              <FieldDescription>Fetching live rate…</FieldDescription>
            )}
            {!fetchingRate && rateFetchError && (
              <FieldDescription>{rateFetchError}</FieldDescription>
            )}
            {!fetchingRate && !rateFetchError && rateStale && (
              <FieldDescription>
                This rate may be outdated — exchange rate service is unreachable
                right now.
              </FieldDescription>
            )}
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="expense-description">
            Description{" "}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>{" "}
            {extraction?.merchant?.confidence === "low" && (
              <LowConfidenceFlag />
            )}
          </FieldLabel>
          <Input
            id="expense-description"
            placeholder="Dinner at..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldConfidence("merchant");
            }}
            aria-invalid={touched && !description.trim()}
            aria-required="true"
          />
          {touched && !description.trim() && (
            <FieldError>Description is required.</FieldError>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="expense-date">
              Date{" "}
              {extraction?.date?.confidence === "low" && <LowConfidenceFlag />}
            </FieldLabel>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                clearFieldConfidence("date");
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="expense-category">Category</FieldLabel>
            <div className="flex gap-1">
              <Select
                value={category}
                onValueChange={(v) => {
                  // Radix Select can fire onValueChange("") as an internal
                  // correction when its item collection changes shape out
                  // from under the current value (e.g. right as a freshly
                  // created category's item mounts). There's no legitimate
                  // "no category" state in this app — category always
                  // defaults to "Other" — so an empty callback is never a
                  // real user selection and should just be ignored.
                  if (v) setCategory(v);
                }}
              >
                <SelectTrigger id="expense-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon category={c} />
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                  {allCategories.length > 0 && <SelectSeparator />}
                  {allCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon category={c.name} color={c.color} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                  {/* Safety net for a genuinely orphaned value only (e.g.
                      editing an expense whose category was deleted from the
                      group since) — a freshly-created category never hits
                      this, since it's already in allCategories above. */}
                  {category &&
                    !(PREDEFINED_CATEGORIES as readonly string[]).includes(
                      category,
                    ) &&
                    !allCategories.some((c) => c.name === category) && (
                      <SelectItem value={category}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon category={category} />
                          {category}
                        </span>
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              <ManageCategoriesDialog
                groupId={groupId}
                categories={allCategories}
                onCreated={(c) => {
                  setPendingCategories((prev) => [...prev, c]);
                  setCategory(c.name);
                }}
                onDeleted={(c) => {
                  setPendingCategories((prev) =>
                    prev.filter((p) => p.id !== c.id),
                  );
                  if (c.name === category) setCategory("Other");
                }}
              />
            </div>
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
          {expense
            ? pending
              ? "Saving…"
              : "Save changes"
            : pending
              ? "Adding…"
              : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
