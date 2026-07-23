import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GroupBalanceBadge } from "@/components/groups/group-balance-badge";
import type { Member } from "@/lib/data/types";
import type { MemberBalance } from "@/lib/splits/balance";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";

export function GroupSummaryCard({
  members,
  memberBalances,
  totalSpent,
  expenseCount,
  currency,
}: {
  members: Member[];
  memberBalances: MemberBalance[];
  totalSpent: number;
  expenseCount: number;
  currency: CurrencyCode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Group summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-lg font-medium text-text-primary tabular-nums md:text-xl">
            {formatCurrency(totalSpent, currency)}
          </p>
          <p className="text-xs text-text-tertiary md:text-sm">
            Total spent · {expenseCount} expense{expenseCount === 1 ? "" : "s"}
          </p>
        </div>
        <Separator />
        <ul className="flex flex-col gap-3">
          {members.map((member) => {
            const balance =
              memberBalances.find((b) => b.memberId === member.id) ?? null;
            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar>
                    <AvatarFallback
                      className="text-white"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs text-text-primary md:text-sm">
                    {member.name}
                  </span>
                </span>
                <GroupBalanceBadge balance={balance} currency={currency} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
