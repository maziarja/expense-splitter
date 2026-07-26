"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Member } from "@/lib/data/types";
import type { CurrencyCode } from "@/lib/splits/constants";
import { formatCurrency } from "@/lib/splits/currency";
import type { SplitType } from "@/lib/splits/schema";
import { cn } from "@/lib/utils";

export function ExpenseSplitFields({
  splitType,
  onSplitTypeChange,
  activeMembers,
  participantIds,
  toggleParticipant,
  currency,
  exactAmounts,
  onExactAmountChange,
  percentages,
  onPercentageChange,
  shareCounts,
  onShareCountChange,
  splitAmountByMember,
  splitSectionError,
}: {
  splitType: SplitType;
  onSplitTypeChange: (next: SplitType) => void;
  activeMembers: Member[];
  participantIds: string[];
  toggleParticipant: (memberId: string) => void;
  currency: CurrencyCode;
  exactAmounts: Record<string, string>;
  onExactAmountChange: (memberId: string, value: string) => void;
  percentages: Record<string, string>;
  onPercentageChange: (memberId: string, value: string) => void;
  shareCounts: Record<string, string>;
  onShareCountChange: (memberId: string, value: string) => void;
  splitAmountByMember: Map<string, number>;
  splitSectionError: string | null;
}) {
  return (
    <Field>
      <FieldLabel>Split</FieldLabel>
      <Tabs
        value={splitType}
        onValueChange={(v) => onSplitTypeChange(v as SplitType)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="equal">Equal</TabsTrigger>
          <TabsTrigger value="exact">Exact</TabsTrigger>
          <TabsTrigger value="percentage">Percent</TabsTrigger>
          <TabsTrigger value="shares">Shares</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-2 flex flex-col gap-2">
        {activeMembers.map((member) => {
          const included = participantIds.includes(member.id);
          return (
            <div key={member.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleParticipant(member.id)}
                className={cn(
                  "flex flex-1 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                  included
                    ? "border-accent bg-accent-subtle text-text-primary"
                    : "border-border text-text-tertiary hover:bg-bg-tertiary",
                )}
              >
                <span
                  className="flex size-4 items-center justify-center rounded-full text-[9px] font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                {member.name}
              </button>

              {included && (
                <div
                  key={splitType}
                  className="flex h-8 w-32 shrink-0 animate-in items-center justify-end gap-1.5 duration-200 fade-in-0"
                >
                  {splitType === "equal" && (
                    <span
                      className={cn(
                        "text-right font-mono text-xs tabular-nums",
                        splitAmountByMember.has(member.id)
                          ? "text-text-secondary"
                          : "text-text-tertiary/60",
                      )}
                    >
                      {formatCurrency(
                        splitAmountByMember.get(member.id) ?? 0,
                        currency,
                      )}
                    </span>
                  )}
                  {splitType === "exact" && (
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={exactAmounts[member.id] ?? ""}
                      onChange={(e) =>
                        onExactAmountChange(member.id, e.target.value)
                      }
                      className="text-right"
                    />
                  )}
                  {splitType === "percentage" && (
                    <>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={percentages[member.id] ?? ""}
                        onChange={(e) =>
                          onPercentageChange(member.id, e.target.value)
                        }
                        className="w-14 text-right"
                      />
                      <span className="text-xs text-text-tertiary">%</span>
                      <span className="font-mono text-xs text-text-secondary tabular-nums">
                        {splitAmountByMember.has(member.id)
                          ? formatCurrency(
                              splitAmountByMember.get(member.id)!,
                              currency,
                            )
                          : ""}
                      </span>
                    </>
                  )}
                  {splitType === "shares" && (
                    <>
                      <Input
                        inputMode="decimal"
                        placeholder="1"
                        value={shareCounts[member.id] ?? ""}
                        onChange={(e) =>
                          onShareCountChange(member.id, e.target.value)
                        }
                        className="w-14 text-right"
                      />
                      <span className="font-mono text-xs text-text-secondary tabular-nums">
                        {splitAmountByMember.has(member.id)
                          ? formatCurrency(
                              splitAmountByMember.get(member.id)!,
                              currency,
                            )
                          : ""}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {splitSectionError && <FieldError>{splitSectionError}</FieldError>}
    </Field>
  );
}
