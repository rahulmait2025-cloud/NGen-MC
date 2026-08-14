'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  BookOpen,
  ChevronRight,
  FileCode,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudentInSheet, unenrollStudentFromSheet } from '../actions';
import { DsaIntroBanner } from './dsa-intro-banner';

interface SheetItem {
  id: string;
  title: string;
  slug: string;
  description_md: string;
  is_active: boolean;
  isPublished: boolean;
  isEnrolled: boolean;
  categoriesCount: number;
  problemsCount: number;
  completedCount: number;
}

interface Props {
  sheets: SheetItem[];
  collegeSlug: string;
  studentId: string;
  readme?: string;
}

function sheetHref(collegeSlug: string, sheet: Pick<SheetItem, 'slug' | 'title' | 'id'>) {
  const slug =
    sheet.slug?.trim() ||
    sheet.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
    sheet.id;
  return `/c/${collegeSlug}/student/sheets/${slug}`;
}

export function DsaSheetsLandingClient({ sheets, collegeSlug, studentId: _studentId, readme }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [localSheets, setLocalSheets] = useState(sheets);
  const router = useRouter();

  useEffect(() => {
    setLocalSheets(sheets);
  }, [sheets]);

  const filteredSheets = localSheets.filter((sheet) =>
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEnroll = (sheetId: string, sheetTitle: string) => {
    const sheet = localSheets.find((s) => s.id === sheetId);
    setEnrollingId(sheetId);
    startTransition(async () => {
      try {
        await enrollStudentInSheet(collegeSlug, sheetId);
        toast.success(`Successfully enrolled in "${sheetTitle}"!`);
        setLocalSheets((prev) =>
          prev.map((s) => (s.id === sheetId ? { ...s, isEnrolled: true } : s))
        );
        if (sheet) {
          router.push(sheetHref(collegeSlug, sheet));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to enroll in sheet');
      } finally {
        setEnrollingId(null);
      }
    });
  };

  const handleUnenroll = (sheetId: string, sheetTitle: string) => {
    setUnenrollingId(sheetId);
    startTransition(async () => {
      try {
        await unenrollStudentFromSheet(collegeSlug, sheetId);
        toast.success(`Successfully unenrolled from "${sheetTitle}".`);
        setLocalSheets((prev) =>
          prev.map((s) => (s.id === sheetId ? { ...s, isEnrolled: false } : s))
        );
      } catch (_err) {
        toast.error('Failed to unenroll');
      } finally {
        setUnenrollingId(null);
      }
    });
  };

  const handleCardClick = (sheet: SheetItem) => {
    if (!sheet.isPublished) return;
    if (sheet.isEnrolled) {
      router.push(sheetHref(collegeSlug, sheet));
    } else {
      handleEnroll(sheet.id, sheet.title);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 font-sans">
      {readme && readme.trim() && <DsaIntroBanner markdown={readme} />}

      <div className="space-y-6">
        <div className="flex justify-end">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search sheets..."
              className="pl-9 bg-background border-border focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSheets.map((sheet) => {
            const pct = sheet.problemsCount > 0 ? Math.round((sheet.completedCount / sheet.problemsCount) * 100) : 0;
            return (
              <Card
                key={sheet.id}
                onClick={() => handleCardClick(sheet)}
                className={`group flex flex-col h-full bg-card border-border shadow-2xs hover:border-primary/40 hover:shadow-md transition-all duration-200 ${
                  sheet.isPublished ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                }`}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1">
                      {sheet.title}
                    </h3>
                    {!sheet.isPublished ? (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
                        Coming soon
                      </Badge>
                    ) : sheet.isEnrolled ? (
                      <Badge className="bg-primary/10 text-primary border-0 flex items-center gap-1 shrink-0 font-semibold">
                        <CheckCircle2 className="size-3" />
                        Enrolled
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0 font-semibold">
                        New
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                    {sheet.description_md ? sheet.description_md.replace(/[#*`_-]/g, '').slice(0, 100) : 'Practice structured patterns to crack product companies.'}
                  </p>

                  <div className="flex items-center gap-4 my-3 pt-3 border-t border-border/50">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <FileCode className="size-3.5 text-primary" />
                      <span>{sheet.isPublished ? `${sheet.categoriesCount} categories` : 'Coming soon'}</span>
                    </span>
                    {sheet.isPublished && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <BookOpen className="size-3.5 text-primary" />
                        <span>{sheet.problemsCount} problems</span>
                      </span>
                    )}
                  </div>

                  {sheet.isPublished && sheet.isEnrolled && (
                    <div className="space-y-1.5 my-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground tabular-nums">{sheet.completedCount}/{sheet.problemsCount} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-primary/10" />
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    {!sheet.isPublished ? (
                      <Button disabled className="w-full bg-muted text-muted-foreground">
                        Coming Soon
                      </Button>
                    ) : sheet.isEnrolled ? (
                      <div className="flex gap-2">
                        <Button asChild className="flex-1 cursor-pointer">
                          <Link href={sheetHref(collegeSlug, sheet)} onClick={(e) => e.stopPropagation()}>
                            Continue
                            <ChevronRight className="size-4 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </Link>
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnenroll(sheet.id, sheet.title);
                          }}
                          disabled={unenrollingId === sheet.id}
                          variant="outline"
                          className="px-3 border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors duration-200 cursor-pointer"
                          title="Unenroll"
                        >
                          {unenrollingId === sheet.id ? (
                            <div className="size-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                          ) : (
                            <LogOut className="size-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnroll(sheet.id, sheet.title);
                        }}
                        disabled={enrollingId === sheet.id}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200 cursor-pointer"
                      >
                        {enrollingId === sheet.id ? (
                          <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        ) : (
                          <Clock className="size-4 mr-2" />
                        )}
                        Enroll & Start
                        <ChevronRight className="size-4 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredSheets.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-muted/20">
          <div className="flex flex-col items-center gap-2">
            <Search className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">
              {searchQuery ? `No sheets found matching "${searchQuery}"` : 'No DSA practice sheets available.'}
            </p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-primary mt-1">
                Clear search
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
