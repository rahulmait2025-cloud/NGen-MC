'use client';

import React, { useState, useCallback } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ActionDrawer } from '@/components/shared/action-drawer';
import { OpenDrawerProvider } from '@/contexts/open-drawer-context';
import { PageTransition } from '@/components/_animations/page-transition';
import { EntranceAnimation } from '@/components/_animations/entrance-animation';

export function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <EntranceAnimation>
      <SidebarProvider defaultOpen={true}>
        <OpenDrawerProvider openDrawer={openDrawer}>
          <Sidebar />
          <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
            <div className="flex min-h-svh min-w-0 flex-col md:min-h-0">
              <div className="px-4 sm:px-5 md:px-6 pt-3">
                <Header />
              </div>
              <div className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden px-4 sm:px-5 md:px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pb-12 md:pb-14">
                <PageTransition>{children}</PageTransition>
              </div>
            </div>
          </SidebarInset>
          <ActionDrawer
            open={drawerOpen}
            onClose={closeDrawer}
          />
        </OpenDrawerProvider>
      </SidebarProvider>
    </EntranceAnimation>
  );
}
