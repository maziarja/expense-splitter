"use client";

import { useState } from "react";
import { ArrowRightIcon, HandshakeIcon } from "lucide-react";

import { RecordSettlementDialog } from "@/components/groups/settlement/record-settlement-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Member } from "@/lib/data/types";
import type { SettlementSuggestion } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

function SettlementSuggestionRow({
  groupId,
  suggestion,
  membersById,
  currency,
}: {
  groupId: string;
  suggestion: SettlementSuggestion;
  membersById: Map<string, Member>;
  currency: CurrencyCode;
}) {
  const [isSettling, setIsSettling] = useState(false);
  const fromName = membersById.get(suggestion.from)?.name ?? "Unknown member";
  const toName = membersById.get(suggestion.to)?.name ?? "Unknown member";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 md:py-3">
      <span className="flex items-center gap-2 text-xs text-text-secondary md:text-sm">
        <ArrowRightIcon
          className="size-4 text-text-tertiary md:size-5"
          aria-hidden="true"
        />
        {fromName} owes {toName}
      </span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-medium text-text-primary tabular-nums md:text-sm">
          {formatCurrency(suggestion.amount, currency)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsSettling(true)}
          aria-label={`Settle up: ${fromName} owes ${toName} ${formatCurrency(suggestion.amount, currency)}`}
        >
          Settle up
        </Button>
      </div>
      <RecordSettlementDialog
        groupId={groupId}
        from={suggestion.from}
        to={suggestion.to}
        fromName={fromName}
        toName={toName}
        amount={suggestion.amount}
        currency={currency}
        open={isSettling}
        onOpenChange={setIsSettling}
      />
    </li>
  );
}

export function SettlementSuggestionsCard({
  groupId,
  settlementSuggestions,
  membersById,
  currency,
}: {
  groupId: string;
  settlementSuggestions: SettlementSuggestion[];
  membersById: Map<string, Member>;
  currency: CurrencyCode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Settlement suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {settlementSuggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center motion-safe:animate-in motion-safe:duration-500 motion-safe:zoom-in-95 motion-safe:fade-in">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
              <HandshakeIcon
                className="size-6 text-success"
                aria-hidden="true"
              />
            </div>
            <p className="text-base font-bold text-text-primary">
              Nothing left to settle
            </p>
            <p className="text-xs text-text-secondary">
              Every debt in this group is settled.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {settlementSuggestions.map((s) => (
              <SettlementSuggestionRow
                key={`${s.from}-${s.to}`}
                groupId={groupId}
                suggestion={s}
                membersById={membersById}
                currency={currency}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
