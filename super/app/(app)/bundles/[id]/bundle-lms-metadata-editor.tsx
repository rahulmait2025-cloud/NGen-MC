'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { updateBundleAction } from '../actions';

function parseLines(value: string): string[] {
  return value.split('\n').reduce<string[]>((acc, line) => {
    const trimmed = line.trim();
    if (trimmed) acc.push(trimmed);
    return acc;
  }, []);
}

function joinLines(values: unknown): string {
  if (!Array.isArray(values)) return '';
  return values.filter((v): v is string => typeof v === 'string').join('\n');
}

interface BundleLmsMetadataEditorProps {
  bundle: {
    id: string;
    title: string;
    publish_status: string;
    landing_card_title?: string | null;
    landing_card_description?: string | null;
    landing_badge_label?: string | null;
    landing_badge_variant?: string | null;
    landing_highlights?: unknown;
    landing_footer_note?: string | null;
    landing_hero_title?: string | null;
    landing_hero_subtitle?: string | null;
    landing_outcomes?: unknown;
    landing_audience_points?: unknown;
    show_on_lms_catalog?: boolean | null;
    show_on_lms_curated?: boolean | null;
    curated_sort_order?: number | null;
    catalog_sort_order?: number | null;
  };
}

export function BundleLmsMetadataEditor({ bundle }: BundleLmsMetadataEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    landing_card_title: bundle.landing_card_title ?? bundle.title,
    landing_card_description: bundle.landing_card_description ?? '',
    landing_badge_label: bundle.landing_badge_label ?? '',
    landing_badge_variant: bundle.landing_badge_variant ?? 'premium',
    landing_highlights: joinLines(bundle.landing_highlights),
    landing_footer_note: bundle.landing_footer_note ?? '',
    landing_hero_title: bundle.landing_hero_title ?? bundle.title,
    landing_hero_subtitle: bundle.landing_hero_subtitle ?? '',
    landing_outcomes: joinLines(bundle.landing_outcomes),
    landing_audience_points: joinLines(bundle.landing_audience_points),
    show_on_lms_catalog: bundle.show_on_lms_catalog ?? true,
    show_on_lms_curated: bundle.show_on_lms_curated ?? false,
    curated_sort_order: bundle.curated_sort_order?.toString() ?? '',
    catalog_sort_order: bundle.catalog_sort_order?.toString() ?? '',
  }));

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    const highlights = parseLines(form.landing_highlights).slice(0, 3);
    const visibleOnLms = form.show_on_lms_catalog || form.show_on_lms_curated;

    if (visibleOnLms && bundle.publish_status !== 'published') {
      setError('Only published bundles should be shown on LMS.');
      setIsSaving(false);
      return;
    }

    if (visibleOnLms && !form.landing_card_title.trim()) {
      setError('Card title is required when bundle is visible on LMS.');
      setIsSaving(false);
      return;
    }

    if (visibleOnLms && !form.landing_card_description.trim()) {
      setError('Card description is required when bundle is visible on LMS.');
      setIsSaving(false);
      return;
    }

    const result = await updateBundleAction(bundle.id, {
      landing_card_title: form.landing_card_title.trim(),
      landing_card_description: form.landing_card_description.trim(),
      landing_badge_label: form.landing_badge_label.trim() || undefined,
      landing_badge_variant: form.landing_badge_variant || undefined,
      landing_highlights: highlights,
      landing_footer_note: form.landing_footer_note.trim() || undefined,
      landing_hero_title: form.landing_hero_title.trim() || undefined,
      landing_hero_subtitle: form.landing_hero_subtitle.trim() || undefined,
      landing_outcomes: parseLines(form.landing_outcomes),
      landing_audience_points: parseLines(form.landing_audience_points),
      show_on_lms_catalog: form.show_on_lms_catalog,
      show_on_lms_curated: form.show_on_lms_curated,
      curated_sort_order: form.curated_sort_order ? parseInt(form.curated_sort_order, 10) : null,
      catalog_sort_order: form.catalog_sort_order ? parseInt(form.catalog_sort_order, 10) : null,
    });

    setIsSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to save LMS metadata');
      return;
    }

    router.refresh();
  }, [bundle.id, bundle.publish_status, form, router]);

  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">LMS Landing & Card</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Controls curated picks, catalog cards, and bundle detail hero/outcomes on Student LMS.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Card title</Label>
          <Input value={form.landing_card_title} onChange={(e) => setForm((f) => ({ ...f, landing_card_title: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Badge label</Label>
          <Input value={form.landing_badge_label} onChange={(e) => setForm((f) => ({ ...f, landing_badge_label: e.target.value }))} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Card short description</Label>
          <Textarea rows={2} value={form.landing_card_description} onChange={(e) => setForm((f) => ({ ...f, landing_card_description: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Badge variant</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={form.landing_badge_variant}
            onChange={(e) => setForm((f) => ({ ...f, landing_badge_variant: e.target.value }))}
          >
            <option value="premium">Premium</option>
            <option value="free">Free</option>
            <option value="included">Included</option>
            <option value="assigned">Assigned</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-footer-note">Footer note</Label>
          <Input id="bundle-footer-note" value={form.landing_footer_note} onChange={(e) => setForm((f) => ({ ...f, landing_footer_note: e.target.value }))} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="bundle-highlights">Card highlights (max 3, one per line)</Label>
          <Textarea id="bundle-highlights" rows={3} value={form.landing_highlights} onChange={(e) => setForm((f) => ({ ...f, landing_highlights: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-hero-title">Hero title</Label>
          <Input id="bundle-hero-title" value={form.landing_hero_title} onChange={(e) => setForm((f) => ({ ...f, landing_hero_title: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-hero-subtitle">Hero subtitle</Label>
          <Input id="bundle-hero-subtitle" value={form.landing_hero_subtitle} onChange={(e) => setForm((f) => ({ ...f, landing_hero_subtitle: e.target.value }))} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="bundle-outcomes">Outcomes (one per line)</Label>
          <Textarea id="bundle-outcomes" rows={4} value={form.landing_outcomes} onChange={(e) => setForm((f) => ({ ...f, landing_outcomes: e.target.value }))} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="bundle-audience">This bundle is for you if... (one per line)</Label>
          <Textarea id="bundle-audience" rows={4} value={form.landing_audience_points} onChange={(e) => setForm((f) => ({ ...f, landing_audience_points: e.target.value }))} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="show-lms-catalog" className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          Show in LMS catalog
          <Switch id="show-lms-catalog" checked={form.show_on_lms_catalog} onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_lms_catalog: v }))} />
        </label>
        <label htmlFor="show-lms-curated" className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          Show in curated section
          <Switch id="show-lms-curated" checked={form.show_on_lms_curated} onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_lms_curated: v }))} />
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-catalog-sort">Catalog sort order</Label>
          <Input id="bundle-catalog-sort" type="number" value={form.catalog_sort_order} onChange={(e) => setForm((f) => ({ ...f, catalog_sort_order: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-curated-sort">Curated sort order</Label>
          <Input id="bundle-curated-sort" type="number" value={form.curated_sort_order} onChange={(e) => setForm((f) => ({ ...f, curated_sort_order: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
          Save LMS Metadata
        </Button>
      </div>
    </div>
  );
}
