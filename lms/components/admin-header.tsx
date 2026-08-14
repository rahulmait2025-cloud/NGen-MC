"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth/logout";

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "A";
}

export function AdminHeader({
  tenantName,
  userFullName,
  userEmail,
}: {
  tenantName?: string;
  userFullName?: string | null;
  userEmail?: string | null;
}) {
  return (
    <header suppressHydrationWarning className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/10 bg-background/80 backdrop-blur-2xl px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-extrabold tracking-tight text-foreground leading-none">
            {tenantName || "College Administration"}
          </span>
          <span className="text-xs text-muted-foreground font-medium mt-1">
            Analytics & Operations Command Center
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-[background-color] duration-200" />

        <div className="h-4 w-px bg-foreground/10 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-8 hover:bg-foreground/10 pl-1 pr-2.5 gap-2 transition-[background-color] duration-200 cursor-pointer"
            >
              <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary text-primary-foreground text-xs font-extrabold">
                  {getInitials(userFullName, userEmail)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-foreground hidden sm:inline">
                {userFullName?.split(" ")[0] || "Admin"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-popover border-border/10 text-popover-foreground rounded-xl">
            <DropdownMenuItem className="text-xs text-muted-foreground p-2 pointer-events-none">
              {userEmail || "admin@college.edu"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-foreground/10" />
            <DropdownMenuItem
              onClick={async () => await logout("/login")}
              className="text-destructive focus:text-destructive/80 focus:bg-destructive/10 gap-2 rounded-lg cursor-pointer font-bold text-xs"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
