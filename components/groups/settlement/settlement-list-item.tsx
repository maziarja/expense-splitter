import { format, formatDistanceToNow } from "date-fns";
import { HandCoinsIcon } from "lucide-react";

import type { Member, Settlement } from "@/lib/data/types";
import { formatCurrency } from "@/lib/splits/currency";

export function SettlementListItem({
  settlement,
  membersById,
}: {
  settlement: Settlement;
  membersById: Map<string, Member>;
}) {
  const fromName = membersById.get(settlement.from)?.name ?? "Unknown member";
  const toName = membersById.get(settlement.to)?.name ?? "Unknown member";
  const settlementDate = new Date(settlement.date);

  return (
    <li className="flex items-center gap-3 rounded-md bg-success/5 px-2 py-3 md:gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15">
        <HandCoinsIcon className="size-4 text-success" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">
          {fromName} paid {toName}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-tertiary">
          <span className="font-medium text-success">Settlement</span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={settlement.date}
            title={format(settlementDate, "PPP")}
          >
            {formatDistanceToNow(settlementDate, { addSuffix: true })}
          </time>
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold text-success tabular-nums">
        {formatCurrency(settlement.amount, settlement.currency)}
      </span>
    </li>
  );
}
