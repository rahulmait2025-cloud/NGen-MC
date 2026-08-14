'use client';

import { useEffect, useState, useRef, useTransition, useReducer } from 'react';
import { useRouter } from 'next/navigation';

import { Plus, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { createCourseInsidePillarAction, updateCourseInsidePillarAction } from '@/app/(app)/master-courses/actions';
import { createCourseInsideBootcampAction } from '@/app/(app)/bootcamps/actions';
import type { MasterCoursesRow, MasterCoursePublishStatus } from '@/types/database';
import * as React from 'react';





import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Image as ImageIcon, Users as UsersIcon, ListChecks, HelpCircle } from 'lucide-react';
import { CourseThumbnailUpload } from './course-thumbnail-upload';

export type CreateCourseDialogContext = 'pillar' | 'bootcamp';

interface CreateCourseDialogProps {
  /**
   * Container context. Defaults to 'pillar' for backwards compatibility.
   *  - 'pillar':   edits are scoped to a Pillar.
   *  - 'bootcamp': edits are scoped to a Bootcamp. Visibility toggles are hidden
   *                because bootcamp courses must not be visible to colleges.
   */
  context?: CreateCourseDialogContext;
  /** Required when context='pillar' (or omitted). Ignored in bootcamp context. */
  pillarId?: string;
  /** Required when context='bootcamp'. Ignored in pillar context. */
  bootcampId?: string;
  course?: MasterCoursesRow;
  mode?: 'button' | 'menuitem';
  /**
   * When true, the dialog is open on first render. Useful for dedicated
   * `/new` pages that should land the user inside the editor immediately.
   */
  defaultOpen?: boolean;
  /**
   * When true, the trigger button is not rendered. Pair with `defaultOpen`
   * to render a dialog-only (no button) experience on dedicated `/new` pages.
   */
  hideTrigger?: boolean;
  /**
   * Optional callback fired after a successful create/update. Receives the
   * server-action result. If omitted, the dialog falls back to
   * `router.refresh()`.
   */
  onSuccess?: (result: { id?: string; ok: true }) => void;
}

const DEFAULT_LANDING_PAGE = {
  hero: { title: '', subtitle: '', video_url: '', image_url: '' },
  pricing: { sale_price: 0, original_price: 0, currency: 'INR', tiers: [] },
  learning_outcomes: [''],
  instructors: [{ name: '', designation: '', image_url: '', bio: '' }],
  curriculum: [{ title: '', description: '', lessons: [''] }],
  testimonials: [{ name: '', role: '', content: '', avatar_url: '', rating: 5 }],
  faq: [{ question: '', answer: '' }]
};

/** Uppercase code: at least 2 chars, A-Z / 0-9 only (schema allows hyphens; we keep codes compact). */
function deriveCourseCodeFromTitle(title: string): string {
  const compact = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length >= 2) return compact.slice(0, 50);
  if (compact.length === 1) return `${compact}${compact}`;
  return 'MC';
}

/** URL slug: lowercase, at least 2 chars. */
function deriveSlugFromTitle(title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (safe.length >= 2) return safe.slice(0, 100);
  if (safe.length === 1) return `${safe}${safe}`;
  return 'course';
}

type CourseFormState = {
  values: Record<string, string | boolean>;
  landingPage: typeof DEFAULT_LANDING_PAGE;
  descriptionPoints: string[];
  errors: Record<string, string>;
};

type CourseFormAction =
  | { type: 'SET_FIELD'; key: string; value: string | boolean }
  | { type: 'SET_VALUES'; values: Record<string, string | boolean> }
  | { type: 'SET_LANDING_PAGE'; landingPage: typeof DEFAULT_LANDING_PAGE }
  | { type: 'SET_DESCRIPTION_POINTS'; points: string[] }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'INIT_FORM'; course: CreateCourseDialogProps['course'] | undefined; isEdit: boolean }
  | { type: 'RESET_FORM' }
  | { type: 'ADD_FAQ_INDEX'; }
  | { type: 'SET_EXPANDED_FAQ'; index: number | null };

function courseFormReducer(state: CourseFormState, action: CourseFormAction): CourseFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, values: { ...state.values, [action.key]: action.value } };
    case 'SET_VALUES':
      return { ...state, values: action.values };
    case 'SET_LANDING_PAGE':
      return { ...state, landingPage: action.landingPage };
    case 'SET_DESCRIPTION_POINTS':
      return { ...state, descriptionPoints: action.points };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'INIT_FORM': {
      const c = action.course;
      const metadata = (c?.metadata as Record<string, unknown>) || {};
      let points: string[];
      try {
        if (c?.description) {
          const parsed = JSON.parse(c.description);
          points = Array.isArray(parsed) ? (parsed.length > 0 ? parsed : ['']) : [c.description];
        } else {
          points = [''];
        }
      } catch {
        points = c?.description ? [c.description] : [''];
      }
      if (!action.isEdit) points = [''];
      return {
        values: {
          title: c?.title || '',
          code: c?.code || '',
          slug: c?.slug || '',
          description: c?.description || '',
          short_description: c?.short_description || '',
          publish_status: c?.publish_status || 'draft',
          visible_to_college_admins: c?.visible_to_college_admins ?? false,
          visible_to_college_students: c?.visible_to_college_students ?? false,
          visible_to_global_students: c?.visible_to_global_students ?? true,
        },
        landingPage: (metadata.landing_page as typeof DEFAULT_LANDING_PAGE) || DEFAULT_LANDING_PAGE,
        descriptionPoints: points,
        errors: {},
      };
    }
    case 'RESET_FORM':
      return courseFormReducer(state, { type: 'INIT_FORM', course: undefined, isEdit: false });
    default:
      return state;
  }
}

function getInitialFormState(course: CreateCourseDialogProps['course'] | undefined, isEdit: boolean): CourseFormState {
  return courseFormReducer({} as CourseFormState, { type: 'INIT_FORM', course, isEdit });
}

interface CourseFormHeaderProps {
  isEdit: boolean;
  isBootcamp: boolean;
  SHOW_LANDING_PAGE_UI: boolean;
  pillarId?: string;
  courseId?: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

function CourseFormHeader({ isEdit, isBootcamp, SHOW_LANDING_PAGE_UI, pillarId, courseId, activeTab: _activeTab, setActiveTab: _setActiveTab }: CourseFormHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md px-6 py-5 border-b border-border/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Plus className="size-5" />
        </div>
        <div>
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            {isEdit
              ? 'Edit Master Course'
              : isBootcamp
                ? 'Create Bootcamp Course'
                : 'Create Master Course'}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
            {isEdit
              ? 'Refine metadata and visibility settings for this academic course.'
              : isBootcamp
                ? 'Initialize a new course within this bootcamp.'
                : 'Initialize a new course within this pillar.'}
          </DialogDescription>
        </div>
      </div>
      
      {SHOW_LANDING_PAGE_UI && isEdit && !isBootcamp && (
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="text-primary border-primary/20 hover:bg-primary/5 font-medium text-xs"
          onClick={() => window.open(`/master-courses/pillars/${pillarId}/courses/${courseId}/preview`, '_blank')}
        >
          <Sparkles className="mr-1.5 size-3.5" /> Live Preview
        </Button>
      )}
    </div>
  );
}

interface BasicInfoTabContentProps {
  isEdit: boolean;
  isBootcamp: boolean;
  course?: MasterCoursesRow;
  values: Record<string, string | boolean>;
  errors: Record<string, string>;
  setValues: (updater: ((prev: Record<string, string | boolean>) => Record<string, string | boolean>) | Record<string, string | boolean>) => void;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  codeEditedByUserRef: React.MutableRefObject<boolean>;
  slugEditedByUserRef: React.MutableRefObject<boolean>;
  descriptionPoints: string[];
  setDescriptionPoints: (updater: ((prev: string[]) => string[]) | string[]) => void;
  landingPage: typeof DEFAULT_LANDING_PAGE;
  setLandingPage: (updater: ((prev: typeof DEFAULT_LANDING_PAGE) => typeof DEFAULT_LANDING_PAGE) | typeof DEFAULT_LANDING_PAGE) => void;
  expandedFaqIdx: number | null;
  setExpandedFaqIdx: (idx: number | null | ((prev: number | null) => number | null)) => void;
  thumbnailUrl: string | null;
  setThumbnailUrl: (url: string | null) => void;
}

function BasicInfoTabContent({
  isEdit, isBootcamp, course, values, errors, setValues, handleTitleChange,
  codeEditedByUserRef, slugEditedByUserRef, descriptionPoints, setDescriptionPoints,
  landingPage, setLandingPage, expandedFaqIdx, setExpandedFaqIdx,
  thumbnailUrl, setThumbnailUrl,
}: BasicInfoTabContentProps) {
  return (
    <div className="space-y-6">
      {isEdit && course && (
        <CourseThumbnailUpload
          courseId={course.id}
          currentThumbnailUrl={thumbnailUrl}
          onUpdate={setThumbnailUrl}
          onDelete={() => setThumbnailUrl(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="course-title" className="text-sm font-semibold text-foreground ml-1">Course Title</Label>
          <Input
            id="course-title"
            placeholder="e.g. Advanced React Patterns"
            className="h-12 border-border/60 focus-visible:border-primary/40 font-medium text-base"
            value={values.title as string}
            onChange={handleTitleChange}
            required
          />
          {errors.title && <p className="text-xs font-semibold text-destructive mt-1.5 ml-1 flex items-center gap-1.5 before:content-[''] before:size-1 before:bg-destructive before:rounded-full">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-code" className="text-sm font-semibold text-foreground ml-1">Reference Code</Label>
          <Input
            id="course-code"
            placeholder="REACT-ADV"
            className="h-11 border-border/60 focus-visible:border-primary/40 font-mono text-xs font-semibold"
            value={values.code as string}
            onChange={(e) => {
              codeEditedByUserRef.current = true;
              setValues((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
            }}
            required
            disabled={isEdit}
          />
          <p className="text-[11px] font-medium text-muted-foreground ml-1">
            Internal unique code, min 2 characters.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-slug" className="text-sm font-semibold text-foreground ml-1">URL Slug</Label>
          <Input
            id="course-slug"
            placeholder="react-advanced"
            className="h-11 border-border/60 focus-visible:border-primary/40 font-mono text-xs font-semibold"
            value={values.slug as string}
            onChange={(e) => {
              slugEditedByUserRef.current = true;
              setValues((prev) => ({ ...prev, slug: e.target.value }));
            }}
            required
          />
          <p className="text-[11px] font-medium text-muted-foreground ml-1">Used in public application routing.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="course-short-desc" className="text-sm font-semibold text-foreground ml-1">Short Summary</Label>
        <Textarea
          id="course-short-desc"
          placeholder="Brief summary for display cards"
          className="min-h-[80px] border-border/60 focus-visible:border-primary/40 font-medium resize-y py-2.5"
          value={values.short_description as string}
          onChange={(e) => setValues(prev => ({ ...prev, short_description: e.target.value }))}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <Label className="text-sm font-semibold text-foreground">Curriculum Details (Points)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDescriptionPoints(prev => [...prev, ''])}
            className="h-8 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="size-3.5 mr-1" /> Add Point
          </Button>
        </div>
        
        <div className="space-y-3">
          {descriptionPoints.map((point, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder={`Objective point ${idx + 1}...`}
                className="h-11 border-border/60 focus-visible:border-primary/40 font-medium"
                value={point}
                onChange={(e) => {
                  const newPoints = [...descriptionPoints];
                  newPoints[idx] = e.target.value;
                  setDescriptionPoints(newPoints);
                }}
              />
              {descriptionPoints.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDescriptionPoints(prev => prev.filter((_, i) => i !== idx))}
                  className="size-11 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <HelpCircle className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Common FAQs</h4>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setLandingPage(prev => {
                const newFaq = [...prev.faq, { question: '', answer: '' }];
                setExpandedFaqIdx(newFaq.length - 1);
                return { ...prev, faq: newFaq };
              });
            }}
            className="text-primary text-xs font-semibold"
          >
            + Add FAQ
          </Button>
        </div>
        <div className="space-y-3">
          {landingPage.faq.map((item, idx) => {
            const isExpanded = expandedFaqIdx === idx;
            return (
              <div key={idx} className={cn(
                "border border-border/60 rounded-lg overflow-hidden transition-colors duration-200 bg-card",
                isExpanded ? "ring-1 ring-primary/20 border-primary/30" : "hover:border-border"
              )}>
                <div 
                  className="px-4 py-3 flex justify-between items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedFaqIdx(isExpanded ? null : idx); }}
                  role="button"
                  tabIndex={0}
                >
                  <Input 
                    value={item.question} 
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const newFaq = [...landingPage.faq];
                      newFaq[idx].question = e.target.value;
                      setLandingPage(prev => ({ ...prev, faq: newFaq }));
                    }}
                    placeholder={`Question #${idx + 1}`}
                    className="border-0 shadow-none font-semibold focus-visible:ring-0 px-0 h-8 bg-transparent"
                  />
                  <div className="flex items-center gap-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newFaq = landingPage.faq.filter((_, i) => i !== idx);
                        setLandingPage(prev => ({ ...prev, faq: newFaq }));
                        setExpandedFaqIdx(prev => {
                          if (prev === idx) return null;
                          if (prev && prev > idx) return prev - 1;
                          return prev;
                        });
                      }}
                      className="text-muted-foreground size-8 hover:text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <div className="text-muted-foreground ml-1">
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Textarea 
                      value={item.answer} 
                      onChange={(e) => {
                        const newFaq = [...landingPage.faq];
                        newFaq[idx].answer = e.target.value;
                        setLandingPage(prev => ({ ...prev, faq: newFaq }));
                      }}
                      placeholder="Provide a detailed answer for students..."
                      className="border-0 shadow-none resize-none focus-visible:ring-0 px-0 font-medium bg-transparent min-h-[100px]"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground ml-1">Publish Status</Label>
            <Select
              value={values.publish_status as string}
              onValueChange={(v) => setValues(prev => ({ ...prev, publish_status: v as MasterCoursePublishStatus }))}
            >
              <SelectTrigger className="h-11 border-border/60 focus:ring-primary font-semibold">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-card border-border/50">
                <SelectItem value="draft" className="font-semibold py-2.5">Draft</SelectItem>
                <SelectItem value="published" className="font-semibold py-2.5 text-primary">Published</SelectItem>
                <SelectItem value="unpublished" className="font-semibold py-2.5">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!isBootcamp && (
        <div className="p-5 rounded-xl space-y-4 border border-border/60 bg-muted/20">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Visibility Context</h4>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Determine which academic interfaces will list this course.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-card hover:border-primary/30 transition-colors cursor-pointer group">
              <Label htmlFor="cvis-admins" className="text-[12px] font-medium cursor-pointer group-hover:text-primary transition-colors">Admin Portal</Label>
              <Switch
                id="cvis-admins"
                checked={values.visible_to_college_admins as boolean}
                onCheckedChange={(v) => setValues(prev => ({ ...prev, visible_to_college_admins: v }))}
                size="sm"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-card hover:border-primary/30 transition-colors cursor-pointer group">
              <Label htmlFor="cvis-students" className="text-[12px] font-medium cursor-pointer group-hover:text-primary transition-colors">College Hub</Label>
              <Switch
                id="cvis-students"
                checked={values.visible_to_college_students as boolean}
                onCheckedChange={(v) => setValues(prev => ({ ...prev, visible_to_college_students: v }))}
                size="sm"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-card hover:border-primary/30 transition-colors cursor-pointer group">
              <Label htmlFor="cvis-global" className="text-[12px] font-medium cursor-pointer group-hover:text-primary transition-colors">Global Access</Label>
              <Switch
                id="cvis-global"
                checked={values.visible_to_global_students as boolean}
                onCheckedChange={(v) => setValues(prev => ({ ...prev, visible_to_global_students: v }))}
                size="sm"
              />
            </div>
          </div>
        </div>
        )}

        {isBootcamp && (
          <div className="p-5 rounded-xl space-y-2 border border-border/60 bg-muted/20">
            <h4 className="text-sm font-semibold text-foreground">Bootcamp Course Privacy</h4>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Bootcamp courses are never visible to college admins or college students. Visibility is locked by the data model and managed separately at the bootcamp level.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface LandingPageTabContentProps {
  landingPage: typeof DEFAULT_LANDING_PAGE;
  setLandingPage: (updater: ((prev: typeof DEFAULT_LANDING_PAGE) => typeof DEFAULT_LANDING_PAGE) | typeof DEFAULT_LANDING_PAGE) => void;
}

function LandingPageTabContent({ landingPage, setLandingPage }: LandingPageTabContentProps) {
  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-foreground">
          <ImageIcon className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Hero Branding</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Hero Title</Label>
            <Input 
              value={landingPage.hero.title} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))}
              placeholder="Catchy course headline"
              className="border-border/60 font-medium h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Hero Subtitle</Label>
            <Input 
              value={landingPage.hero.subtitle} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))}
              placeholder="Supporting text for the headline"
              className="border-border/60 font-medium h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Video Preview URL</Label>
            <Input 
              value={landingPage.hero.video_url} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, hero: { ...prev.hero, video_url: e.target.value } }))}
              placeholder="e.g. YouTube or TPStreams URL"
              className="border-border/60 font-medium h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Cover Image URL</Label>
            <Input 
              value={landingPage.hero.image_url} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, hero: { ...prev.hero, image_url: e.target.value } }))}
              placeholder="Unsplash or uploaded image URL"
              className="border-border/60 font-medium h-11"
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Pricing Strategy</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Sale Price</Label>
            <Input 
              type="number"
              value={landingPage.pricing.sale_price} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, pricing: { ...prev.pricing, sale_price: Number(e.target.value) } }))}
              className="border-border/60 font-semibold h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Original Price</Label>
            <Input 
              type="number"
              value={landingPage.pricing.original_price} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, pricing: { ...prev.pricing, original_price: Number(e.target.value) } }))}
              className="border-border/60 font-semibold h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Currency</Label>
            <Input 
              value={landingPage.pricing.currency} 
              onChange={(e) => setLandingPage(prev => ({ ...prev, pricing: { ...prev.pricing, currency: e.target.value } }))}
              className="border-border/60 font-semibold h-11"
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <ListChecks className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Learning Outcomes</h4>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setLandingPage(prev => ({ ...prev, learning_outcomes: [...prev.learning_outcomes, ''] }))}
            className="text-primary text-xs font-semibold"
          >
            + Add Outcome
          </Button>
        </div>
        <div className="space-y-3">
          {landingPage.learning_outcomes.map((outcome, idx) => (
            <div key={idx} className="flex gap-3">
              <Input 
                value={outcome}
                onChange={(e) => {
                  const newOutcomes = [...landingPage.learning_outcomes];
                  newOutcomes[idx] = e.target.value;
                  setLandingPage(prev => ({ ...prev, learning_outcomes: newOutcomes }));
                }}
                placeholder={`Outcome #${idx + 1}`}
                className="border-border/60 font-medium h-11"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  const newOutcomes = landingPage.learning_outcomes.filter((_, i) => i !== idx);
                  setLandingPage(prev => ({ ...prev, learning_outcomes: newOutcomes }));
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <UsersIcon className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Course Mentors</h4>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setLandingPage(prev => ({ ...prev, instructors: [...prev.instructors, { name: '', designation: '', image_url: '', bio: '' }] }))}
            className="text-primary text-xs font-semibold"
          >
            + Add Mentor
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {landingPage.instructors.map((mentor, idx) => (
            <div key={idx} className="p-5 border border-border/60 rounded-xl space-y-3 relative bg-muted/10">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 size-8"
                onClick={() => {
                  const newMentors = landingPage.instructors.filter((_, i) => i !== idx);
                  setLandingPage(prev => ({ ...prev, instructors: newMentors }));
                }}
              >
                <Trash2 className="size-4" />
              </Button>
              <Input 
                value={mentor.name} 
                onChange={(e) => {
                  const newMentors = [...landingPage.instructors];
                  newMentors[idx].name = e.target.value;
                  setLandingPage(prev => ({ ...prev, instructors: newMentors }));
                }}
                placeholder="Mentor Name"
                className="border-border/60 font-semibold h-10"
              />
              <Input 
                value={mentor.designation} 
                onChange={(e) => {
                  const newMentors = [...landingPage.instructors];
                  newMentors[idx].designation = e.target.value;
                  setLandingPage(prev => ({ ...prev, instructors: newMentors }));
                }}
                placeholder="Designation"
                className="border-border/60 font-medium h-10"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <HelpCircle className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Common FAQs</h4>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setLandingPage(prev => ({ ...prev, faq: [...prev.faq, { question: '', answer: '' }] }))}
            className="text-primary text-xs font-semibold"
          >
            + Add FAQ
          </Button>
        </div>
        <div className="space-y-3">
          {landingPage.faq.map((item, idx) => (
            <div key={idx} className="p-4 border border-border/60 rounded-xl space-y-3 bg-card">
              <div className="flex justify-between items-center gap-4">
                <Input 
                  value={item.question} 
                  onChange={(e) => {
                    const newFaq = [...landingPage.faq];
                    newFaq[idx].question = e.target.value;
                    setLandingPage(prev => ({ ...prev, faq: newFaq }));
                  }}
                  placeholder="Question"
                  className="border-0 shadow-none font-semibold focus-visible:ring-0 px-0 h-8"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    const newFaq = landingPage.faq.filter((_, i) => i !== idx);
                    setLandingPage(prev => ({ ...prev, faq: newFaq }));
                  }}
                  className="text-muted-foreground size-8 hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Textarea 
                value={item.answer} 
                onChange={(e) => {
                  const newFaq = [...landingPage.faq];
                  newFaq[idx].answer = e.target.value;
                  setLandingPage(prev => ({ ...prev, faq: newFaq }));
                }}
                placeholder="Detailed answer..."
                className="border-0 shadow-none resize-none focus-visible:ring-0 px-0 font-medium"
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function CreateCourseDialog({
  context = 'pillar',
  pillarId,
  bootcampId,
  course,
  mode = 'button',
  defaultOpen = false,
  hideTrigger = false,
  onSuccess,
}: CreateCourseDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const codeEditedByUserRef = useRef(false);
  const slugEditedByUserRef = useRef(false);

  const isEdit = !!course;
  const isBootcamp = context === 'bootcamp';

  // Feature flag to keep the landing page UI hidden as requested
  const SHOW_LANDING_PAGE_UI = false;

  const [formState, formDispatch] = useReducer(courseFormReducer, course, (c) => getInitialFormState(c, !!c));
  const { values, landingPage, descriptionPoints, errors } = formState;
  const setValues = (updater: ((prev: typeof values) => typeof values) | typeof values) =>
    formDispatch({ type: 'SET_VALUES', values: typeof updater === 'function' ? updater(values) : updater });
  const setLandingPage = (updater: ((prev: typeof landingPage) => typeof landingPage) | typeof landingPage) =>
    formDispatch({ type: 'SET_LANDING_PAGE', landingPage: typeof updater === 'function' ? updater(landingPage) : updater });
  const setDescriptionPoints = (updater: ((prev: typeof descriptionPoints) => typeof descriptionPoints) | typeof descriptionPoints) =>
    formDispatch({ type: 'SET_DESCRIPTION_POINTS', points: typeof updater === 'function' ? updater(descriptionPoints) : updater });
  const setErrors = (updater: ((prev: typeof errors) => typeof errors) | typeof errors) =>
    formDispatch({ type: 'SET_ERRORS', errors: typeof updater === 'function' ? updater(errors) : updater });

  const [activeTab, setActiveTab] = useState('basic');
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    () => (course?.metadata as Record<string, unknown>)?.thumbnail_url as string ?? null,
  );

  useEffect(() => {
    if (open) {
      codeEditedByUserRef.current = false;
      slugEditedByUserRef.current = false;
      formDispatch({ type: 'INIT_FORM', course, isEdit });
    }
  }, [open, course, isEdit]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setValues((prev) => ({
      ...prev,
      title,
      code: codeEditedByUserRef.current ? prev.code : deriveCourseCodeFromTitle(title),
      slug: slugEditedByUserRef.current ? prev.slug : deriveSlugFromTitle(title),
    }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    startTransition(async () => {
      const formData = new FormData();
      if (isBootcamp) {
        if (!bootcampId) {
          toast.error('Bootcamp ID is required');
          return;
        }
        formData.append('bootcamp_id', bootcampId);
      } else {
        if (!pillarId) {
          toast.error('Pillar ID is required');
          return;
        }
        formData.append('pillar_id', pillarId);
      }
      if (isEdit) formData.append('course_id', course!.id);

      let code = (values.code as string).trim().toUpperCase();
      if (code.length < 2 || !/^[A-Z0-9-]+$/.test(code)) {
        code = deriveCourseCodeFromTitle(values.title as string);
      }
      let slug = (values.slug as string).trim().toLowerCase();
      if (slug.length < 2 || !/^[a-z0-9-]+$/.test(slug)) {
        slug = deriveSlugFromTitle(values.title as string);
      }

      // Process description points
      const validPoints = descriptionPoints.filter(p => p.trim() !== '');
      const description = JSON.stringify(validPoints);

      const metadata = {
        ...((course?.metadata as Record<string, unknown>) || {}),
        landing_page: landingPage,
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
      };

      // For bootcamp context, strip visibility fields — they are force-set
      // to false by the server action.
      const valuesPayload: Record<string, string | boolean> = isBootcamp
        ? {
            title: values.title,
            code,
            slug,
            description,
            short_description: values.short_description,
            publish_status: values.publish_status,
            metadata: JSON.stringify(metadata),
          }
        : { ...values, code, slug, description, metadata: JSON.stringify(metadata) };

      Object.entries(valuesPayload).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      try {
        const result = isBootcamp
          ? isEdit
            ? // Bootcamp edit currently uses its own dedicated page; if this
              // dialog is ever opened in edit mode for a bootcamp course,
              // we fall back to the create action which will fail at
              // validation (course_id is required for update).
              await createCourseInsideBootcampAction(formData)
            : await createCourseInsideBootcampAction(formData)
          : isEdit
            ? await updateCourseInsidePillarAction(formData)
            : await createCourseInsidePillarAction(formData);

        if (result.ok) {
          toast.success(isEdit ? 'Course updated' : 'Course created');
          setOpen(false);
          if (!isEdit) {
            setValues({
              title: '',
              code: '',
              slug: '',
              description: '',
              short_description: '',
              publish_status: 'draft',
              visible_to_college_admins: false,
              visible_to_college_students: false,
              visible_to_global_students: true,
            });
            setLandingPage(DEFAULT_LANDING_PAGE);
            setDescriptionPoints(['']);
            setThumbnailUrl(null);
          }
          if (onSuccess) {
            onSuccess({ id: (result as { id?: string }).id, ok: true });
          } else {
            router.refresh();
          }
        } else {
          toast.error(result.error ?? 'An error occurred');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {mode === 'menuitem' ? (
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <Plus className="mr-2 size-4" />
              Edit Metadata
            </DropdownMenuItem>
          ) : (
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              Add Course
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border/60 shadow-xl rounded-xl p-0">
        <form onSubmit={handleSubmit}>
          <CourseFormHeader
            isEdit={isEdit}
            isBootcamp={isBootcamp}
            SHOW_LANDING_PAGE_UI={SHOW_LANDING_PAGE_UI}
            pillarId={pillarId}
            courseId={course?.id}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className={cn("px-6 border-b border-border/50", !SHOW_LANDING_PAGE_UI && "hidden")}>
              <TabsList className="bg-transparent h-14 w-full justify-start gap-8">
                <TabsTrigger value="basic" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-full px-0 font-semibold uppercase tracking-widest text-xs">
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="landing" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-full px-0 font-semibold uppercase tracking-widest text-xs">
                  Landing Page
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="basic" className="p-6 space-y-6 mt-0">
              <BasicInfoTabContent
                isEdit={isEdit}
                isBootcamp={isBootcamp}
                course={course}
                values={values}
                errors={errors}
                setValues={setValues}
                handleTitleChange={handleTitleChange}
                codeEditedByUserRef={codeEditedByUserRef}
                slugEditedByUserRef={slugEditedByUserRef}
                descriptionPoints={descriptionPoints}
                setDescriptionPoints={setDescriptionPoints}
                landingPage={landingPage}
                setLandingPage={setLandingPage}
                expandedFaqIdx={expandedFaqIdx}
                setExpandedFaqIdx={setExpandedFaqIdx}
                thumbnailUrl={thumbnailUrl}
                setThumbnailUrl={setThumbnailUrl}
              />
            </TabsContent>

            <TabsContent value="landing" className="p-6 space-y-8 mt-0">
              <LandingPageTabContent
                landingPage={landingPage}
                setLandingPage={setLandingPage}
              />
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-0 bg-card/90 backdrop-blur-md p-6 border-t border-border/50">
            <DialogFooter className="gap-3 sm:gap-0 items-center">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-medium text-muted-foreground hover:text-foreground">
                Discard
              </Button>
              <Button type="submit" disabled={isPending} className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/10 transition-colors rounded-lg">
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isEdit
                  ? 'Update Course'
                  : isBootcamp
                    ? 'Create Paid Course'
                    : 'Create Course'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
