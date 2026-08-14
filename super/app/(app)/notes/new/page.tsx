'use client';

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, BookOpen, Link2 } from 'lucide-react';
import {
  createNoteCollectionAction,
  listMasterCoursesForSelectorAction,
} from '../notes-actions';
import CourseLinkedNotesManager from '@/components/notes/course-linked-notes-manager';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type CourseOption = { id: string; title: string; code: string | null };

function NewNoteCollectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const querySourceType = searchParams.get('sourceType') as 'standalone' | 'course_linked' | null;
  const queryCourseId = searchParams.get('courseId') || '';
  const queryView = searchParams.get('view') || '';

  const sourceType = querySourceType || 'standalone';
  const isCourseLinked = sourceType === 'course_linked';
  const isCurriculumView = isCourseLinked && queryCourseId && queryView === 'curriculum';

  // Standalone mode state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [descriptionMd, setDescriptionMd] = useState('');
  const [pricingModel, setPricingModel] = useState('free');
  const [priceMinor, setPriceMinor] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [validityDays, setValidityDays] = useState('');
  const [visibilityScope, setVisibilityScope] = useState('global');
  const [publishStatus, setPublishStatus] = useState('draft');
  const [catalogVisibility, setCatalogVisibility] = useState('public_catalog');
  const [pending, setPending] = useState(false);

  // Course-linked mode state
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(queryCourseId);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Sync selectedCourseId with query courseId if changed from outside
  useEffect(() => {
    if (queryCourseId) {
      setSelectedCourseId(queryCourseId);
    }
  }, [queryCourseId]);

  // Fetch courses on mount when in course-linked mode
  useEffect(() => {
    if (sourceType !== 'course_linked') return;
    setLoadingCourses(true);
    listMasterCoursesForSelectorAction()
      .then((res) => {
        if (res.ok) setCourses(res.data as CourseOption[]);
      })
      .finally(() => setLoadingCourses(false));
  }, [sourceType]);

  // Auto-set catalog visibility based on source type
  useEffect(() => {
    setCatalogVisibility(sourceType === 'course_linked' ? 'hidden_course_attached' : 'public_catalog');
  }, [sourceType]);

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val);
    setSlug(generateSlug(val));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('slug', slug);
      fd.append('short_description', shortDescription);
      fd.append('description_md', descriptionMd);
      fd.append('pricing_model', pricingModel);
      fd.append('price_minor', priceMinor.toString());
      fd.append('currency', currency);
      fd.append('validity_days', validityDays);
      fd.append('visibility_scope', visibilityScope);
      fd.append('publish_status', publishStatus);
      fd.append('source_type', sourceType);
      fd.append('catalog_visibility', catalogVisibility);

      const result = await createNoteCollectionAction(fd);

      if (!result.ok) {
        toast.error(result.error || 'Failed to create note collection');
        return;
      }

      toast.success('Note collection created');
      router.push(`/notes/${result.id}/edit`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setPending(false);
    }
  }

  const selectedCourseTitle = courses.find((c) => c.id === (isCurriculumView ? queryCourseId : selectedCourseId))?.title ?? '';

  if (isCurriculumView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              router.push(`/notes/new?sourceType=course_linked`);
            }}
          >
            <ArrowLeft className="mr-2 size-4" />
            Change Course
          </Button>
        </div>
        <CourseLinkedNotesManager
          courseId={queryCourseId}
          courseTitle={selectedCourseTitle}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/notes">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Note Collection</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new note collection. You can add modules and pages after creation.
        </p>
      </div>

      {/* Note Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Note Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCourseId('');
                router.push('/notes/new?sourceType=standalone');
              }}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                !isCourseLinked
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <BookOpen className="size-5 mt-0.5 text-primary shrink-0" />
              <div>
                <div className="font-medium">Standalone</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Listed in the notes catalog. Visible to all students based on visibility scope.
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                router.push('/notes/new?sourceType=course_linked');
              }}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                isCourseLinked
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <Link2 className="size-5 mt-0.5 text-primary shrink-0" />
              <div>
                <div className="font-medium">Course-Linked</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Not listed in catalog. Access derived from course enrollment. Select a course below.
                </div>
              </div>
            </button>
          </div>

          {/* Course selector for course-linked mode */}
          {isCourseLinked && (
            <div className="space-y-4 pt-2 border-t mt-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                {loadingCourses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" /> Loading courses...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}{c.code ? ` (${c.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        disabled={!selectedCourseId}
                        onClick={() => {
                          router.push(`/notes/new?sourceType=course_linked&courseId=${selectedCourseId}&view=curriculum`);
                        }}
                      >
                        Next: Manage Course Notes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standalone: Show full Basic Information + Pricing + Visibility */}
      {!isCourseLinked && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea
                  id="short_description"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_md">Description (Markdown)</Label>
                <Textarea
                  id="description_md"
                  value={descriptionMd}
                  onChange={(e) => setDescriptionMd(e.target.value)}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pricing Model</Label>
                  <Select value={pricingModel} onValueChange={setPricingModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {pricingModel === 'paid' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="price_minor">Price (₹)</Label>
                      <Input
                        id="price_minor"
                        type="number"
                        min="0"
                        value={priceMinor}
                        onChange={(e) => setPriceMinor(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="validity_days">Validity (days)</Label>
                <Input
                  id="validity_days"
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  placeholder="No expiry"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visibility & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Visibility Scope</Label>
                  <Select value={visibilityScope} onValueChange={setVisibilityScope}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="selected_colleges">Selected Colleges</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Publish Status</Label>
                  <Select value={publishStatus} onValueChange={setPublishStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="unpublished">Unpublished</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                'Create Note Collection'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/notes')}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewNoteCollectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewNoteCollectionPageContent />
    </Suspense>
  );
}
