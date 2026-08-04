"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filtersToQueryString,
  hasActiveFilters,
  type ExpenseFilterState,
} from "@/lib/data/expense-filters";
import type { Category, Member } from "@/lib/data/types";
import { PREDEFINED_CATEGORIES } from "@/lib/splits/constants";

const ALL_CATEGORIES = "__all__";
const ANYONE = "__anyone__";

export function ExpenseFilters({
  filters,
  activeMembers,
  categories,
  membersById,
}: {
  filters: ExpenseFilterState;
  activeMembers: Member[];
  categories: Category[];
  membersById: Map<string, Member>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: ExpenseFilterState) {
    const qs = filtersToQueryString(next);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // A filter can still reference a category/member that's since been
  // deleted (deleting either is unconditional and non-blocking by design —
  // see manage-categories-dialog.tsx / remove-member-button.tsx). Filtering
  // itself still works fine (it's a plain string/id comparison against data
  // already on each expense), but without this the Select would show blank
  // rather than the name that's actually still applied. This is a static,
  // never-replaced fallback item (the value is permanently gone from the
  // active list), unlike the add-expense-form fallback that caused a real
  // bug — that one got swapped for a differently-keyed "real" item once
  // freshly-created data arrived; nothing like that happens here.
  const categoryKnown =
    !filters.category ||
    (PREDEFINED_CATEGORIES as readonly string[]).includes(filters.category) ||
    categories.some((c) => c.name === filters.category);
  const paidByKnown =
    !filters.paidBy || activeMembers.some((m) => m.id === filters.paidBy);
  const includesKnown =
    !filters.includesMember ||
    activeMembers.some((m) => m.id === filters.includesMember);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field className="w-auto min-w-36">
        <FieldLabel htmlFor="filter-category">Category</FieldLabel>
        <Select
          value={filters.category ?? ALL_CATEGORIES}
          onValueChange={(v) =>
            navigate({
              ...filters,
              category: v === ALL_CATEGORIES ? null : v,
            })
          }
        >
          <SelectTrigger id="filter-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            <SelectSeparator />
            {PREDEFINED_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
            {categories.length > 0 && <SelectSeparator />}
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
            {!categoryKnown && filters.category && (
              <SelectItem value={filters.category}>
                {filters.category}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-auto min-w-32">
        <FieldLabel htmlFor="filter-paid-by">Paid by</FieldLabel>
        <Select
          value={filters.paidBy ?? ANYONE}
          onValueChange={(v) =>
            navigate({ ...filters, paidBy: v === ANYONE ? null : v })
          }
        >
          <SelectTrigger id="filter-paid-by" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANYONE}>Anyone</SelectItem>
            {activeMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
            {!paidByKnown && filters.paidBy && (
              <SelectItem value={filters.paidBy}>
                {membersById.get(filters.paidBy)?.name ?? "Removed member"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-auto min-w-32">
        <FieldLabel htmlFor="filter-includes">Includes</FieldLabel>
        <Select
          value={filters.includesMember ?? ANYONE}
          onValueChange={(v) =>
            navigate({ ...filters, includesMember: v === ANYONE ? null : v })
          }
        >
          <SelectTrigger id="filter-includes" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANYONE}>Anyone</SelectItem>
            {activeMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
            {!includesKnown && filters.includesMember && (
              <SelectItem value={filters.includesMember}>
                {membersById.get(filters.includesMember)?.name ??
                  "Removed member"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-auto min-w-32">
        <FieldLabel htmlFor="filter-date-from">From</FieldLabel>
        <Input
          id="filter-date-from"
          type="date"
          value={filters.dateFrom ?? ""}
          max={filters.dateTo ?? undefined}
          onChange={(e) =>
            navigate({ ...filters, dateFrom: e.target.value || null })
          }
        />
      </Field>

      <Field className="w-auto min-w-32">
        <FieldLabel htmlFor="filter-date-to">To</FieldLabel>
        <Input
          id="filter-date-to"
          type="date"
          value={filters.dateTo ?? ""}
          min={filters.dateFrom ?? undefined}
          onChange={(e) =>
            navigate({ ...filters, dateTo: e.target.value || null })
          }
        />
      </Field>

      {hasActiveFilters(filters) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname, { scroll: false })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
