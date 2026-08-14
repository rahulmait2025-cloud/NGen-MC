"use client";

import React, { useEffect } from 'react';
import { useTenant } from "@/providers/tenant-provider";
import type { FeatureMap } from "@/lib/features/feature-access";
import type { TenantModuleAccessMap } from "@/lib/modules/module-access";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EntranceAnimation } from "@/components/_animations/entrance-animation";
import type { MasterCoursePillarsRow } from "@/types/database";

const EMPTY_PILLARS: MasterCoursePillarsRow[] = [];

interface ProtectedDataProviderProps {
  children: React.ReactNode;
  initialFeatures: FeatureMap;
  initialModuleAccess: TenantModuleAccessMap;
  assignedPillars?: MasterCoursePillarsRow[];
}

export function ProtectedDataProvider({
  children,
  initialFeatures,
  initialModuleAccess,
  assignedPillars = EMPTY_PILLARS,
}: ProtectedDataProviderProps) {
  const { setFeatures, setModuleAccess } = useTenant();

  useEffect(() => {
    setFeatures(initialFeatures);
    setModuleAccess(initialModuleAccess);
  }, [initialFeatures, initialModuleAccess, setFeatures, setModuleAccess]);

  return (
    <EntranceAnimation>
      <SidebarProvider>
          <Sidebar aria-label="Admin Navigation" assignedPillars={assignedPillars} />
          <MobileSidebar assignedPillars={assignedPillars} />
          <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
            <div className="flex min-h-screen min-w-0 flex-col">
              <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 lg:px-6">
                <SidebarTrigger className="shrink-0 size-8 rounded-xl hover:bg-primary/10 transition-[background-color] duration-200 active:scale-95" />
                <div className="min-w-0 flex-1">
                  <Header />
                </div>
              </header>
              <div className="custom-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
                <Breadcrumbs />
                {children}
              </div>
            </div>
          </SidebarInset>
      </SidebarProvider>
    </EntranceAnimation>
  );
}
