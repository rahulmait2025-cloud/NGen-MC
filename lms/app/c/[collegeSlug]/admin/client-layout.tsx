"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeader } from "@/components/admin-header";
import { Footer } from "@/components/footer";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function AdminClientLayout({
  children,
  collegeSlug,
  tenantName,
  userFullName,
  userEmail,
}: {
  children: React.ReactNode;
  collegeSlug: string;
  tenantName?: string;
  userFullName?: string | null;
  userEmail?: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const lenisInstance = new Lenis({
      wrapper: container,
      content: content,
      autoRaf: true,
    });

    return () => {
      lenisInstance.destroy();
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AdminSidebar collegeSlug={collegeSlug} tenantName={tenantName} />
      <SidebarInset className="flex-1 min-w-0 bg-background">
        <div className="flex min-h-screen flex-col">
          <AdminHeader
            tenantName={tenantName}
            userFullName={userFullName}
            userEmail={userEmail}
          />
          <main ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto bg-background text-foreground">
            <div ref={contentRef} className="flex flex-1 flex-col min-h-0 w-full">
              <div className="flex-1 p-4 lg:p-8">{children}</div>
              <Footer tenantName={tenantName} collegeSlug={collegeSlug} />
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
