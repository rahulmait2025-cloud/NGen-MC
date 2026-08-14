'use client';

import { useEffect, useState, useTransition, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, LayoutTemplate } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  getPaidCourseLandingMetadataAction,
  savePaidCourseLandingMetadataAction,
} from '@/app/(app)/master-courses/paid-landing-actions';
import { PaidCourseImageUpload } from '@/components/master-courses/paid-course-image-upload';
import {
  getVariantPaidLandingMetadataAction,
  saveVariantPaidLandingMetadataAction,
} from '@/app/(app)/variants/paid-variant-actions';
import {
  getPaidProductMetadataAction,
  upsertPaidProductMetadataAction,
} from '@/app/(app)/paid-product/actions';
import { isPaidProductMetadataComplete } from '@/lib/services/paid-product-validation';
import type { PaidCourseLandingMetadataRow } from '@/lib/services/paid-course-landing-metadata';

interface PaidCourseLandingSettingsProps {
  courseId?: string;
  variantId?: string;
  /** When false, section is hidden until master course paid toggle is on. */
  enabled?: boolean;
  compact?: boolean;
  /** Render without Card wrapper (for dialogs). */
  embedded?: boolean;
  /** Increment to trigger save from parent (dialog footer). */
  saveSignal?: number;
  onSaveSuccess?: () => void | Promise<void>;
}

type StringListKey =
  | 'best_for'
  | 'outcomes'
  | 'what_you_will_learn'
  | 'included_features'
  | 'prerequisites';

function emptyListItem() {
  return '';
}

export function PaidCourseLandingSettings({
  courseId,
  variantId,
  enabled = true,
  compact = false,
  embedded = false,
  saveSignal = 0,
  onSaveSuccess,
}: PaidCourseLandingSettingsProps) {
  const entityKey = variantId ?? courseId ?? '';
  const [loading, setLoading] = useState(() => !enabled || !entityKey ? false : true);
  const prevEnabled = useRef(enabled);
  const prevEntityKey = useRef(entityKey);
  if (prevEnabled.current && !enabled) setLoading(false);
  if (prevEntityKey.current && !entityKey) setLoading(false);
  prevEnabled.current = enabled;
  prevEntityKey.current = entityKey;
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => ({
    slug: '',
    title: '',
    subtitle: '',
    short_description: '',
    description: '',
    cover_image_url: '',
    thumbnail_url: '',
    preview_video_url: '',
    level: 'Beginner+',
    language: 'English',
    category: '',
    best_for: [''] as string[],
    outcomes: [''] as string[],
    what_you_will_learn: [''] as string[],
    included_features: [''] as string[],
    prerequisites: [''] as string[],
    faqs: [{ question: '', answer: '' }],
    is_published: false,
    is_visible: true,
  }));

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = variantId
          ? embedded
            ? await getPaidProductMetadataAction('course_variant', variantId)
            : await getVariantPaidLandingMetadataAction(variantId)
          : embedded
            ? await getPaidProductMetadataAction('master_course', courseId!)
            : await getPaidCourseLandingMetadataAction(courseId!);
        if (!active || !result.ok) return;
        const m = result.data as PaidCourseLandingMetadataRow;
        setForm({
          slug: m.slug,
          title: m.title,
          subtitle: m.subtitle ?? '',
          short_description: m.short_description ?? '',
          description: m.description ?? '',
          cover_image_url: m.cover_image_url ?? '',
          thumbnail_url: m.thumbnail_url ?? '',
          preview_video_url: m.preview_video_url ?? '',
          level: m.level ?? 'Beginner+',
          language: m.language ?? 'English',
          category: m.category ?? '',
          best_for: m.best_for.length ? m.best_for : [''],
          outcomes: m.outcomes.length ? m.outcomes : [''],
          what_you_will_learn: m.what_you_will_learn.length ? m.what_you_will_learn : [''],
          included_features: m.included_features.length ? m.included_features : [''],
          prerequisites: m.prerequisites.length ? m.prerequisites : [''],
          faqs: m.faqs.length ? m.faqs : [{ question: '', answer: '' }],
          is_published: m.is_published,
          is_visible: m.is_visible,
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load paid course landing settings');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [courseId, variantId, entityKey, enabled, embedded]);

  const handleSave = useCallback(() => {
    if (!enabled || !entityKey) return;
    startTransition(async () => {
      const cleanList = (items: string[]) => items.reduce<string[]>((acc, s) => { const trimmed = s.trim(); if (trimmed) acc.push(trimmed); return acc; }, []);
      const payload = {
        slug: form.slug.trim() || form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || undefined,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        preview_video_url: form.preview_video_url.trim() || null,
        level: form.level.trim() || null,
        language: form.language.trim() || null,
        category: form.category.trim() || null,
        best_for: cleanList(form.best_for),
        outcomes: cleanList(form.outcomes),
        what_you_will_learn: cleanList(form.what_you_will_learn),
        included_features: cleanList(form.included_features),
        prerequisites: cleanList(form.prerequisites),
        faqs: form.faqs.reduce((acc, f) => {
          const faq = { question: f.question.trim(), answer: f.answer.trim() };
          if (faq.question && faq.answer) acc.push(faq);
          return acc;
        }, [] as Array<{ question: string; answer: string }>),
        is_published: form.is_published,
        is_visible: form.is_visible,
      };

      if (embedded) {
        const completeness = isPaidProductMetadataComplete({
          title: payload.title,
          slug: payload.slug ?? undefined,
          short_description: payload.short_description,
          description: payload.description,
          cover_image_url: payload.cover_image_url,
          thumbnail_url: payload.thumbnail_url,
        });
        if (!completeness.ok) {
          toast.error(`Complete paid course metadata first (missing: ${completeness.missing.join(', ')})`);
          return;
        }
      }

      const result = variantId
        ? embedded
          ? await upsertPaidProductMetadataAction('course_variant', variantId, payload)
          : await saveVariantPaidLandingMetadataAction(variantId, payload)
        : embedded
          ? await upsertPaidProductMetadataAction('master_course', courseId!, payload)
          : await savePaidCourseLandingMetadataAction(courseId!, payload);

      if (!result.ok) {
        toast.error(result.error ?? 'Save failed');
        return;
      }

      toast.success('Paid course landing settings saved');
      await onSaveSuccess?.();
    });
  }, [courseId, embedded, enabled, entityKey, form, onSaveSuccess, variantId]);

  useEffect(() => {
    if (!saveSignal) return;
    handleSave();
    // Only react to explicit save clicks from the dialog footer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  if (!enabled || !entityKey) return null;

  function updateList(key: StringListKey, index: number, value: string) {
    setForm((prev) => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  }

  function addListItem(key: StringListKey) {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], emptyListItem()] }));
  }

  function removeListItem(key: StringListKey, index: number) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    const loadingBody = (
      <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading paid course landing settings…
      </div>
    );
    if (embedded) return loadingBody;
    return (
      <Card>
        <CardContent>{loadingBody}</CardContent>
      </Card>
    );
  }

  const listSection = (label: string, key: StringListKey, placeholder: string) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => addListItem(key)} className="text-primary text-xs font-semibold h-8">
          <Plus className="size-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {form[key].map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={value}
              placeholder={placeholder}
              onChange={(e) => updateList(key, index, e.target.value)}
              className="h-10 border-border/60 focus-visible:border-primary/40"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeListItem(key, index)}
              disabled={form[key].length <= 1}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 size-10 shrink-0"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const formBody = (
    <>
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Basic Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`landing-title-${entityKey}`} className="text-xs font-medium text-muted-foreground">Title</Label>
              <Input id={`landing-title-${entityKey}`} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`landing-slug-${courseId}`} className="text-xs font-medium text-muted-foreground">Slug</Label>
              <Input id={`landing-slug-${courseId}`} value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`landing-subtitle-${courseId}`} className="text-xs font-medium text-muted-foreground">Subtitle / Tagline</Label>
              <Input id={`landing-subtitle-${courseId}`} value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`landing-short-${courseId}`} className="text-xs font-medium text-muted-foreground">Short Description</Label>
              <Textarea id={`landing-short-${courseId}`} rows={2} value={form.short_description} onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))} className="border-border/60 focus-visible:border-primary/40 resize-none" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`landing-desc-${courseId}`} className="text-xs font-medium text-muted-foreground">Detailed Description</Label>
              <Textarea id={`landing-desc-${courseId}`} rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="border-border/60 focus-visible:border-primary/40 resize-none" />
            </div>
            {(courseId || variantId) ? (
              <PaidCourseImageUpload
                sourceType={variantId ? 'course_variant' : 'master_course'}
                sourceId={variantId ?? courseId!}
                coverUrl={form.cover_image_url || undefined}
                thumbnailUrl={form.thumbnail_url || undefined}
                onUploaded={(patch) => {
                  setForm((p) => ({
                    ...p,
                    cover_image_url: patch.cover_image_url ?? p.cover_image_url,
                    thumbnail_url: patch.thumbnail_url ?? p.thumbnail_url,
                  }));
                }}
              />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`landing-cover-${courseId}`} className="text-xs font-medium text-muted-foreground">Cover Image URL</Label>
              <Input id={`landing-cover-${courseId}`} value={form.cover_image_url} onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`landing-thumb-${courseId}`} className="text-xs font-medium text-muted-foreground">Thumbnail URL</Label>
              <Input id={`landing-thumb-${courseId}`} value={form.thumbnail_url} onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`landing-preview-${courseId}`} className="text-xs font-medium text-muted-foreground">Preview Video URL (optional)</Label>
              <Input id={`landing-preview-${courseId}`} value={form.preview_video_url} onChange={(e) => setForm((p) => ({ ...p, preview_video_url: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
          </div>
        </div>

        <div className="space-y-5 border-t border-border/50 pt-6">
          <h3 className="text-sm font-semibold text-foreground">Landing Page Content</h3>
          {listSection('Best For', 'best_for', 'e.g. Final-year CS students')}
          {listSection('Outcomes', 'outcomes', 'e.g. Build production-ready projects')}
          {listSection('What You Will Learn', 'what_you_will_learn', 'e.g. React component patterns')}
          {listSection('Included Features', 'included_features', 'e.g. Lifetime LMS access')}
          {listSection('Prerequisites', 'prerequisites', 'e.g. Basic JavaScript')}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Course FAQs</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm((p) => ({ ...p, faqs: [...p.faqs, { question: '', answer: '' }] }))}
                className="text-primary text-xs font-semibold h-8"
              >
                <Plus className="size-3.5 mr-1" /> Add FAQ
              </Button>
            </div>
            {form.faqs.map((faq, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-border/60 p-3 bg-card">
                <Input
                  placeholder="Question"
                  value={faq.question}
                  className="border-0 shadow-none font-semibold focus-visible:ring-0 px-0 h-8 bg-transparent"
                  onChange={(e) => setForm((p) => {
                    const faqs = [...p.faqs];
                    faqs[index] = { ...faqs[index], question: e.target.value };
                    return { ...p, faqs };
                  })}
                />
                <Textarea
                  placeholder="Answer"
                  rows={2}
                  value={faq.answer}
                  className="border-0 shadow-none resize-none focus-visible:ring-0 px-0 font-medium bg-transparent"
                  onChange={(e) => setForm((p) => {
                    const faqs = [...p.faqs];
                    faqs[index] = { ...faqs[index], answer: e.target.value };
                    return { ...p, faqs };
                  })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 border-t border-border/50 pt-6">
          <h3 className="text-sm font-semibold text-foreground">Pricing & Access</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`landing-level-${courseId}`} className="text-xs font-medium text-muted-foreground">Level</Label>
              <Input id={`landing-level-${courseId}`} value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`landing-language-${courseId}`} className="text-xs font-medium text-muted-foreground">Language</Label>
              <Input id={`landing-language-${courseId}`} value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))} className="h-10 border-border/60 focus-visible:border-primary/40" />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Price plans and validity are managed in the Course Pricing panel. Curriculum is managed in modules below.
          </p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3 bg-card hover:border-primary/30 transition-colors cursor-pointer group">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))} />
              <Label className="text-[13px] font-medium cursor-pointer group-hover:text-primary transition-colors">Published on landing</Label>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3 bg-card hover:border-primary/30 transition-colors cursor-pointer group">
              <Switch checked={form.is_visible} onCheckedChange={(v) => setForm((p) => ({ ...p, is_visible: v }))} />
              <Label className="text-[13px] font-medium cursor-pointer group-hover:text-primary transition-colors">Visible in paid catalog</Label>
            </div>
          </div>
        </div>

        {!embedded ? (
          <Button type="button" onClick={handleSave} disabled={isPending} className="w-full md:w-auto h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/10 transition-colors rounded-lg">
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Landing Settings
          </Button>
        ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-8">{formBody}</div>;
  }

  return (
    <Card className={compact ? 'border-dashed' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="size-5" />
          Paid Course Landing Settings
        </CardTitle>
        <CardDescription>
          Configure the individual paid course landing page shown in Student LMS.
          Curriculum, lesson counts, and pricing plans come from course modules and the pricing panel.
          Platform trust, mentor, and testimonial sections remain shared/static on the landing page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">{formBody}</CardContent>
    </Card>
  );
}
