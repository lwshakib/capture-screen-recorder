"use client";

import {
  Bell,
  CreditCard,
  Crown,
  Download,
  Home,
  Library,
  Settings2,
  Video,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/layout/nav-main";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";


import { useTheme } from "next-themes";
import Link from "next/link";
import { LogoIcon } from "./logo";

const navMain = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
    isActive: true,
  },
  {
    title: "Library",
    url: "/library",
    icon: Library,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
  },
  {
    title: "Get App",
    url: "/get-app",
    icon: Download,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { resolvedTheme } = useTheme();

  const { state } = useSidebar();

  const logoSrc =
    resolvedTheme === "dark" ? "/dark_logo.svg" : "/light_logo.svg";


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link
          href={`/`}
          className="flex items-center gap-3  py-3 cursor-pointer hover:bg-accent/50 rounded-md transition-colors"
        >
          <div className="flex items-center gap-2">
          <LogoIcon className="size-8"/>
            {state !== "collapsed" && (
              <span className="text-lg font-bold text-primary">Capture</span>
            )}
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      {state !== "collapsed" && (
        <SidebarFooter className="p-4">
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Crown className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Pro Plan</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Unlock AI features and unlimited 4K recordings for <span className="font-bold text-foreground">$10/mo</span>.
            </p>
            <Button size="sm" className="w-full h-8 rounded-lg text-xs font-medium" asChild>
              <Link href="/billing">Upgrade Now</Link>
            </Button>
          </div>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}

