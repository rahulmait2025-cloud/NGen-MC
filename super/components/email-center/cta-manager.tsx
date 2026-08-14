'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  MAX_CUSTOM_CTAS,
  createCtaId,
  type CustomEmailCta,
} from '@/lib/email-center/custom-composer';

interface CtaManagerProps {
  ctas: CustomEmailCta[];
  onChange: (ctas: CustomEmailCta[]) => void;
  warnings?: string[];
}

export function CtaManager({ ctas, onChange, warnings = [] }: CtaManagerProps) {
  const updateAt = (index: number, patch: Partial<CustomEmailCta>) => {
    onChange(ctas.map((cta, i) => (i === index ? { ...cta, ...patch } : cta)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= ctas.length) return;
    const copy = [...ctas];
    const tmp = copy[index]!;
    copy[index] = copy[next]!;
    copy[next] = tmp;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>Call-to-action buttons</Label>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_CUSTOM_CTAS} buttons. At most one Primary.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={ctas.length >= MAX_CUSTOM_CTAS}
          onClick={() =>
            onChange([
              ...ctas,
              {
                id: createCtaId(),
                label: '',
                url: '',
                style: ctas.some((c) => c.style === 'primary') ? 'secondary' : 'primary',
              },
            ])
          }
          className="gap-1"
        >
          <Plus className="size-4" />
          Add CTA
        </Button>
      </div>

      {warnings.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {ctas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No CTAs yet. Optional.</p>
      ) : (
        <div className="space-y-3">
          {ctas.map((cta, index) => (
            <div key={cta.id} className="space-y-2 rounded-md border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Button text</Label>
                  <Input
                    value={cta.label}
                    onChange={(e) => updateAt(index, { label: e.target.value })}
                    placeholder="Open dashboard"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Style</Label>
                  <Select
                    value={cta.style}
                    onValueChange={(value) =>
                      updateAt(index, { style: value as 'primary' | 'secondary' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">HTTPS URL</Label>
                <Input
                  value={cta.url}
                  onChange={(e) => updateAt(index, { url: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, 1)}
                  disabled={index === ctas.length - 1}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onChange(ctas.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
