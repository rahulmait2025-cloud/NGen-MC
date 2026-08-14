'use client';

import React from 'react';

export const DashboardPage = React.memo(function DashboardPage({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0 space-y-4 bg-background min-h-screen font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="relative z-10 space-y-8">
        {children}
      </div>
    </div>
  );
});
