'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DsaSheetBuilder } from './_components/dsa-sheet-builder';
import { DsaAnalytics } from './_components/dsa-analytics';
import * as actions from './actions';
import type { DsaSheetWithData, DsaAnalytics as DsaAnalyticsType, DsaDraftStatus } from '@/types/dsa';
import { RefreshCw, Upload, Eye, AlertCircle, ArrowLeft, CheckCircle2, Clock, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { exportSheetToExcel } from '@/lib/utils/dsa-excel-export';

interface DsaSheetPageClientProps {
  sheetId: string;
}

export default function DsaSheetPageClient({ sheetId }: DsaSheetPageClientProps) {
  const [sheet, setSheet] = useState<DsaSheetWithData | null>(null);
  const [analytics, setAnalytics] = useState<DsaAnalyticsType | null>(null);
  const [draftStatus, setDraftStatus] = useState<DsaDraftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadSheet = useCallback(async () => {
    try {
      const sheetData = await actions.fetchSheetData(sheetId);
      setSheet(sheetData);

      const [analyticsData, draftData] = await Promise.all([
        actions.fetchAnalytics(sheetId),
        actions.fetchDraftStatus(sheetId),
      ]);
      setAnalytics(analyticsData);
      setDraftStatus(draftData);
    } catch {
      toast.error('Failed to load DSA sheet');
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const result = await actions.publishSheet(sheetId);
      toast.success(
        `Published ${result.categoriesPublished} categories and ${result.problemsPublished} problems`
      );
      await loadSheet();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }, [sheetId, loadSheet]);

  const publishState = getPublishState(sheet, draftStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 mb-2 text-muted-foreground hover:text-foreground">
          <Link href="/sheets">
            <ArrowLeft className="size-4" />
            Back to Sheets
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {sheet?.title || 'DSA Pattern Sheet'}
            </h1>
            <Badge variant="outline" className={publishState.className}>
              {publishState.icon}
              {publishState.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage categories, problems and track completion statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSheet}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          {sheet && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportSheetToExcel(sheet);
                toast.success(`Exported "${sheet.title}" to Excel`);
              }}
              className="gap-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              <FileSpreadsheet className="size-4" />
              Download Excel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing}
            className="gap-2"
          >
            {publishing ? (
              <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Publish to Students
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder" className="gap-2">
            <Upload className="size-4" />
            Sheet Builder
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <Eye className="size-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <DsaSheetBuilder
            sheet={sheet}
            onRefresh={loadSheet}
            hasDraft={draftStatus?.hasDraft ?? false}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <DsaAnalytics analytics={analytics!} onRefresh={loadSheet} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getPublishState(
  sheet: DsaSheetWithData | null,
  draftStatus: DsaDraftStatus | null,
): { label: string; icon: React.ReactNode; className: string } {
  if (!sheet?.published_at) {
    return {
      label: 'Not published',
      icon: <Clock className="size-3" />,
      className: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground gap-1',
    };
  }

  if (draftStatus?.hasDraft) {
    return {
      label: 'Draft changes',
      icon: <AlertCircle className="size-3" />,
      className: 'border-amber-500/50 bg-amber-500/5 text-amber-700 gap-1 dark:text-amber-400',
    };
  }

  return {
    label: 'Published',
    icon: <CheckCircle2 className="size-3" />,
    className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 gap-1 dark:text-emerald-400',
  };
}
