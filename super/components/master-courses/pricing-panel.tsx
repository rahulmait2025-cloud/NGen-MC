'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, IndianRupee, Save, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { MasterCoursesRow, PricingModel } from '@/types/database';
import type { UpdateMasterCourseInput } from '@/lib/services/master-courses';
import { updateCoursePricingAction, getCoursePricingStatusAction } from '@/app/(app)/master-courses/pricing-actions';

interface Props {
  course: MasterCoursesRow;
}

const isPaidCourseBuilder =
  (c: MasterCoursesRow) => c.catalog_type === 'bootcamp' || !!c.bootcamp_id;

interface PricingStatus {
  hasGlobalVariant: boolean;
  variantId: string | null;
  variantPrice: number | null;
  variantStatus: string | null;
  masterCoursePrice: number | null;
  masterCourseCurrency: string | null;
}

export function PricingPanel({ course }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pricingStatus, setPricingStatus] = useState<PricingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [formData, setFormData] = useState(() => ({
    pricing_model: course.pricing_model || 'free',
    base_price: course.base_price ? (course.base_price / 100).toString() : '',
    selling_price: course.selling_price ? (course.selling_price / 100).toString() : '',
    discounted_price: course.discounted_price ? (course.discounted_price / 100).toString() : '',
    currency: course.currency || 'INR',
    is_free: course.is_free,
    is_invite_only: course.is_invite_only,
    visible_to_global_students: course.visible_to_global_students ?? true,
    show_as_paid_course: course.show_as_paid_course ?? false,
  }));

  useEffect(() => {
    async function loadPricingStatus() {
      try {
        const status = await getCoursePricingStatusAction(course.id);
        if ('ok' in status && status.ok === false) return;
        setPricingStatus(status as PricingStatus);
      } catch (e) {
        console.error('Failed to load pricing status', e);
      } finally {
        setLoadingStatus(false);
      }
    }
    loadPricingStatus();
  }, [course.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: UpdateMasterCourseInput = {
        pricing_model: formData.pricing_model as UpdateMasterCourseInput['pricing_model'],
        base_price: formData.base_price ? Math.round(parseFloat(formData.base_price) * 100) : null,
        selling_price: formData.selling_price ? Math.round(parseFloat(formData.selling_price) * 100) : null,
        discounted_price: formData.discounted_price ? Math.round(parseFloat(formData.discounted_price) * 100) : null,
        currency: formData.currency,
        is_free: formData.is_free,
        is_invite_only: formData.is_invite_only,
        visible_to_global_students: formData.visible_to_global_students,
        show_as_paid_course: formData.show_as_paid_course,
      };

      const result = await updateCoursePricingAction(course.id, payload);

      if (result && typeof result === 'object' && 'variantSync' in result) {
        const vs = (result as { variantSync?: { action: string } }).variantSync;
        if (vs?.action === 'created') {
          toast.success('Pricing saved & purchase variant created');
        } else if (vs?.action === 'updated') {
          toast.success('Pricing saved & variant updated');
        } else if (vs?.action === 'deleted') {
          toast.info('Pricing saved. Purchase variant removed (course is free).');
        } else {
          toast.success('Pricing updated');
        }
      } else {
        toast.success('Pricing updated');
      }

      const updatedStatus = await getCoursePricingStatusAction(course.id);
      if (!('ok' in updatedStatus) || updatedStatus.ok !== false) {
        setPricingStatus(updatedStatus as PricingStatus);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const showVariantWarning = formData.visible_to_global_students &&
    !loadingStatus && !pricingStatus?.hasGlobalVariant &&
    formData.pricing_model !== 'free' && !formData.is_free &&
    formData.selling_price;

  const showSuccess = !loadingStatus && pricingStatus?.hasGlobalVariant &&
    formData.visible_to_global_students && !formData.is_free;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="size-5" />
          Course Pricing
        </CardTitle>
        <CardDescription>
          Configure how this course is priced for non-college (global) students.
          Setting a price automatically creates a purchase variant for B2C students.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pricing_model">Pricing Model</Label>
              <Select
                value={formData.pricing_model}
                onValueChange={(val) => setFormData((prev) => ({
                  ...prev,
                  pricing_model: val as PricingModel,
                  is_free: val === 'free'
                }))}
              >
                <SelectTrigger id="pricing_model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="one_time">One-time Purchase</SelectItem>
                  <SelectItem value="subscription_ready">Subscription</SelectItem>
                  <SelectItem value="invite_only">Invite Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price (Rs.)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.selling_price}
                onChange={(e) => setFormData((prev) => ({ ...prev, selling_price: e.target.value }))}
                disabled={formData.is_free}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (MRP) (Rs.)</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.base_price}
                onChange={(e) => setFormData((prev) => ({ ...prev, base_price: e.target.value }))}
                disabled={formData.is_free}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discounted_price">Discounted Price (Rs.)</Label>
              <Input
                id="discounted_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.discounted_price}
                onChange={(e) => setFormData((prev) => ({ ...prev, discounted_price: e.target.value }))}
                disabled={formData.is_free}
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Visible to Global Students</Label>
                <p className="text-xs text-muted-foreground">
                  If enabled, non-college students can see and purchase this course.
                </p>
              </div>
              <Switch
                checked={formData.visible_to_global_students}
                onCheckedChange={(val) => setFormData((prev) => ({ ...prev, visible_to_global_students: val }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show as Paid Course</Label>
                <p className="text-xs text-muted-foreground">
                  {isPaidCourseBuilder(course)
                    ? 'Paid Course Builder courses always appear in the student paid catalog.'
                    : 'When enabled, this master course appears in the student paid course catalog.'}
                </p>
              </div>
              <Switch
                checked={isPaidCourseBuilder(course) ? true : formData.show_as_paid_course}
                disabled={isPaidCourseBuilder(course)}
                onCheckedChange={(val) => setFormData((prev) => ({ ...prev, show_as_paid_course: val }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Invite Only</Label>
                <p className="text-xs text-muted-foreground">
                  Restrict access to specific invited students.
                </p>
              </div>
              <Switch
                checked={formData.is_invite_only}
                onCheckedChange={(val) => setFormData((prev) => ({ ...prev, is_invite_only: val }))}
              />
            </div>
          </div>

          {!loadingStatus && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe className="size-4" />
                Global Purchase Status
              </div>

              {loadingStatus ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Checking variant status...
                </div>
              ) : showSuccess ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  <span>
                    Purchase variant active - Rs.{(pricingStatus?.variantPrice ?? 0) / 100}
                    {pricingStatus?.variantStatus === 'published' ? ' (Published)' : ''}
                  </span>
                </div>
              ) : showVariantWarning ? (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="size-4" />
                  <span>No purchase variant exists yet. Save pricing to create one.</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {formData.is_free || formData.pricing_model === 'free'
                    ? 'Course is free - no purchase variant needed.'
                    : formData.visible_to_global_students
                      ? 'No price set - set a selling price to enable purchases.'
                      : 'Enable "Visible to Global Students" to allow purchases.'}
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Pricing Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
