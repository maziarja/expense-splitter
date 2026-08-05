import { HomeIcon } from "lucide-react";
import Link from "next/link";

import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CreateGroupDialog } from "@/components/groups/group/create-group-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireAuth } from "@/lib/auth";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const groups = await prismaDataAccess.listGroups();

  return (
    <DashboardDataProvider>
      <TooltipProvider>
        <SidebarProvider>
          <DashboardSidebar groups={groups} />
          <CreateGroupDialog basePath="/dashboard" />
          <SidebarInset>
            <header className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
              <SidebarTrigger />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5"
              >
                <Link href="/dashboard">
                  <HomeIcon aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
              <ThemeToggle />
            </header>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </DashboardDataProvider>
  );
}
