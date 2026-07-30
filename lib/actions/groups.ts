"use server";

import { requireAuth } from "@/lib/auth";
import {
  addMemberInputSchema,
  createGroupInputSchema,
  updateGroupInputSchema,
} from "@/lib/data/data-access";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";
import type {
  AddMemberInput,
  CreateGroupInput,
  Group,
  Member,
  UpdateGroupInput,
} from "@/lib/data/types";
import { runAction, type ActionResult } from "./action-result";
import { revalidateDashboard } from "./revalidate-dashboard";

export async function createGroupAction(
  input: CreateGroupInput,
): Promise<ActionResult<Group>> {
  await requireAuth();
  const data = createGroupInputSchema.parse(input);
  const result = await runAction(() => prismaDataAccess.createGroup(data));
  if (result.ok) revalidateDashboard();
  return result;
}

export async function updateGroupAction(
  groupId: string,
  input: UpdateGroupInput,
): Promise<ActionResult<Group>> {
  await requireAuth();
  const data = updateGroupInputSchema.parse(input);
  const result = await runAction(() =>
    prismaDataAccess.updateGroup(groupId, data),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}

export async function deleteGroupAction(
  groupId: string,
): Promise<ActionResult<void>> {
  await requireAuth();
  const result = await runAction(() => prismaDataAccess.deleteGroup(groupId));
  if (result.ok) revalidateDashboard();
  return result;
}

export async function addMemberAction(
  groupId: string,
  input: AddMemberInput,
): Promise<ActionResult<Member>> {
  await requireAuth();
  const data = addMemberInputSchema.parse(input);
  const result = await runAction(() =>
    prismaDataAccess.addMember(groupId, data),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}

export async function removeMemberAction(
  groupId: string,
  memberId: string,
): Promise<ActionResult<void>> {
  await requireAuth();
  const result = await runAction(() =>
    prismaDataAccess.removeMember(groupId, memberId),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}
