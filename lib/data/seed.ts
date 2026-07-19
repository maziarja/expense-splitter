import sampleData from "../../data/sample-groups.json";
import type { CurrencyCode } from "../splits/constants";
import type { GuestData, GuestGroup } from "./guest-engine";
import type { Expense, Member, Settlement } from "./types";

// Matches the SampleData shape documented in data/README.md.
type RawMember = {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
};

type RawGroup = {
  id: string;
  name: string;
  description: string;
  currency: string;
  createdAt: string;
  members: RawMember[];
  expenses: Expense[];
  settlements: Settlement[];
};

function toMember(raw: RawMember, groupId: string): Member {
  return {
    id: raw.id,
    groupId,
    userId: null,
    name: raw.name,
    email: raw.email ?? null,
    avatarColor: raw.avatarColor,
    deletedAt: null,
  };
}

function toGuestGroup(raw: RawGroup): GuestGroup {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    currency: raw.currency as CurrencyCode,
    createdAt: raw.createdAt,
    members: raw.members.map((member) => toMember(member, raw.id)),
    expenses: raw.expenses,
    settlements: raw.settlements,
  };
}

export function buildSeedData(): GuestData {
  const groups: Record<string, GuestGroup> = {};
  for (const raw of sampleData.groups as unknown as RawGroup[]) {
    groups[raw.id] = toGuestGroup(raw);
  }
  return { groups };
}
