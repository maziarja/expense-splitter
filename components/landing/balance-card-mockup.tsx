"use client";

import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SettledCelebration } from "@/components/landing/settled-celebration";

const members = [
  { initials: "AC", color: "#6366f1" },
  { initials: "JP", color: "#f59e0b" },
  { initials: "SR", color: "#ec4899" },
];

export function BalanceCardMockup() {
  const [settled, setSettled] = useState(false);

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <AvatarGroup>
          {members.map((member) => (
            <Avatar key={member.initials} size="sm">
              <AvatarFallback
                className="text-white"
                style={{ backgroundColor: member.color }}
              >
                {member.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <p className="text-xs text-text-tertiary">Trip to Japan · 4 members</p>
        <CardTitle className="text-lg font-bold text-text-primary">
          Group balance
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {settled ? (
          <SettledCelebration />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md bg-owed-subtle px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <ArrowUpRight className="size-4 text-owed" aria-hidden="true" />
                Jordan owes you
              </span>
              <span className="font-mono text-xl font-medium text-owed tabular-nums">
                $22.50
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-owe-subtle px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <ArrowDownRight
                  className="size-4 text-owe"
                  aria-hidden="true"
                />
                You owe Alex
              </span>
              <span className="font-mono text-xl font-medium text-owe tabular-nums">
                $45.00
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-tertiary">
                Your net balance
              </span>
              <span className="font-mono text-sm font-medium text-owe tabular-nums">
                -$22.50
              </span>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        {settled ? (
          <span className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-success">
            <Check className="size-4" aria-hidden="true" />
            Settled
          </span>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setSettled(true)}
          >
            Settle up
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
