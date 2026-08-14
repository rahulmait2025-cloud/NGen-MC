'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CourseModuleDataRefreshInner() {
  const { refresh } = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get('module');
  const skipFirstRunRef = useRef(true);

  useEffect(() => {
    if (skipFirstRunRef.current) {
      skipFirstRunRef.current = false;
      return;
    }
    refresh();
  }, [moduleParam, refresh]);

  return null;
}

export function CourseModuleDataRefresh() {
  return (
    <Suspense fallback={<div className="h-8 w-32 bg-muted/20 rounded-lg animate-pulse" />}>
      <CourseModuleDataRefreshInner />
    </Suspense>
  );
}
