import type { Member } from "./types";

// Guest mode has no login and no group designates an owner, so by product
// decision the first member of every group's roster represents "you"
// everywhere: sidebar balance, dashboard, settlement UI.
export function getCurrentMember(members: Member[]): Member | undefined {
  return members[0];
}
