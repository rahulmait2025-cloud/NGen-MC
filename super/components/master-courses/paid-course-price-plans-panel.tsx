'use client';

import { useCallback, useEffect, useState, useReducer } from 'react';
import { toast } from 'sonner';
import { IndianRupee, Loader2, Plus, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CoursePricePlansRow } from '@/types/database';
import {
  createPricePlanForSourceAction,
  getPricePlansForSourceAction,
  setDefaultPricePlanAction,
  deactivatePricePlanAction,
} from '@/app/(app)/course-pricing/price-plan-actions';

type PaidPriceSourceType = 'master_course' | 'course_variant' | 'paid_course_builder';

interface PaidCoursePricePlansPanelProps {
  sourceType: PaidPriceSourceType;
  sourceId: string;
  masterCourseId: string;
  title?: string;
}

type PlansState = { plans: CoursePricePlansRow[]; loading: boolean };
type PlansAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END'; plans: CoursePricePlansRow[] | null };

function plansReducer(state: PlansState, action: PlansAction): PlansState {
  switch (action.type) {
    case 'LOAD_START': return { ...state, loading: true };
    case 'LOAD_END': return { plans: action.plans ?? state.plans, loading: false };
  }
}

export function PaidCoursePricePlansPanel({
  sourceType,
  sourceId,
  masterCourseId,
  title = 'Price Plans',
}: PaidCoursePricePlansPanelProps) {
  const [{ plans, loading }, dispatchPlans] = useReducer(plansReducer, { plans: [] as CoursePricePlansRow[], loading: true });
  const [busy, setBusy] = useState(false);
  const [planName, setPlanName] = useState('Standard Plan');
  const [priceInr, setPriceInr] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [badgeLabel, setBadgeLabel] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const activePlanCount = plans.filter((p) => p.is_active).length;
  const atMaxPlans = activePlanCount >= 3;

  const loadPlans = useCallback(async () => {
    dispatchPlans({ type: 'LOAD_START' });
    const result = await getPricePlansForSourceAction(sourceType, sourceId);
    dispatchPlans({ type: 'LOAD_END', plans: result.ok && Array.isArray(result.data) ? (result.data as CoursePricePlansRow[]) : null });
  }, [sourceType, sourceId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      dispatchPlans({ type: 'LOAD_START' });
      const result = await getPricePlansForSourceAction(sourceType, sourceId);
      if (cancelled) return;
      dispatchPlans({ type: 'LOAD_END', plans: result.ok && Array.isArray(result.data) ? (result.data as CoursePricePlansRow[]) : null });
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceType, sourceId]);

  const handleCreate = async () => {
    if (atMaxPlans) {
      toast.error('Only 3 pricing plans are allowed. Delete an existing plan to add a new one.');
      return;
    }

    const priceMinor = Math.round(parseFloat(priceInr) * 100);
    if (!planName.trim() || Number.isNaN(priceMinor) || priceMinor <= 0) {
      toast.error('Enter plan name and valid price');
      return;
    }

    setBusy(true);
    const result = await createPricePlanForSourceAction(sourceType, sourceId, masterCourseId, {
      plan_name: planName.trim(),
      price_minor: priceMinor,
      currency: 'INR',
      validity_days: validityDays ? parseInt(validityDays, 10) : null,
      is_active: true,
      is_default: isDefault,
      sort_order: plans.length,
      badge_label: badgeLabel.trim() || null,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error ?? 'Failed to create price plan');
      return;
    }

    toast.success('Price plan created');
    setPriceInr('');
    setValidityDays('');
    await loadPlans();
  };

  const handleSetDefault = async (planId: string) => {
    const result = await setDefaultPricePlanAction(planId);
    if (!result.ok) {
      toast.error(result.error ?? 'Failed to set default plan');
      return;
    }
    await loadPlans();
  };

  const handleDeactivate = async (planId: string) => {
    const result = await deactivatePricePlanAction(planId);
    if (!result.ok) {
      toast.error(result.error ?? 'Failed to deactivate plan');
      return;
    }
    await loadPlans();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="size-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Configure checkout price plans for Student LMS Razorpay purchases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading price plans...
          </div>
        ) : plans.length > 0 ? (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {plan.plan_name}
                    {plan.is_default && (
                      <Star className="size-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ₹{(plan.price_minor / 100).toLocaleString('en-IN')}
                    {plan.validity_days ? ` · ${plan.validity_days} days` : ' · Lifetime'}
                    {!plan.is_active && ' · Inactive'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!plan.is_default && plan.is_active && (
                    <Button type="button" size="sm" variant="outline" onClick={() => handleSetDefault(plan.id)}>
                      Set default
                    </Button>
                  )}
                  {plan.is_active && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleDeactivate(plan.id)}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No price plans yet. Add one below.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 border-t border-border/40 pt-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Plan name</Label>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Price (INR)</Label>
            <Input value={priceInr} onChange={(e) => setPriceInr(e.target.value)} placeholder="999" />
          </div>
          <div className="space-y-1.5">
            <Label>Validity days (optional)</Label>
            <Input value={validityDays} onChange={(e) => setValidityDays(e.target.value)} placeholder="365" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Badge label (optional)</Label>
            <Input
              value={badgeLabel}
              onChange={(e) => setBadgeLabel(e.target.value)}
              placeholder="Recommended, Best Value"
            />
          </div>
          <div className="flex items-center justify-between sm:col-span-2">
            <Label>Default plan</Label>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
          <div className="sm:col-span-2">
            {atMaxPlans ? (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Only 3 pricing plans are allowed. Delete an existing plan to add a new one.
              </p>
            ) : null}
            <Button type="button" onClick={handleCreate} disabled={busy || atMaxPlans}>
              {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
              Add price plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
