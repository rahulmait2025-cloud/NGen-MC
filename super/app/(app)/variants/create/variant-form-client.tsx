'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createVariantAction } from '../actions';

interface MasterCourse {
  id: string;
  title: string;
  code: string;
  publish_status: string;
  pillar_id: string | null;
}

interface PillarOption {
  id: string;
  title: string;
}

interface College {
  id: string;
  name: string;
  slug: string;
}

interface VariantFormProps {
  masterCourses: MasterCourse[];
  pillars: PillarOption[];
  colleges: College[];
}

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private / Internal Only' },
  { value: 'global', label: 'Global / Reusable' },
  { value: 'selected_colleges', label: 'Selected Colleges' },
] as const;

const NO_COLLEGE_VALUE = '__none__';

function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface VariantFormData {
  master_course_id: string;
  pillar_id: string;
  title: string;
  slug: string;
  code: string;
  description: string;
  selling_price: string;
  discounted_price: string;
  pricing_model: string;
  visibility_scope: string;
  created_for_college_id: string;
  visible_college_ids: string[];
}

function VariantFormContent({
  formData,
  setFormData,
  masterCourses,
  pillars,
  colleges,
  courseById,
  handleTitleChange,
  handleVisibilityChange,
  handleCollegeToggle,
}: {
  formData: VariantFormData;
  setFormData: React.Dispatch<React.SetStateAction<VariantFormData>>;
  masterCourses: MasterCourse[];
  pillars: PillarOption[];
  colleges: College[];
  courseById: Map<string, MasterCourse>;
  handleTitleChange: (title: string) => void;
  handleVisibilityChange: (scope: string) => void;
  handleCollegeToggle: (collegeId: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="master_course_id">Parent Master Course *</Label>
        <Select value={formData.master_course_id} onValueChange={(value) => { const parent = courseById.get(value); setFormData((prev) => ({ ...prev, master_course_id: value, pillar_id: parent?.pillar_id ?? prev.pillar_id })); }}>
          <SelectTrigger><SelectValue placeholder="Select a Master Course" /></SelectTrigger>
          <SelectContent>{masterCourses.map((course) => (<SelectItem key={course.id} value={course.id}>{course.title} ({course.code})</SelectItem>))}</SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pillar_id">Display Pillar *</Label>
        <Select value={formData.pillar_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, pillar_id: value }))}>
          <SelectTrigger id="pillar_id"><SelectValue placeholder="Select a pillar" /></SelectTrigger>
          <SelectContent>{pillars.map((pillar) => (<SelectItem key={pillar.id} value={pillar.id}>{pillar.title}</SelectItem>))}</SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Choose where this course variant should appear for students.</p>
      </div>

      <div className="space-y-2"><Label htmlFor="title">Title *</Label><Input id="title" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g., Advanced Module 1-3 Only" required /></div>
      <div className="space-y-2"><Label htmlFor="code">Code *</Label><Input id="code" value={formData.code} onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))} placeholder="e.g., VAR-ADV-123" required /></div>
      <div className="space-y-2"><Label htmlFor="slug">Slug *</Label><Input id="slug" value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} placeholder="e.g., advanced-module-1-3-only" required /><p className="text-xs text-muted-foreground">Auto-generated from title. Used in URLs.</p></div>
      <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe what this variant includes..." rows={3} /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2"><Label htmlFor="selling_price">Selling Price (Rs.)</Label><Input id="selling_price" type="number" value={formData.selling_price} onChange={(e) => setFormData((prev) => ({ ...prev, selling_price: e.target.value }))} placeholder="Optional" /></div>
        <div className="space-y-2"><Label htmlFor="discounted_price">Discounted Price (Rs.)</Label><Input id="discounted_price" type="number" value={formData.discounted_price} onChange={(e) => setFormData((prev) => ({ ...prev, discounted_price: e.target.value }))} placeholder="Optional" /></div>
        <div className="space-y-2">
          <Label htmlFor="pricing_model">Pricing Model</Label>
          <Select value={formData.pricing_model} onValueChange={(value) => setFormData((prev) => ({ ...prev, pricing_model: value }))}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="one_time">One-time</SelectItem><SelectItem value="subscription_ready">Subscription</SelectItem><SelectItem value="per_seat">Per Seat</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select value={formData.visibility_scope} onValueChange={handleVisibilityChange}>
            <SelectTrigger><SelectValue placeholder="Select visibility" /></SelectTrigger>
            <SelectContent>{VISIBILITY_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Controls who can discover and assign this variant.</p>
        </div>

        {formData.visibility_scope === 'selected_colleges' && (
          <div className="space-y-2">
            <Label>Select Colleges</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
              {colleges.map((college) => (<div key={college.id} className="flex items-center gap-2"><Checkbox id={`college-${college.id}`} checked={formData.visible_college_ids.includes(college.id)} onCheckedChange={() => handleCollegeToggle(college.id)} /><Label htmlFor={`college-${college.id}`} className="text-sm font-normal cursor-pointer">{college.name}</Label></div>))}
            </div>
            <p className="text-xs text-muted-foreground">Selected: {formData.visible_college_ids.length} college(s)</p>
          </div>
        )}

        {formData.visibility_scope !== 'selected_colleges' && (
          <div className="space-y-2">
            <Label htmlFor="created_for_college_id">Created For College (Optional)</Label>
            <Select value={formData.created_for_college_id || NO_COLLEGE_VALUE} onValueChange={(value) => setFormData((prev) => ({ ...prev, created_for_college_id: value === NO_COLLEGE_VALUE ? '' : value }))}>
              <SelectTrigger><SelectValue placeholder="Select (lineage only)" /></SelectTrigger>
              <SelectContent><SelectItem value={NO_COLLEGE_VALUE}>None</SelectItem>{colleges.map((college) => (<SelectItem key={college.id} value={college.id}>{college.name}</SelectItem>))}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Lineage/context only - does not affect visibility.</p>
          </div>
        )}
      </div>
    </>
  );
}

export function VariantForm({ masterCourses, pillars, colleges }: VariantFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const courseById = useMemo(
    () => new Map(masterCourses.map((course) => [course.id, course])),
    [masterCourses],
  );

  const [formData, setFormData] = useState(() => ({
    master_course_id: '',
    pillar_id: '',
    title: '',
    slug: '',
    code: '',
    description: '',
    selling_price: '',
    discounted_price: '',
    pricing_model: '',
    visibility_scope: 'global',
    created_for_college_id: '',
    visible_college_ids: [] as string[],
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.pillar_id) {
        setStatus('error');
        setStatusMessage('Display Pillar is required.');
        setIsSubmitting(false);
        return;
      }

      if (formData.visibility_scope === 'selected_colleges' && formData.visible_college_ids.length === 0) {
        setStatus('error');
        setStatusMessage('At least one college must be selected when visibility is "Selected Colleges"');
        setIsSubmitting(false);
        return;
      }

      const result = await createVariantAction({
        master_course_id: formData.master_course_id,
        pillar_id: formData.pillar_id,
        title: formData.title,
        slug: formData.slug,
        code: formData.code,
        description: formData.description || undefined,
        selling_price: formData.selling_price ? Math.round(parseFloat(formData.selling_price) * 100) : undefined,
        discounted_price: formData.discounted_price ? Math.round(parseFloat(formData.discounted_price) * 100) : undefined,
        pricing_model: formData.pricing_model || undefined,
        visibility_scope: formData.visibility_scope as 'private' | 'global' | 'selected_colleges',
        created_for_college_id: formData.created_for_college_id === NO_COLLEGE_VALUE ? null : (formData.created_for_college_id || null),
        visible_college_ids: formData.visibility_scope === 'selected_colleges' ? formData.visible_college_ids : [],
      });

      if (result.success && result.data) {
        setStatus('success');
        setStatusMessage(`${formData.title} created successfully!`);
        const variantId = result.data.id;
        setTimeout(() => router.push(`/variants/${variantId}`), 1000);
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to create variant');
      }
    } catch {
      setStatus('error');
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlugFromTitle(title),
    }));
  };

  const handleVisibilityChange = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      visibility_scope: scope,
      visible_college_ids: scope === 'selected_colleges' ? prev.visible_college_ids : [],
    }));
  };

  const handleCollegeToggle = (collegeId: string) => {
    setFormData((prev) => ({
      ...prev,
      visible_college_ids: prev.visible_college_ids.includes(collegeId)
        ? prev.visible_college_ids.filter((id) => id !== collegeId)
        : [...prev.visible_college_ids, collegeId],
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Status Message */}
      {status !== 'idle' && (
        <Card className={status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive/10 border-destructive/30'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {status === 'success' ? (
                <CheckCircle className="size-5 text-emerald-600" />
              ) : (
                <AlertCircle className="size-5 text-destructive" />
              )}
              <p className={status === 'success' ? 'text-emerald-800 font-medium' : 'text-destructive font-medium'}>
                {statusMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Variant Details</CardTitle>
          <CardDescription>
            Enter the basic information for this Course Variant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <VariantFormContent
            formData={formData}
            setFormData={setFormData}
            masterCourses={masterCourses}
            pillars={pillars}
            colleges={colleges}
            courseById={courseById}
            handleTitleChange={handleTitleChange}
            handleVisibilityChange={handleVisibilityChange}
            handleCollegeToggle={handleCollegeToggle}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}Create Variant</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
