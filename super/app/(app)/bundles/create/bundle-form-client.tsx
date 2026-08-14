'use client';

import { useState } from 'react';
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
import { createBundleAction } from '../actions';

interface College {
  id: string;
  name: string;
  slug: string;
}

interface BundleFormProps {
  colleges: College[];
}

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private / Internal Only' },
  { value: 'global', label: 'Global / Reusable' },
  { value: 'selected_colleges', label: 'Selected Colleges' },
] as const;

const NO_COLLEGE_VALUE = '__none__';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function VisibilitySection({
  visibilityScope,
  visibleCollegeIds,
  createdForCollegeId,
  colleges,
  onVisibilityChange,
  onCollegeToggle,
  onCreatedForCollegeChange,
}: {
  visibilityScope: string;
  visibleCollegeIds: string[];
  createdForCollegeId: string;
  colleges: College[];
  onVisibilityChange: (scope: string) => void;
  onCollegeToggle: (collegeId: string) => void;
  onCreatedForCollegeChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label>Visibility</Label>
        <Select
          value={visibilityScope}
          onValueChange={onVisibilityChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls who can discover and assign this bundle.
        </p>
      </div>

      {visibilityScope === 'selected_colleges' && (
        <div className="space-y-2">
          <Label>Select Colleges</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
            {colleges.map((college) => (
              <div key={college.id} className="flex items-center gap-2">
                <Checkbox
                  id={`college-${college.id}`}
                  checked={visibleCollegeIds.includes(college.id)}
                  onCheckedChange={() => onCollegeToggle(college.id)}
                />
                <Label
                  htmlFor={`college-${college.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {college.name}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {visibleCollegeIds.length} college(s)
          </p>
        </div>
      )}

      {visibilityScope !== 'selected_colleges' && (
        <div className="space-y-2">
          <Label htmlFor="created_for_college_id">Created For College (Optional)</Label>
          <Select
            value={createdForCollegeId || NO_COLLEGE_VALUE}
            onValueChange={(value) =>
              onCreatedForCollegeChange(value === NO_COLLEGE_VALUE ? '' : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select (lineage only)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_COLLEGE_VALUE}>None</SelectItem>
              {colleges.map((college) => (
                <SelectItem key={college.id} value={college.id}>
                  {college.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Lineage/context only - does not affect visibility.
          </p>
        </div>
      )}
    </div>
  );
}

export function BundleForm({ colleges }: BundleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [formData, setFormData] = useState(() => ({
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
      if (formData.visibility_scope === 'selected_colleges' && formData.visible_college_ids.length === 0) {
        setStatus('error');
        setStatusMessage('At least one college must be selected when visibility is "Selected Colleges"');
        setIsSubmitting(false);
        return;
      }

      const result = await createBundleAction({
        title: formData.title,
        slug: formData.slug,
        code: formData.code,
        description: formData.description || undefined,
        selling_price: formData.selling_price ? parseInt(formData.selling_price) : undefined,
        discounted_price: formData.discounted_price ? parseInt(formData.discounted_price) : undefined,
        pricing_model: formData.pricing_model || undefined,
        visibility_scope: formData.visibility_scope as 'private' | 'global' | 'selected_colleges',
        created_for_college_id: formData.created_for_college_id === NO_COLLEGE_VALUE ? null : (formData.created_for_college_id || null),
        visible_college_ids: formData.visibility_scope === 'selected_colleges' ? formData.visible_college_ids : [],
      });

      if (result.success && result.data) {
        setStatus('success');
        setStatusMessage(`${formData.title} created successfully!`);
        const bundleId = result.data.id;
        setTimeout(() => router.push(`/bundles/${bundleId}`), 1000);
      } else {
        setStatus('error');
        setStatusMessage(result.error || 'Failed to create bundle');
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
      slug: generateSlug(title),
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
          <CardTitle>Bundle Details</CardTitle>
          <CardDescription>
            Enter the basic information for this Course Bundle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Complete Developer Bootcamp"
              required
            />
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="e.g., BUNDLE-DEV-2024"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="e.g., complete-developer-bootcamp"
              required
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from title. Used in URLs.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this bundle includes..."
              rows={3}
            />
          </div>

          {/* Pricing (Phase 8 placeholders) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price (Rs.)</Label>
              <Input
                id="selling_price"
                type="number"
                value={formData.selling_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, selling_price: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discounted_price">Discounted Price (Rs.)</Label>
              <Input
                id="discounted_price"
                type="number"
                value={formData.discounted_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, discounted_price: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing_model">Pricing Model</Label>
              <Select
                value={formData.pricing_model}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, pricing_model: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="subscription_ready">Subscription</SelectItem>
                  <SelectItem value="per_seat">Per Seat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility */}
          <VisibilitySection
            visibilityScope={formData.visibility_scope}
            visibleCollegeIds={formData.visible_college_ids}
            createdForCollegeId={formData.created_for_college_id}
            colleges={colleges}
            onVisibilityChange={handleVisibilityChange}
            onCollegeToggle={handleCollegeToggle}
            onCreatedForCollegeChange={(value) =>
              setFormData((prev) => ({ ...prev, created_for_college_id: value }))
            }
          />

          {/* Info Callout */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> After creating the bundle, you&apos;ll be able to add variants, courses, or individual items.
                Bundles are purely reference-based - no content duplication or TPStreams folder creation.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Bundle
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
