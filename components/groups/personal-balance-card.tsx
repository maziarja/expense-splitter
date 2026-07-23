import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { SettledCelebration } from "@/components/landing/settled-celebration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Member } from "@/lib/data/types";
import type { MemberBalance, SettlementSuggestion } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";
import { cn } from "@/lib/utils";

export function PersonalBalanceCard({
  youId,
  yourBalance,
  settlementSuggestions,
  membersById,
  currency,
}: {
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
        <CardTitle className="text-lg font-semibold text-text-primary md:text-xl">
          Your balance
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!yourBalance || yourBalance.isSettled ? (
          <SettledCelebration />
        ) : (
          <>
            {relevant.map((s) => {
              const youAreOwed = s.to === youId;
              const otherId = youAreOwed ? s.from : s.to;
              const otherName =
                membersById.get(otherId)?.name ?? "Unknown member";
              const Icon = youAreOwed ? ArrowUpRightIcon : ArrowDownRightIcon;
              return (
                <div
                  key={`${s.from}-${s.to}`}
                  className={cn(
                    "flex items-center justify-between rounded-md px-4 py-3",
                    youAreOwed ? "bg-owed-subtle" : "bg-owe-subtle",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm text-text-secondary md:text-base">
                    <Icon
                      className={cn(
                        "size-4 md:size-5",
                        youAreOwed ? "text-owed-strong" : "text-owe-strong",
                      )}
                      aria-hidden="true"
                    />
                    {youAreOwed
                      ? `${otherName} owes you`
                      : `You owe ${otherName}`}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xl font-medium tabular-nums md:text-2xl",
                      youAreOwed ? "text-owed-strong" : "text-owe-strong",
                    )}
                  >
                    {formatCurrency(s.amount, currency)}
                  </span>
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-tertiary md:text-base">
                Your net balance
              </span>
              <span
                className={cn(
                  "font-mono text-sm font-medium tabular-nums md:text-base",
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
