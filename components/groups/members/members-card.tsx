import { AddMemberDialog } from "@/components/groups/members/add-member-dialog";
import { RemoveMemberButton } from "@/components/groups/members/remove-member-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Member } from "@/lib/data/types";

export function MembersCard({
  groupId,
  members,
  youId,
}: {
  groupId: string;
  members: Member[];
  youId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-text-primary md:text-lg">
          Members
        </CardTitle>
        <CardAction>
          <AddMemberDialog groupId={groupId} activeMembers={members} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar>
                  <AvatarFallback
                    className="text-white"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-text-primary md:text-sm">
                  {member.name}
                  {member.id === youId && (
                    <span className="text-text-tertiary"> (You)</span>
                  )}
                </span>
              </span>
              {member.id !== youId && (
                <RemoveMemberButton groupId={groupId} member={member} />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
