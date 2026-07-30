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

export async function createGroupAction(
  input: CreateGroupInput,
): Promise<ActionResult<Group>> {
  await requireAuth();
  const data = createGroupInputSchema.parse(input);
  return runAction(() => prismaDataAccess.createGroup(data));
}

export async function updateGroupAction(
  groupId: string,
  input: UpdateGroupInput,
): Promise<ActionResult<Group>> {
  await requireAuth();
  const data = updateGroupInputSchema.parse(input);
  return runAction(() => prismaDataAccess.updateGroup(groupId, data));
}

export async function deleteGroupAction(
  groupId: string,
): Promise<ActionResult<void>> {
  await requireAuth();
  return runAction(() => prismaDataAccess.deleteGroup(groupId));
}

export async function addMemberAction(
  groupId: string,
  input: AddMemberInput,
): Promise<ActionResult<Member>> {
  await requireAuth();
  const data = addMemberInputSchema.parse(input);
  return runAction(() => prismaDataAccess.addMember(groupId, data));
}

export async function removeMemberAction(
  groupId: string,
  memberId: string,
): Promise<ActionResult<void>> {
  await requireAuth();
  return runAction(() => prismaDataAccess.removeMember(groupId, memberId));
}
