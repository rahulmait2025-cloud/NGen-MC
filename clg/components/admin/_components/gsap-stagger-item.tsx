'use client';

import { ReactNode } from 'react';

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <div data-gsap-item className={className}>
      {children}
    </div>
  );
}
