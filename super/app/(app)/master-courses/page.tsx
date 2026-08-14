import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listMasterCoursePillars, getUncategorizedPillar } from '@/lib/services/master-course-pillars';
import { listCoursesForPillar } from '@/lib/services/master-courses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPillarDeleteImpact } from '@/lib/services/master-course-delete';
import { 
  AlertCircle, 
  ArchiveX
} from 'lucide-react';

import { PillarsClient } from './pillars-client';

function MasterCoursesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function MasterCoursesContent() {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const pillars = await listMasterCoursePillars();
  const pillarImpactsList = await Promise.all(
    pillars.map(async (pillar) => {
      const impact = await getPillarDeleteImpact(pillar.pillar_id);
      return [pillar.pillar_id, impact] as const;
    }),
  );
  
  const pillarImpacts = Object.fromEntries(pillarImpactsList);

  const uncategorizedPillar = await getUncategorizedPillar();
  const legacyCourseCount = uncategorizedPillar
    ? (await listCoursesForPillar(uncategorizedPillar.id)).length
    : 0;
  const showLegacyBanner = legacyCourseCount > 0;

  return (
    <div className="space-y-6">

      <PillarsClient 
        initialPillars={pillars} 
        pillarImpacts={pillarImpacts}
      />

      {showLegacyBanner && uncategorizedPillar && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="flex items-start gap-3 py-4">
            <div className="bg-amber-500/10 text-amber-600 rounded-lg p-2">
              <AlertCircle className="size-4" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-sm">Legacy Courses Found</span>
              <p className="text-sm text-muted-foreground mt-0.5">
                Some older courses are currently grouped under the Uncategorized pillar. You can open that pillar, review the courses, move them to the correct pillar, or archive them safely.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 gap-1 border-amber-500/30 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <Link href={`/master-courses/pillars/${uncategorizedPillar.id}`}>
                <ArchiveX className="size-4" />
                Open Uncategorized
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function MasterCoursePillarsPage(): Promise<ReactNode> {
  return (
    <Suspense fallback={<MasterCoursesSkeleton />}>
      <MasterCoursesContent />
    </Suspense>
  );
}