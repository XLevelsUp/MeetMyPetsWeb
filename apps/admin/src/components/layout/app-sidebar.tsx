"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Flag,
  LayoutDashboard,
  ScrollText,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { adminNav, admin, copy } from "@/config/admin";
import { StatusIndicator } from "./status-indicator";

/**
 * config/admin.ts keeps icons as strings so it stays a pure data module;
 * the mapping to actual components lives here, next to the only consumer.
 */
const icons: Record<(typeof adminNav)[number]["icon"], LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "badge-check": BadgeCheck,
  flag: Flag,
  store: Store,
  "scroll-text": ScrollText,
  settings: Settings,
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-sm font-bold text-primary-foreground">
            M
          </span>
          <span className="truncate font-heading text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {admin.name}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => {
                const Icon = icons[item.icon];

                if (!item.enabled) {
                  // Future-phase entries: visible IA, explicitly inert.
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        aria-disabled
                        disabled
                        tooltip={`${item.label} — ${copy.comingSoon}`}
                        className="opacity-50"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <StatusIndicator />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
