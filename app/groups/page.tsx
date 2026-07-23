"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { guestDataAccess } from "@/lib/data/guest-store";
import type { GroupSummary } from "@/lib/data/types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);

  useEffect(() => {
    guestDataAccess.listGroups().then(setGroups);
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center bg-bg-primary p-8">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-text-primary">Your groups</h1>
        <p className="mt-1 text-text-secondary">
          The full guest dashboard is coming in the next step. Here&apos;s proof
          your sample data is seeded and ready:
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {groups === null && <p className="text-text-tertiary">Loading…</p>}
          {groups?.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between">
                <span className="font-medium text-text-primary">
                  {group.name}
                </span>
                <span className="font-mono text-sm text-text-tertiary tabular-nums">
                  {group.memberCount} members · {group.expenseCount} expenses
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
        <Link href="/" className="mt-6 block text-sm text-text-tertiary">
          ← Back home
        </Link>
      </div>
    </main>
  );
}
