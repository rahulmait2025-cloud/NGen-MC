import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listMasterCourses } from '@/lib/services/master-courses';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { SyncClient } from './sync-client';

export default async function TpSyncPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  // Pre-fetch courses for display (no auto-sync on page load)
  const courses = await listMasterCourses();
  
  // Sync data is null until user clicks "Sync All" button
  const folderData = null;
  const assetData = null;
  const fetchError = null;
  
  const syntheticBucket = null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground">
            <Link href="/master-courses">
              <ArrowLeft className="size-4 mr-1" /> Back to Master Courses
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-none">
            Sync TPStreams Content
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Reconcile content created directly in TPStreams dashboard with SuperAdmin.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <RefreshCw className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">What does sync do?</p>
              <ul className="text-blue-700 mt-1 space-y-1">
                <li>• Lists all folders and assets from TPStreams API</li>
                <li>• Matches them with local database records</li>
                <li>• Creates missing local representations</li>
                <li>• Updates processing status and metadata</li>
                <li>• Shows root-level videos under synthetic bucket</li>
              </ul>
              <p className="text-blue-700 mt-2 font-medium">
                ⚠️ Sync does NOT create new TPStreams folders. Only Master Course creation does that.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client-side sync interface */}
      <SyncClient
        initialCourses={courses}
        initialFolderData={folderData}
        initialAssetData={assetData}
        initialSyntheticBucket={syntheticBucket}
        initialError={fetchError}
      />
    </div>
  );
}
