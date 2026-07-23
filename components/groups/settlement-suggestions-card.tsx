import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Member } from "@/lib/data/types";
import type { SettlementSuggestion } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

export function SettlementSuggestionsCard({
  settlementSuggestions,
  membersById,
  currency,
}: {
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
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-success/15">
              <CheckIcon className="size-5 text-success" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-text-primary">
              All settled up
            </p>
            <p className="text-xs text-text-tertiary">
              No settlements needed right now.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {settlementSuggestions.map((s) => {
              const fromName =
                membersById.get(s.from)?.name ?? "Unknown member";
              const toName = membersById.get(s.to)?.name ?? "Unknown member";
              return (
                <li
                  key={`${s.from}-${s.to}`}
                  className="flex items-center justify-between gap-2 py-2.5 md:py-3"
                >
                  <span className="flex items-center gap-2 text-xs text-text-secondary md:text-sm">
                    <ArrowRightIcon
                      className="size-4 text-text-tertiary md:size-5"
                      aria-hidden="true"
                    />
                    {fromName} owes {toName}
                  </span>
                  <span className="font-mono text-xs font-medium text-text-primary tabular-nums md:text-sm">
                    {formatCurrency(s.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
