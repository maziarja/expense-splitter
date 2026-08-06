"use client";

import { useState } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { SettledCelebration } from "@/components/landing/settled-celebration";
import { RecordSettlementDialog } from "@/components/groups/settlement/record-settlement-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Member } from "@/lib/data/types";
import type { MemberBalance, SettlementSuggestion } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";
import { cn } from "@/lib/utils";

function PersonalBalanceRow({
  groupId,
  suggestion,
  youId,
  membersById,
  currency,
}: {
  groupId: string;
  suggestion: SettlementSuggestion;
  youId: string;
  membersById: Map<string, Member>;
  currency: CurrencyCode;
}) {
  const [isSettling, setIsSettling] = useState(false);
  const youAreOwed = suggestion.to === youId;
  const otherId = youAreOwed ? suggestion.from : suggestion.to;
  const otherName = membersById.get(otherId)?.name ?? "Unknown member";
  const Icon = youAreOwed ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md px-4 py-3",
        youAreOwed ? "bg-owed-subtle" : "bg-owe-subtle",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs text-text-secondary md:text-sm">
          <Icon
            className={cn(
              "size-4 md:size-5",
              youAreOwed ? "text-owed-strong" : "text-owe-strong",
            )}
            aria-hidden="true"
          />
          {youAreOwed ? `${otherName} owes you` : `You owe ${otherName}`}
        </span>
        <span
          className={cn(
            "font-mono text-lg font-medium tabular-nums md:text-xl",
            youAreOwed ? "text-owed-strong" : "text-owe-strong",
          )}
        >
          {formatCurrency(suggestion.amount, currency)}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "w-full bg-transparent dark:bg-transparent",
          youAreOwed
            ? "border-owed-strong text-owed-strong hover:bg-owed-strong/10 hover:text-owed-strong dark:border-owed-strong dark:hover:bg-owed-strong/15"
            : "border-owe-strong text-owe-strong hover:bg-owe-strong/10 hover:text-owe-strong dark:border-owe-strong dark:hover:bg-owe-strong/15",
        )}
        onClick={() => setIsSettling(true)}
        aria-label={`Settle up: ${
          youAreOwed
            ? `${otherName} owes you ${formatCurrency(suggestion.amount, currency)}`
            : `you owe ${otherName} ${formatCurrency(suggestion.amount, currency)}`
        }`}
      >
        Settle up
      </Button>
      <RecordSettlementDialog
        groupId={groupId}
        from={suggestion.from}
        to={suggestion.to}
        fromName={youAreOwed ? otherName : "you"}
        toName={youAreOwed ? "you" : otherName}
        amount={suggestion.amount}
        currency={currency}
        open={isSettling}
        onOpenChange={setIsSettling}
      />
    </div>
  );
}

export function PersonalBalanceCard({
  groupId,
  youId,
  yourBalance,
  settlementSuggestions,
  membersById,
  currency,
}: {
  groupId: string;
  youId: string;
  yourBalance: MemberBalance | undefined;
  settlementSuggestions: SettlementSuggestion[];
  membersById: Map<string, Member>;
  currency: CurrencyCode;
}) {
  const relevant = settlementSuggestions.filter(
    (s) => s.from === youId || s.to === youId,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Your balance
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!yourBalance || yourBalance.isSettled ? (
          <SettledCelebration />
        ) : (
          <>
            {relevant.map((s) => (
              <PersonalBalanceRow
                key={`${s.from}-${s.to}`}
                groupId={groupId}
                suggestion={s}
                youId={youId}
                membersById={membersById}
                currency={currency}
              />
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary md:text-sm">
                Your net balance
              </span>
              <span
                className={cn(
                  "font-mono text-xs font-medium tabular-nums md:text-sm",
                  yourBalance.netBalance > 0 ? "text-owed" : "text-owe",
                )}
              >
                {yourBalance.netBalance > 0 ? "+" : "-"}
                {formatCurrency(Math.abs(yourBalance.netBalance), currency)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
