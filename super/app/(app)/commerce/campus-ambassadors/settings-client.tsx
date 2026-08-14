'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { updateGlobalDiscount } from './actions';

interface SettingsClientProps {
  settings: {
    discount_type: string;
    discount_value: number;
  } | null;
}

export function SettingsClient({ settings }: SettingsClientProps) {
  const [discountValue, setDiscountValue] = useState(String(settings?.discount_value ?? 20));
  const [applyToAll, setApplyToAll] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const val = parseInt(discountValue, 10);
    if (isNaN(val) || val <= 0 || val > 100) {
      toast.error('Enter a valid discount % (1-100)');
      return;
    }

    setLoading(true);
    const result = await updateGlobalDiscount(val, applyToAll);
    setLoading(false);

    if (result.ok) {
      const msg = applyToAll
        ? `Global discount updated to ${val}% and applied to ${result.updated ?? 0} existing ambassador coupons.`
        : `Global discount updated to ${val}%. Future ambassadors will receive this discount.`;
      toast.success(msg);
    } else {
      toast.error(result.error ?? 'Failed to update');
    }
  }

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Settings className="size-3.5" />
          </div>
          Global Discount Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-input">Default Discount (%)</Label>
              <input
                id="discount-input"
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Applied to newly approved ambassadors. Existing coupons remain unchanged.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                />
                <span className="text-sm font-medium">Apply to all existing coupons</span>
              </label>
            </div>
            {applyToAll && (
              <Badge variant="outline" className="text-amber-600 border-amber-500/20 bg-amber-500/5">
                This will update ALL ambassador coupons, including disabled ones
              </Badge>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
            <h4 className="text-sm font-semibold mb-3">How it works</h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="text-primary font-bold shrink-0">1.</span>
                New ambassadors get this discount when approved
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary font-bold shrink-0">2.</span>
                Existing ambassadors keep their current discount
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary font-bold shrink-0">3.</span>
                Toggle &quot;Apply to all&quot; to bulk-update every coupon
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary font-bold shrink-0">4.</span>
                Per-ambassador overrides are possible from the Ambassadors tab
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} className="min-w-[120px]">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
