'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { updateBundleAction } from '../actions';

interface BundleMetadataEditorProps {
  bundle: {
    id: string;
    title: string;
    code: string;
    slug: string;
    description: string | null;
    selling_price: number | null;
    discounted_price: number | null;
    pricing_model: string | null;
    visibility_scope: string;
    created_for_college_id: string | null;
  };
  colleges: Array<{ id: string; name: string }>;
  selectedCollegeIds: string[];
}

export function BundleMetadataEditor({ bundle, colleges, selectedCollegeIds }: BundleMetadataEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState(() => ({
    title: bundle.title,
    description: bundle.description ?? '',
    selling_price: bundle.selling_price ? (bundle.selling_price / 100).toString() : '',
    discounted_price: bundle.discounted_price ? (bundle.discounted_price / 100).toString() : '',
    pricing_model: bundle.pricing_model ?? 'one_time',
    visibility_scope: bundle.visibility_scope ?? 'global',
  }));
  const [selectedColleges, setSelectedColleges] = useState<Set<string>>(new Set(selectedCollegeIds));

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setFeedback(null);

    const sellingPrice = form.selling_price ? Math.round(parseFloat(form.selling_price) * 100) : null;
    const discountedPrice = form.discounted_price ? Math.round(parseFloat(form.discounted_price) * 100) : null;

    try {
      const result = await updateBundleAction(bundle.id, {
        title: form.title,
        description: form.description || undefined,
        selling_price: sellingPrice ?? undefined,
        discounted_price: discountedPrice ?? undefined,
        pricing_model: form.pricing_model || undefined,
        visibility_scope: form.visibility_scope as 'private' | 'global' | 'selected_colleges',
        visible_college_ids: form.visibility_scope === 'selected_colleges' ? Array.from(selectedColleges) : undefined,
      });

      if (result.success) {
        setFeedback({ type: 'success', message: 'Settings saved.' });
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to update bundle' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  }, [bundle.id, form, selectedColleges, router]);

  const toggleCollege = useCallback((collegeId: string) => {
    setSelectedColleges((prev) => {
      const next = new Set(prev);
      if (next.has(collegeId)) next.delete(collegeId);
      else next.add(collegeId);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Bundle Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Edit title, pricing, visibility, and more.</p>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bundle-title">Title</Label>
          <Input
            id="bundle-title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Code</Label>
          <Input value={bundle.code} disabled className="opacity-50" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bundle-description">Description</Label>
        <Textarea
          id="bundle-description"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bundle-selling-price">Selling Price (₹)</Label>
          <Input
            id="bundle-selling-price"
            type="number"
            min="0"
            step="1"
            value={form.selling_price}
            onChange={(e) => setForm((prev) => ({ ...prev, selling_price: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-discounted-price">Discounted Price (₹)</Label>
          <Input
            id="bundle-discounted-price"
            type="number"
            min="0"
            step="1"
            value={form.discounted_price}
            onChange={(e) => setForm((prev) => ({ ...prev, discounted_price: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-pricing-model">Pricing Model</Label>
          <select
            id="bundle-pricing-model"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={form.pricing_model}
            onChange={(e) => setForm((prev) => ({ ...prev, pricing_model: e.target.value }))}
          >
            <option value="one_time">One Time</option>
            <option value="subscription_ready">Subscription</option>
            <option value="per_seat">Per Seat</option>
            <option value="free">Free</option>
            <option value="invite_only">Invite Only</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Visibility Scope</Label>
        <div className="flex gap-2">
          {(['private', 'global', 'selected_colleges'] as const).map((scope) => (
            <Button
              key={scope}
              variant={form.visibility_scope === scope ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForm((prev) => ({ ...prev, visibility_scope: scope }))}
            >
              {scope === 'private' ? 'Private' : scope === 'global' ? 'Global' : 'Selected Colleges'}
            </Button>
          ))}
        </div>
      </div>

      {form.visibility_scope === 'selected_colleges' && colleges.length > 0 && (
        <div className="space-y-1.5">
          <Label>Allowed Colleges</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5 max-h-[200px] overflow-y-auto border rounded-md p-2">
            {colleges.map((college) => (
              <label key={college.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColleges.has(college.id)}
                  onChange={() => toggleCollege(college.id)}
                  className="rounded"
                />
                <span className="truncate">{college.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-muted-foreground">
          Slug: <span className="font-mono">{bundle.slug}</span>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Save className="mr-2 size-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
