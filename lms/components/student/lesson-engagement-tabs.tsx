'use client';

import * as React from 'react';
import { FileText, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { linkifyText } from '@/lib/utils/linkify-text';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LessonResourcesCard } from './lesson-resources-card';
import { CoursePlayerResourcesTab } from './course-player-resources-tab';
import type {
  CourseResourceSummary,
  CourseResourceSectionWithItems,
} from '@/types/database';

export interface LessonEngagementTabsProps {
  collegeSlug: string;
  courseId: string;
  itemId: string;
  resources: CourseResourceSummary[];
  onOpenResource: (resource: CourseResourceSummary, signedUrl?: string) => void;
  description: string | null;
  courseResourceSections: CourseResourceSectionWithItems[];
  noteCollectionSlugMap?: Record<string, string>;
  activeModuleId?: string | null;
  className?: string;
}

export function LessonEngagementTabs({
  collegeSlug,
  courseId,
  itemId: _itemId,
  resources,
  onOpenResource,
  description,
  courseResourceSections,
  noteCollectionSlugMap,
  activeModuleId,
  className,
}: LessonEngagementTabsProps) {
  const hasResources = resources.length > 0;
  const _hasCourseResources = courseResourceSections.length > 0;

  return (
    <div className={cn('w-full', className)}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList
          variant="line"
          className="w-full justify-start border-b border-border/30 pb-0 h-11 px-0 rounded-none bg-transparent gap-5"
        >
          <TabsTrigger
            value="overview"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary rounded-none bg-transparent px-1 pb-3 pt-2 text-sm font-semibold relative after:bottom-[-1px] after:h-[2px] after:transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              Overview
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary rounded-none bg-transparent px-1 pb-3 pt-2 text-sm font-semibold relative after:bottom-[-1px] after:h-[2px] after:transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              Resources
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4 outline-none">
          <div className="space-y-5">
            {description && description.trim() ? (
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-foreground/90">
                  {linkifyText(description)}
                </p>
              </div>
            ) : null}

            {hasResources && (
              <div className="border-t border-border/20 pt-4">
                <h3 className="text-sm font-medium text-foreground mb-2.5">
                  Lesson Resources
                </h3>
                <LessonResourcesCard
                  collegeSlug={collegeSlug}
                  courseId={courseId}
                  resources={resources}
                  onOpenResource={onOpenResource}
                  title=""
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="pt-4 outline-none">
          <CoursePlayerResourcesTab
            sections={courseResourceSections}
            collegeSlug={collegeSlug}
            noteCollectionSlugMap={noteCollectionSlugMap}
            activeModuleId={activeModuleId}
            activeItemId={_itemId}
            courseId={courseId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
