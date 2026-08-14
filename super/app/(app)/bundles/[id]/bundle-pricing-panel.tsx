'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  createBundlePricePlanAction,
  deleteBundlePricePlanAction,
  setDefaultBundlePricePlanAction,
  updateBundlePricePlanAction,
} from '../bundle-price-plan-actions';
import type { BundlePricePlansRow } from '@/types/database';

interface BundlePricingPanelProps {
  bundleId: string;
  initialPlans: BundlePricePlansRow[];
}

export function BundlePricingPanel({ bundleId, initialPlans }: BundlePricingPanelProps) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => ({
    plan_name: 'Standard Access',
    price_rupees: '',
    validity_days: '',
    is_default: plans.length === 0,
  }));

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function handleCreate() {
    const priceMinor = Math.round(parseFloat(form.price_rupees || '0') * 100);
    if (!form.plan_name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setBusyId('create');
    const res = await createBundlePricePlanAction(bundleId, {
      plan_name: form.plan_name.trim(),
      price_minor: Number.isFinite(priceMinor) ? priceMinor : 0,
      validity_days: form.validity_days ? parseInt(form.validity_days, 10) : null,
      is_default: form.is_default,
      currency: 'INR',
      is_active: true,
      sort_order: plans.length,
    });
    setBusyId(null);

    if (!res.ok) {
      toast.error(res.error ?? 'Failed to create plan');
      return;
    }

    toast.success('Price plan created');
    setShowForm(false);
    if (res.data) setPlans((prev) => [...prev, res.data as BundlePricePlansRow]);
    refresh();
  }

  async function handleSetDefault(planId: string) {
    setBusyId(planId);
    const res = await setDefaultBundlePricePlanAction(planId);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error ?? 'Failed to set default');
      return;
    }
    toast.success('Default plan updated');
    refresh();
  }

  async function handleDelete(planId: string) {
    setBusyId(planId);
    const res = await deleteBundlePricePlanAction(planId);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error ?? 'Failed to delete plan');
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    toast.success('Plan deleted');
    refresh();
  }

  async function handleToggleActive(plan: BundlePricePlansRow) {
    setBusyId(plan.id);
    const res = await updateBundlePricePlanAction(plan.id, { is_active: !plan.is_active });
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error ?? 'Failed to update plan');
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Bundle Pricing</h2>
          <p className="text-sm text-muted-foreground">Price plans used for LMS checkout.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4 mr-1" />
          Add Plan
        </Button>
      </div>

      {showForm ? (
        <div className="grid gap-3 rounded-md border border-dashed p-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Plan name</Label>
            <Input value={form.plan_name} onChange={(e) => setForm((f) => ({ ...f, plan_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Price (₹)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.price_rupees}
              onChange={(e) => setForm((f) => ({ ...f, price_rupees: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validity-days">Validity (days, optional)</Label>
            <Input
              id="validity-days"
              type="number"
              min="1"
              value={form.validity_days}
              onChange={(e) => setForm((f) => ({ ...f, validity_days: e.target.value }))}
            />
          </div>
          <label htmlFor="plan-is-default" className="flex items-center gap-2 text-sm pt-6">
            <Switch
              id="plan-is-default"
              checked={form.is_default}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, is_default: checked }))}
            />
            Set as default plan
          </label>
          <div className="md:col-span-2 flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={busyId === 'create'}>
              {busyId === 'create' ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
              Save Plan
            </Button>
          </div>
        </div>
      ) : null}

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No price plans yet. Legacy selling_price is used until a plan exists.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="font-medium text-sm">
                  {plan.plan_name}
                  {plan.is_default ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">Default</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  ₹{(plan.price_minor / 100).toLocaleString('en-IN')}
                  {plan.validity_days ? ` · ${plan.validity_days} days` : ' · Lifetime'}
                  {plan.is_active ? '' : ' · Inactive'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`plan-active-${plan.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch id={`plan-active-${plan.id}`} checked={plan.is_active} onCheckedChange={() => handleToggleActive(plan)} />
                  Active
                </label>
                {!plan.is_default ? (
                  <Button size="sm" variant="ghost" onClick={() => handleSetDefault(plan.id)} disabled={busyId === plan.id}>
                    <Star className="size-3.5" />
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => handleDelete(plan.id)} disabled={busyId === plan.id}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
