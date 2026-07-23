"use client";

import { useMemo } from "react";
import { toGroupDetail, toGroupSummary } from "./guest-engine";
import { useGuestStore } from "./guest-store";
import type { GroupDetail, GroupSummary } from "./types";

export function useGuestGroups(): GroupSummary[] {
  const groups = useGuestStore((state) => state.data.groups);
  return useMemo(() => Object.values(groups).map(toGroupSummary), [groups]);
}

export function useGuestGroup(groupId: string): GroupDetail | null {
  const group = useGuestStore((state) => state.data.groups[groupId]);
  return useMemo(() => (group ? toGroupDetail(group) : null), [group]);
}

// True once sessionStorage rehydration *and* first-load seeding have both
// finished, i.e. once `data.groups` reflects real guest data rather than the
// empty pre-hydration default. Callers use this to show a skeleton instead
// of briefly flashing an empty list / not-found state on first mount.
export function useGuestReady(): boolean {
  return useGuestStore((state) => state.hasHydrated && state.hasSeeded);
}
