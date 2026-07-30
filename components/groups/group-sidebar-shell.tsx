"use client";

import { PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { GroupBalanceBadge } from "@/components/groups/dashboard/group-balance-badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreateGroupDialogStore } from "@/lib/data/create-group-dialog-store";
import type { GroupSummary } from "@/lib/data/types";

export function GroupSidebarShell({
  groups,
  ready = true,
  basePath,
  footer,
}: {
  groups: GroupSummary[];
  ready?: boolean;
  basePath: string;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 py-3">
        <span className="truncate text-sm font-bold text-text-primary group-data-[collapsible=icon]:hidden">
          Expense Splitter
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              aria-label="New group"
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                useCreateGroupDialogStore.getState().setOpen(true);
              }}
            >
              <PlusIcon aria-hidden="true" className="shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                New group
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            hidden={state !== "collapsed" || isMobile}
          >
            New group
          </TooltipContent>
        </Tooltip>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs">Your groups</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!ready
                ? Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  ))
                : groups.map((group) => {
                    const href = `${basePath}/${group.id}`;
                    const isActive =
                      pathname === href || pathname?.startsWith(`${href}/`);
                    return (
                      <SidebarMenuItem key={group.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={group.name}
                          size="lg"
                          className="text-sm group-data-[collapsible=icon]:justify-center data-[active=false]:hover:bg-bg-tertiary data-active:bg-accent/15 data-active:hover:bg-accent/25"
                        >
                          <Link
                            href={href}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                          >
                            <UsersIcon className="shrink-0" />
                            <span className="flex flex-1 items-center justify-between gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
                              <span className="truncate">{group.name}</span>
                              <GroupBalanceBadge
                                balance={group.yourBalance}
                                currency={group.currency}
                              />
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
