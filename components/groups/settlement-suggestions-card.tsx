import { ArrowRightIcon } from "lucide-react";

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
        <CardTitle className="text-lg font-semibold text-text-primary md:text-xl">
          Settlement suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {settlementSuggestions.length === 0 ? (
          <p className="text-sm text-text-tertiary md:text-base">
            Everyone&apos;s settled up.
          </p>
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
                  <span className="flex items-center gap-2 text-sm text-text-secondary md:text-base">
                    <ArrowRightIcon
                      className="size-4 text-text-tertiary md:size-5"
                      aria-hidden="true"
                    />
                    {fromName} owes {toName}
                  </span>
                  <span className="font-mono text-sm font-medium text-text-primary tabular-nums md:text-base">
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
