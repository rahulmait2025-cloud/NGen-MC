'use client';

import { useMemo, useState, useTransition, useReducer } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DirectLearnerCatalogData } from './direct-learner-access-section';
import {
  grantDirectLearnerAccessAction,
  revokeDirectLearnerAccessAction,
  searchDirectLearnerAccessAction,
  type DirectLearnerAccessRow,
} from '@/app/(app)/colleges/actions';

interface DirectLearnerAccessManagerProps {
  collegeId: string;
  catalog: DirectLearnerCatalogData;
}

const NOTE_VARIANTS_BUNDLES =
  'Variants and bundles appear here only when assigned to the Direct Learners college. Assignment here does not auto-grant learner access.';

type DirectLearnerCatalogItemType = 'master_course' | 'variant' | 'bundle';

function LearnerAccessSection({
  selectedContent,
  query,
  onQueryChange,
  onSearch,
  isPending,
  error,
  notice,
  learners,
  onEnable,
  onDisable,
}: {
  selectedContent: { id: string; type: DirectLearnerCatalogItemType; title: string } | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  isPending: boolean;
  error: string | null;
  notice: string | null;
  learners: DirectLearnerAccessRow[];
  onEnable: (studentId: string) => void;
  onDisable: (studentId: string, row: DirectLearnerAccessRow) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search direct learners by email or name"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="max-w-sm"
          disabled={!selectedContent}
        />
        <Button onClick={onSearch} disabled={!selectedContent || isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
        {selectedContent && (
          <Badge variant="outline">
            Selected: {selectedContent.title} ({selectedContent.type.replace('_', ' ')})
          </Badge>
        )}
      </div>

      {!selectedContent ? (
        <div className="text-sm text-muted-foreground">Select a catalog item to manage access.</div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Showing active direct learners for the selected item.
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
          {notice && <div className="text-sm text-muted-foreground">{notice}</div>}

          {learners.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active direct learners found for this search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.map((row) => (
                  <TableRow key={row.student_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {row.full_name || row.email || row.student_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">{row.email ?? '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {row.membership_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.access.enabled ? 'secondary' : 'outline'}
                        className="uppercase text-[10px]"
                      >
                        {row.access.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.access.source}
                    </TableCell>
                    <TableCell>
                      {row.access.enabled ? (
                        row.access.can_disable ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDisable(row.student_id, row)}
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            {row.access.source === 'payment' ? 'Purchased' : 'Managed'}
                          </Button>
                        )
                      ) : (
                        <Button size="sm" onClick={() => onEnable(row.student_id)}>
                          Enable
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

type FeedbackState = { error: string | null; notice: string | null };
type FeedbackAction =
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_NOTICE'; message: string }
  | { type: 'CLEAR' };

function feedbackReducer(state: FeedbackState, action: FeedbackAction): FeedbackState {
  switch (action.type) {
    case 'SET_ERROR': return { error: action.message, notice: null };
    case 'SET_NOTICE': return { error: null, notice: action.message };
    case 'CLEAR': return { error: null, notice: null };
  }
}

function CatalogBrowser({
  catalog,
  selectedContent,
  onSelectContent,
  totalMasterCourses,
  totalVariants,
  totalBundles,
}: {
  catalog: DirectLearnerCatalogData;
  selectedContent: { id: string; type: DirectLearnerCatalogItemType; title: string; code?: string | null } | null;
  onSelectContent: (content: { id: string; type: DirectLearnerCatalogItemType; title: string; code?: string | null }) => void;
  totalMasterCourses: number;
  totalVariants: number;
  totalBundles: number;
}) {
  return (
    <>
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">Direct learner catalog</div>
        <div className="mt-1">{totalMasterCourses} published master courses available for direct learners.</div>
        <div className="mt-1">
          {totalVariants} assigned course variants, {totalBundles} assigned bundles.
        </div>
        <div className="mt-2 text-xs">{NOTE_VARIANTS_BUNDLES}</div>
      </div>

      {catalog.master_courses.length === 0 ? (
        <div className="text-sm text-muted-foreground">No direct-learner-eligible master courses found.</div>
      ) : (
        <div className="space-y-4">
          {catalog.master_courses.map((pillar) => (
            <div key={pillar.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{pillar.title}</div>
                  {(pillar.short_description || pillar.description) && (
                    <div className="text-xs text-muted-foreground">
                      {pillar.short_description || pillar.description}
                    </div>
                  )}
                </div>
                <Badge variant="secondary">{pillar.courses.length} courses</Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {pillar.courses.map((course) => (
                  <div
                    key={course.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                      selectedContent?.id === course.id && selectedContent?.type === 'master_course'
                        ? 'border-primary/50 bg-primary/5'
                        : ''
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{course.title}</div>
                      <div className="text-xs text-muted-foreground">{course.code}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        selectedContent?.id === course.id && selectedContent?.type === 'master_course'
                          ? 'secondary'
                          : 'outline'
                      }
                      onClick={() =>
                        onSelectContent({
                          id: course.id,
                          type: 'master_course',
                          title: course.title,
                          code: course.code,
                        })
                      }
                    >
                      {selectedContent?.id === course.id && selectedContent?.type === 'master_course'
                        ? 'Selected'
                        : 'Manage'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-sm font-medium">Assigned Course Variants</div>
        {catalog.variants.length === 0 ? (
          <div className="text-sm text-muted-foreground">No variants assigned to Direct Learners yet.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {catalog.variants.map((variant) => (
              <div
                key={variant.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  selectedContent?.id === variant.id && selectedContent?.type === 'variant'
                    ? 'border-primary/50 bg-primary/5'
                    : ''
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{variant.title}</div>
                  <div className="text-xs text-muted-foreground">{variant.code}</div>
                  {variant.master_course_title && (
                    <div className="text-xs text-muted-foreground">
                      Master course: {variant.master_course_title}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={
                    selectedContent?.id === variant.id && selectedContent?.type === 'variant'
                      ? 'secondary'
                      : 'outline'
                  }
                  onClick={() =>
                    onSelectContent({
                      id: variant.id,
                      type: 'variant',
                      title: variant.title,
                      code: variant.code,
                    })
                  }
                >
                  {selectedContent?.id === variant.id && selectedContent?.type === 'variant' ? 'Selected' : 'Manage'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Assigned Bundles</div>
        {catalog.bundles.length === 0 ? (
          <div className="text-sm text-muted-foreground">No bundles assigned to Direct Learners yet.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {catalog.bundles.map((bundle) => (
              <div
                key={bundle.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  selectedContent?.id === bundle.id && selectedContent?.type === 'bundle'
                    ? 'border-primary/50 bg-primary/5'
                    : ''
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{bundle.title}</div>
                  <div className="text-xs text-muted-foreground">{bundle.code}</div>
                </div>
                <Button
                  size="sm"
                  variant={
                    selectedContent?.id === bundle.id && selectedContent?.type === 'bundle'
                      ? 'secondary'
                      : 'outline'
                  }
                  onClick={() =>
                    onSelectContent({
                      id: bundle.id,
                      type: 'bundle',
                      title: bundle.title,
                      code: bundle.code,
                    })
                  }
                >
                  {selectedContent?.id === bundle.id && selectedContent?.type === 'bundle' ? 'Selected' : 'Manage'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function DirectLearnerAccessManager({ collegeId, catalog }: DirectLearnerAccessManagerProps) {
  const [{ error, notice }, feedbackDispatch] = useReducer(feedbackReducer, { error: null, notice: null });

  const [selectedContent, setSelectedContent] = useState<{
    id: string;
    type: DirectLearnerCatalogItemType;
    title: string;
    code?: string | null;
  } | null>(null);
  const [query, setQuery] = useState('');
  const [learners, setLearners] = useState<DirectLearnerAccessRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const totalMasterCourses = useMemo(
    () => catalog.master_courses.reduce((sum, pillar) => sum + pillar.courses.length, 0),
    [catalog],
  );

  const totalVariants = catalog.variants.length;
  const totalBundles = catalog.bundles.length;

  const handleSelectContent = (content: {
    id: string;
    type: DirectLearnerCatalogItemType;
    title: string;
    code?: string | null;
  }) => {
    setSelectedContent(content);
    setQuery('');
    feedbackDispatch({ type: 'CLEAR' });

    startTransition(async () => {
      const result = await searchDirectLearnerAccessAction({
        collegeId,
        contentId: content.id,
        contentType: content.type,
        query: '',
      });

      if (!result.ok) {
        feedbackDispatch({ type: 'SET_ERROR', message: result.error });
        setLearners([]);
        return;
      }

      setLearners(result.learners);
    });
  };

  const handleSearch = () => {
    if (!selectedContent) return;
    feedbackDispatch({ type: 'CLEAR' });

    startTransition(async () => {
      const result = await searchDirectLearnerAccessAction({
        collegeId,
        contentId: selectedContent.id,
        contentType: selectedContent.type,
        query,
      });

      if (!result.ok) {
        feedbackDispatch({ type: 'SET_ERROR', message: result.error });
        setLearners([]);
        return;
      }

      setLearners(result.learners);
    });
  };

  const refreshLearners = () => {
    if (!selectedContent) return;
    startTransition(async () => {
      const result = await searchDirectLearnerAccessAction({
        collegeId,
        contentId: selectedContent.id,
        contentType: selectedContent.type,
        query,
      });
      if (result.ok) {
        setLearners(result.learners);
      }
    });
  };

  const handleEnable = async (studentId: string) => {
    if (!selectedContent) return;
    feedbackDispatch({ type: 'CLEAR' });

    const result = await grantDirectLearnerAccessAction({
      collegeId,
      contentId: selectedContent.id,
      contentType: selectedContent.type,
      studentId,
    });

    if (!result.ok) {
      feedbackDispatch({ type: 'SET_ERROR', message: result.error });
      return;
    }

    feedbackDispatch({ type: 'SET_NOTICE', message: result.message ?? '' });

    refreshLearners();
  };

  const handleDisable = async (studentId: string, row: DirectLearnerAccessRow) => {
    if (!selectedContent) return;
    if (!row.access.can_disable) return;

    feedbackDispatch({ type: 'CLEAR' });

    const result = await revokeDirectLearnerAccessAction({
      collegeId,
      contentId: selectedContent.id,
      contentType: selectedContent.type,
      studentId,
    });

    if (!result.ok) {
      feedbackDispatch({ type: 'SET_ERROR', message: result.error });
      return;
    }

    feedbackDispatch({ type: 'SET_NOTICE', message: result.message ?? '' });

    refreshLearners();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Learner Access</CardTitle>
        <CardDescription>
          Manage access for individual direct learners. Published catalog visibility does not grant access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CatalogBrowser
          catalog={catalog}
          selectedContent={selectedContent}
          onSelectContent={handleSelectContent}
          totalMasterCourses={totalMasterCourses}
          totalVariants={totalVariants}
          totalBundles={totalBundles}
        />

        <LearnerAccessSection
          selectedContent={selectedContent}
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          isPending={isPending}
          error={error}
          notice={notice}
          learners={learners}
          onEnable={handleEnable}
          onDisable={handleDisable}
        />
      </CardContent>
    </Card>
  );
}
