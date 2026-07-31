"use client";

import { SettingsIcon } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { GroupSidebarShell } from "@/components/groups/group-sidebar-shell";
import { Button } from "@/components/ui/button";
import type { GroupSummary } from "@/lib/data/types";

export function DashboardSidebar({ groups }: { groups: GroupSummary[] }) {
  return (
    <GroupSidebarShell
      groups={groups}
      basePath="/dashboard"
      footer={
        <>
          <Button asChild variant="outline" className="w-full">
            <Link href="/account">
              <SettingsIcon aria-hidden="true" />
              Settings
            </Link>
          </Button>
          <SignOutButton />
        </>
      }
    />
  );
}
