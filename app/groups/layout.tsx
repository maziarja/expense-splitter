"use client";

import { HomeIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { GroupSidebar } from "@/components/groups/group-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { guestDataAccess, useGuestStore } from "@/lib/data/guest-store";

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    void (async () => {
      await useGuestStore.persist.rehydrate();
      useGuestStore.setState({ hasHydrated: true });
      void guestDataAccess.listGroups();
    })();
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <GroupSidebar />
        <CreateGroupDialog />
        <SidebarInset>
          <header className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
            <SidebarTrigger />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="ml-auto gap-1.5"
            >
              <Link href="/">
                <HomeIcon aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
