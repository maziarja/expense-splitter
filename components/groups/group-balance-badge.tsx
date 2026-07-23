import { ArrowDownRightIcon, ArrowUpRightIcon, CheckIcon } from "lucide-react";

import type { MemberBalance } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";
import { cn } from "@/lib/utils";

export function GroupBalanceBadge({
  balance,
  currency,
}: {
  balance: MemberBalance | null;
  currency: CurrencyCode;
}) {
  if (!balance || balance.isSettled) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-sm text-text-tertiary">
        <CheckIcon className="size-3" aria-hidden="true" />
        Settled
      </span>
    );
  }

  const isOwed = balance.netBalance > 0;
  const Icon = isOwed ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-sm tabular-nums",
        isOwed ? "bg-owed-subtle text-owed" : "bg-owe-subtle text-owe",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {formatCurrency(Math.abs(balance.netBalance), currency)}
    </span>
  );
}
