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

/**
 * Configuration for segments that don't have their own pages.
 * - 'disabled': Shows the label but makes it non-clickable.
 */
const DISABLED_ROUTES = ['bundles', 'master-courses', 'free-courses', 'variants', 'bootcamps'];

const SEGMENT_LABELS: Record<string, string> = {
  'youtube-import': 'YouTube Import',
  'tpstreams-upload': 'Premium Lectures',
  bootcamps: 'Paid Course Builder',
  'paid-course-builder': 'Paid Course Builder',
  bootcamp: 'Paid Course Builder',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter((segment) => segment !== '');
  
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="size-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathSegments.length > 0 && <BreadcrumbSeparator />}

        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
          const isLast = index === pathSegments.length - 1;
          
          const isDisabled = DISABLED_ROUTES.includes(segment.toLowerCase());

          const label =
            SEGMENT_LABELS[segment] ??
            segment
              .split('-')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast || isDisabled ? (
                  <BreadcrumbPage className={isDisabled ? "text-muted-foreground/60 cursor-default" : ""}>
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
