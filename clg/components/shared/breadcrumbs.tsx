'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export function Breadcrumbs() {
  const pathname = usePathname();
  const allSegments = pathname.split('/').filter((segment) => segment !== '');
  
  // Find 'admin' index - this is our marker for the functional start of the app
  const adminIndex = allSegments.findIndex(s => s.toLowerCase() === 'admin');
  
  // Only use segments AFTER 'admin'
  const rawFunctionalSegments = adminIndex !== -1 ? allSegments.slice(adminIndex + 1) : [];
  
  // Ensure 'dashboard' is the first segment in the functional trail
  let functionalSegments = rawFunctionalSegments;
  if (functionalSegments[0]?.toLowerCase() !== 'dashboard') {
    functionalSegments = ['dashboard', ...functionalSegments];
  }

  // Common prefix for all admin links: /c/[slug]/admin
  const adminBaseSegments = allSegments.slice(0, adminIndex + 1);
  const adminBasePath = `/${adminBaseSegments.join('/')}`;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`${adminBasePath}/dashboard`} className="flex items-center gap-1">
              <Home className="size-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        <BreadcrumbSeparator />

        {functionalSegments.map((segment, index) => {
          const isLast = index === functionalSegments.length - 1;
          
          // Reconstruct the link. 
          // If the segment is our prepended 'dashboard', the href is adminBasePath/dashboard
          // Otherwise, we reconstruct from the original segments or append to adminBasePath
          let href = `${adminBasePath}/dashboard`;
          if (segment.toLowerCase() !== 'dashboard') {
             // For sub-pages, find the segment in the original allSegments to get the full path
             // or just append the segment to the previous path
             const originalIndex = allSegments.findIndex((s, i) => i > adminIndex && s.toLowerCase() === segment.toLowerCase());
             if (originalIndex !== -1) {
               href = `/${allSegments.slice(0, originalIndex + 1).join('/')}`;
             } else {
               // Fallback if segment isn't in URL (unlikely but safe)
               href = `${adminBasePath}/${segment}`;
             }
          }
          
          const label = segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
