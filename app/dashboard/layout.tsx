import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CreateGroupDialog } from "@/components/groups/group/create-group-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireAuth } from "@/lib/auth";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = [parts[0]?.[0], parts.at(-1)?.[0]]
    .filter(Boolean)
    .join("");
  return initials.toUpperCase() || "?";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
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
              <div className="ml-auto flex items-center gap-4">
                <ThemeToggle />
                <div className="flex items-center gap-2 border-l border-border-subtle pl-4">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-accent-subtle font-semibold text-accent">
                      {initialsFor(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col leading-tight sm:flex">
                    <span className="text-sm font-semibold text-text-primary">
                      {session.user.name}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {session.user.email}
                    </span>
                  </div>
                </div>
              </div>
            </header>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </DashboardDataProvider>
  );
}
