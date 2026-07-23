"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DataAccess } from "./data-access";
import {
  addMember as addMemberInData,
  createExpense as createExpenseInData,
  createGroup as createGroupInData,
  createSettlement as createSettlementInData,
  deleteExpense as deleteExpenseInData,
  deleteGroup as deleteGroupInData,
  emptyGuestData,
  removeMember as removeMemberInData,
  requireGroup,
  toGroupDetail,
  toGroupSummary,
  updateExpense as updateExpenseInData,
  updateGroup as updateGroupInData,
  type GuestData,
} from "./guest-engine";
import { buildSeedData } from "./seed";

// `window` is undefined during SSR/build; fall back to a no-op storage so
// importing this module never crashes outside the browser. Guest data is
// session-scoped by design (spec: "not persisted across visits unless they
// sign up"), so sessionStorage rather than localStorage.
const guestStorage = createJSONStorage<GuestStoreState>(() => ({
  getItem: (name) =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof window !== "undefined")
      window.sessionStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(name);
  },
}));

type GuestStoreState = {
  data: GuestData;
  hasSeeded: boolean;
  hasHydrated: boolean;
};

export const useGuestStore = create<GuestStoreState>()(
  persist(
    (): GuestStoreState => ({
      data: emptyGuestData,
      hasSeeded: false,
      hasHydrated: false,
    }),
    {
      name: "expense-splitter-guest",
      storage: guestStorage,
      // sessionStorage reads are synchronous, so without this the persist
      // middleware rehydrates the store synchronously on the client at
      // module-eval time — before React's first render — while SSR always
      // renders with the factory default (no sessionStorage on the server).
      // That mismatch between server and first-client-paint state trips a
      // real hydration error. Rehydrating manually inside a mount effect
      // (see app/groups/layout.tsx) instead means the first client render
      // matches SSR exactly, and real data arrives one tick later via a
      // normal state update, not a hydration diff.
      skipHydration: true,
    },
  ),
);

function currentData(): GuestData {
  const state = useGuestStore.getState();
  if (!state.hasSeeded) {
    const data = buildSeedData();
    useGuestStore.setState({ data, hasSeeded: true });
    return data;
  }
  return state.data;
}

function commit(data: GuestData): void {
  useGuestStore.setState({ data });
}

export const guestDataAccess: DataAccess = {
  async listGroups() {
    return Object.values(currentData().groups).map(toGroupSummary);
  },

  async getGroup(groupId) {
    const group = currentData().groups[groupId];
    return group ? toGroupDetail(group) : null;
  },

  async createGroup(input) {
    const { data, group } = createGroupInData(currentData(), input);
    commit(data);
    return group;
  },

  async updateGroup(groupId, input) {
    const { data, group } = updateGroupInData(currentData(), groupId, input);
    commit(data);
    return group;
  },

  async deleteGroup(groupId) {
    commit(deleteGroupInData(currentData(), groupId));
  },

  async addMember(groupId, input) {
    const { data, member } = addMemberInData(currentData(), groupId, input);
    commit(data);
    return member;
  },

  async removeMember(groupId, memberId) {
    commit(removeMemberInData(currentData(), groupId, memberId));
  },

  async listExpenses(groupId) {
    return requireGroup(currentData(), groupId).expenses;
  },

  async getExpense(groupId, expenseId) {
    const group = requireGroup(currentData(), groupId);
    return group.expenses.find((e) => e.id === expenseId) ?? null;
  },

  async createExpense(groupId, input) {
    const { data, expense } = createExpenseInData(
      currentData(),
      groupId,
      input,
    );
    commit(data);
    return expense;
  },

  async updateExpense(groupId, expenseId, input) {
    const { data, expense } = updateExpenseInData(
      currentData(),
      groupId,
      expenseId,
      input,
    );
    commit(data);
    return expense;
  },

  async deleteExpense(groupId, expenseId) {
    commit(deleteExpenseInData(currentData(), groupId, expenseId));
  },

  async listSettlements(groupId) {
    return requireGroup(currentData(), groupId).settlements;
  },

  async createSettlement(groupId, input) {
    const { data, settlement } = createSettlementInData(
      currentData(),
      groupId,
      input,
    );
    commit(data);
    return settlement;
  },
};
