"use client";

import {
  Bell,
  CreditCard,
  Crown,
  Home,
  Library,
  Settings2,
  Video,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";


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
        <SidebarFooter>
          <Card className="mx-2 mb-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Unlock advanced features and unlimited recordings
              </p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <span>Unlimited screen recordings</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <span>4K quality export</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <span>Advanced editing tools</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                  <span>Priority support</span>
                </div>
              </div>
              <div className="text-center mb-3">
                <span className="text-lg font-bold">$10</span>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>
              <Button size="sm" className="w-full">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
