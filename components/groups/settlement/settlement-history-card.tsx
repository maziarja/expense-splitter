"use client";

import { useMemo, useState } from "react";

import { SettlementListItem } from "@/components/groups/settlement/settlement-list-item";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Member, Settlement } from "@/lib/data/types";

const VISIBLE_COUNT = 5;

export function SettlementHistoryCard({
  settlements,
  membersById,
}: {
  settlements: Settlement[];
  membersById: Map<string, Member>;
}) {
  const sorted = useMemo(
    () =>
      [...settlements].sort(
        (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf(),
      ),
    [settlements],
  );
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_COUNT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Settlement history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-xs text-text-tertiary md:text-sm">
            No settlements recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((settlement) => (
              <SettlementListItem
                key={settlement.id}
                settlement={settlement}
                membersById={membersById}
              />
            ))}
          </ul>
        )}
      </CardContent>
      {sorted.length > VISIBLE_COUNT && (
        <CardFooter className="justify-center border-t-0 bg-transparent">
          <Button variant="link" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : `View all ${sorted.length} settlements`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
