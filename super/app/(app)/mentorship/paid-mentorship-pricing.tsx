'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { IndianRupee, Save, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getPaidMentorshipPricingAction,
  updatePaidMentorshipPricingAction,
} from './paid-mentorship-actions';

export function PaidMentorshipPricing() {
  const [isPending, startTransition] = useTransition();
  const [originalPrice, setOriginalPrice] = useState(500);
  const [sellingPrice, setSellingPrice] = useState(50);

  useEffect(() => {
    getPaidMentorshipPricingAction().then((result) => {
      if (result.ok && result.pricing) {
        setOriginalPrice(Math.round(result.pricing.original_price_minor / 100));
        setSellingPrice(Math.round(result.pricing.selling_price_minor / 100));
      }
    });
  }, []);

  const discountPercent =
    originalPrice > 0 && sellingPrice <= originalPrice
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : 0;

  const handleSave = () => {
    if (sellingPrice > originalPrice) {
      toast.error('Selling price cannot be greater than MRP.');
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set('original_price_minor', String(originalPrice * 100));
      formData.set('selling_price_minor', String(sellingPrice * 100));
      const result = await updatePaidMentorshipPricingAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Pricing updated.');
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Pricing</h3>
          <p className="text-sm text-muted-foreground">
            MRP and selling price for paid sessions.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending} size="sm">
          <Save className="mr-2 size-4" />
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="original-price" className="text-sm font-medium">
              MRP (Original Price)
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="original-price"
                type="number"
                min={0}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value))}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="selling-price" className="text-sm font-medium">
              Selling Price
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="selling-price"
                type="number"
                min={0}
                max={originalPrice}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6 rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Preview:</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">
              ₹{sellingPrice.toLocaleString('en-IN')}
            </span>
            {discountPercent > 0 && (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                  {discountPercent}% OFF
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
