"use client";

import { UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { GroupBalanceBadge } from "@/components/groups/group-balance-badge";
import { GuestSignupPrompt } from "@/components/groups/guest-signup-prompt";
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
import { useGuestGroups, useGuestReady } from "@/lib/data/guest-hooks";

export function GroupSidebar() {
  const pathname = usePathname();
  const ready = useGuestReady();
  const groups = useGuestGroups();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <span className="truncate text-base font-bold text-text-primary group-data-[collapsible=icon]:hidden">
          Expense Splitter
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Your groups</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!ready
                ? Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  ))
                : groups.map((group) => {
                    const href = `/groups/${group.id}`;
                    const isActive =
                      pathname === href || pathname?.startsWith(`${href}/`);
                    return (
                      <SidebarMenuItem key={group.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={group.name}
                          size="lg"
                          className="text-base group-data-[collapsible=icon]:justify-center data-[active=false]:hover:bg-bg-tertiary data-active:bg-accent/15 data-active:hover:bg-accent/25"
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
      <SidebarFooter>
        <GuestSignupPrompt />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
