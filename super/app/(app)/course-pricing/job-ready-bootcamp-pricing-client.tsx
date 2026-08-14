'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';
import {
  IndianRupee,
  Settings2,
  Plus,
  Edit2,
  Trash2,
  Star,
  Loader2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { BootcampsRow, CoursePricePlansRow } from '@/types/database';
import {
  createJobReadyBootcampPricePlanAction,
  createJobReadyBootcampProductAction,
  deleteJobReadyBootcampPricePlanAction,
  getJobReadyBootcampPricingOverviewAction,
  setDefaultJobReadyBootcampPricePlanAction,
  updateJobReadyBootcampPricePlanAction,
} from './job-ready-bootcamp-pricing-actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JOB_READY_BOOTCAMP_SLUG } from '@/lib/constants/job-ready-bootcamp';

interface PlanFormData {
  plan_name: string;
  description: string;
  validity_days: string;
  price_minor: string;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: string;
}

const emptyForm: PlanFormData = {
  plan_name: 'Job Ready Bootcamp — Full Program',
  description: '',
  validity_days: '',
  price_minor: '',
  currency: 'INR',
  is_active: true,
  is_default: true,
  sort_order: '0',
};

type LoadingState = { loading: boolean; busy: boolean; creatingProduct: boolean };
type LoadingAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END' }
  | { type: 'BUSY_START' }
  | { type: 'BUSY_END' }
  | { type: 'CREATE_PRODUCT_START' }
  | { type: 'CREATE_PRODUCT_END' };

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true };
    case 'LOAD_END':
      return { ...state, loading: false };
    case 'BUSY_START':
      return { ...state, busy: true };
    case 'BUSY_END':
      return { ...state, busy: false };
    case 'CREATE_PRODUCT_START':
      return { ...state, creatingProduct: true };
    case 'CREATE_PRODUCT_END':
      return { ...state, creatingProduct: false };
  }
}

function formatPrice(minor: number, currency: string) {
  if (currency === 'INR') {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  }
  return `${currency} ${(minor / 100).toLocaleString()}`;
}

function formatValidity(days: number | null) {
  if (days === null) return 'Lifetime';
  if (days === 365) return '1 year';
  return `${days} days`;
}

interface Props {
  initialProduct?: BootcampsRow | null;
  initialPlans?: CoursePricePlansRow[];
}

const EMPTY_BOOTCAMP_PLANS: never[] = [];

function BootcampPlanSheet({
  product,
  manageOpen,
  onManageOpenChange,
  editingPlan,
  onCancelEdit,
  formData,
  onFormDataChange,
  onSubmit,
  busy,
  bootcampPlans,
  onSetDefault,
  onDeactivate,
  onDelete,
  onStartEdit,
  onIsActiveChange,
  onIsDefaultChange,
}: {
  product: BootcampsRow;
  manageOpen: boolean;
  onManageOpenChange: (open: boolean) => void;
  editingPlan: CoursePricePlansRow | null;
  onCancelEdit: () => void;
  formData: PlanFormData;
  onFormDataChange: (updater: (prev: PlanFormData) => PlanFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  bootcampPlans: CoursePricePlansRow[];
  onSetDefault: (planId: string) => void;
  onDeactivate: (planId: string, currentlyActive: boolean) => void;
  onDelete: (planId: string) => void;
  onStartEdit: (plan: CoursePricePlansRow) => void;
  onIsActiveChange: (value: boolean) => void;
  onIsDefaultChange: (value: boolean) => void;
}) {
  return (
    <Sheet open={manageOpen} onOpenChange={onManageOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-5 pr-12 text-left">
          <SheetTitle className="text-lg">Manage Plans</SheetTitle>
          <SheetDescription>
            {product.title} — powers Razorpay checkout on bootcamp landing and connected-course CTAs.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-5">
            <form id="bootcamp-plan-form" onSubmit={onSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{editingPlan ? 'Edit Plan' : 'New Plan'}</h3>
                {editingPlan ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEdit}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="plan_name">Plan Name *</Label>
                  <Input
                    id="plan_name"
                    value={formData.plan_name}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, plan_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_minor">Price (₹) *</Label>
                  <Input
                    id="price_minor"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.price_minor}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, price_minor: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => onFormDataChange((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="validity_days">Validity Days</Label>
                  <Input
                    id="validity_days"
                    type="number"
                    min="1"
                    value={formData.validity_days}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, validity_days: e.target.value }))}
                    placeholder="Empty = lifetime access"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description for checkout"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Inactive plans are hidden from students</p>
                </div>
                <Toggle
                  id="is_active"
                  size="sm"
                  className="p-0 size-8 data-[state=on]:bg-transparent hover:bg-transparent"
                  pressed={formData.is_active}
                  onPressedChange={onIsActiveChange}
                >
                  {formData.is_active ? (
                    <ToggleRight className="size-8 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="size-8 text-destructive dark:text-red-400" />
                  )}
                </Toggle>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label htmlFor="is_default">Default Plan</Label>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={onIsDefaultChange}
                />
              </div>
            </form>

            <Separator />

            <div>
              <h3 className="mb-3 text-sm font-semibold">Existing Plans</h3>
              {bootcampPlans.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No plans yet. Add one above.
                </p>
              ) : (
                <div className="space-y-2 pb-2">
                  {bootcampPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`rounded-lg border p-3 ${!plan.is_active ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`min-w-0 flex-1 ${!plan.is_active ? 'opacity-60' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{plan.plan_name}</span>
                            {plan.is_default ? (
                              <Badge className="gap-1 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700">
                                <Star className="size-3" />
                                Default
                              </Badge>
                            ) : null}
                            {!plan.is_active ? (
                              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {formatPrice(plan.price_minor, plan.currency)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatValidity(plan.validity_days)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {plan.is_active && !plan.is_default ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => onSetDefault(plan.id)}
                              title="Set as default"
                            >
                              <Star className="size-3.5" />
                            </Button>
                          ) : null}
                          <Toggle
                            size="sm"
                            className="size-7 p-0 data-[state=on]:bg-transparent"
                            pressed={plan.is_active}
                            onPressedChange={() => onDeactivate(plan.id, plan.is_active)}
                            title={plan.is_active ? "Deactivate" : "Reactivate"}
                          >
                            {plan.is_active ? (
                              <ToggleRight className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ToggleLeft className="size-3.5 text-destructive dark:text-red-400" />
                            )}
                          </Toggle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => onStartEdit(plan)}
                            title="Edit"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(plan.id)}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t px-6 py-4">
          <Button
            type="submit"
            form="bootcamp-plan-form"
            className="w-full gap-2"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function JobReadyBootcampPricingClient({
  initialProduct = null,
  initialPlans = EMPTY_BOOTCAMP_PLANS,
}: Props) {
  const [{ loading, busy, creatingProduct }, loadingDispatch] = useReducer(loadingReducer, {
    loading: false,
    busy: false,
    creatingProduct: false,
  });
  const [product, setProduct] = useState<BootcampsRow | null>(initialProduct);
  const [plans, setPlans] = useState<CoursePricePlansRow[]>(initialPlans);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CoursePricePlansRow | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);

  const refreshOverview = useCallback(async () => {
    loadingDispatch({ type: 'LOAD_START' });
    try {
      const result = await getJobReadyBootcampPricingOverviewAction();
      if (result.ok && result.data) {
        const data = result.data as { product: BootcampsRow | null; plans: CoursePricePlansRow[] };
        setProduct(data.product);
        setPlans(data.plans);
      } else {
        toast.error(result.error ?? 'Failed to load Job Ready Bootcamp pricing');
      }
    } catch {
      toast.error('Failed to load Job Ready Bootcamp pricing');
    } finally {
      loadingDispatch({ type: 'LOAD_END' });
    }
  }, []);

  useEffect(() => {
    if (!initialProduct && initialPlans.length === 0) {
      void refreshOverview();
    }
  }, [initialProduct, initialPlans.length, refreshOverview]);

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.source_type === 'job_ready_bootcamp' && plan.is_active),
    [plans],
  );

  const defaultPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          plan.source_type === 'job_ready_bootcamp'
          && plan.source_id === product?.id
          && plan.is_default
          && plan.is_active,
      ) ?? null,
    [plans, product?.id],
  );

  async function handleCreateProduct() {
    loadingDispatch({ type: 'CREATE_PRODUCT_START' });
    try {
      const result = await createJobReadyBootcampProductAction();
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to create product');
        return;
      }
      toast.success('Job Ready Bootcamp product created');
      await refreshOverview();
    } catch {
      toast.error('Failed to create product');
    } finally {
      loadingDispatch({ type: 'CREATE_PRODUCT_END' });
    }
  }

  function startEdit(plan: CoursePricePlansRow) {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      description: plan.description ?? '',
      validity_days: plan.validity_days?.toString() ?? '',
      price_minor: (plan.price_minor / 100).toString(),
      currency: plan.currency,
      is_active: plan.is_active,
      is_default: plan.is_default,
      sort_order: plan.sort_order.toString(),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    loadingDispatch({ type: 'BUSY_START' });

    const priceMinor = Math.round(parseFloat(formData.price_minor || '0') * 100);
    if (!formData.plan_name.trim()) {
      toast.error('Plan name is required');
      loadingDispatch({ type: 'BUSY_END' });
      return;
    }
    if (!Number.isFinite(priceMinor) || priceMinor <= 0) {
      toast.error('Price is required and must be greater than 0');
      loadingDispatch({ type: 'BUSY_END' });
      return;
    }

    const validityDays = formData.validity_days ? parseInt(formData.validity_days, 10) : null;
    if (validityDays !== null && (Number.isNaN(validityDays) || validityDays <= 0)) {
      toast.error('Validity days must be positive or empty for lifetime');
      loadingDispatch({ type: 'BUSY_END' });
      return;
    }

    const payload = {
      plan_name: formData.plan_name.trim(),
      description: formData.description.trim() || undefined,
      validity_days: validityDays,
      price_minor: priceMinor,
      currency: formData.currency,
      is_active: formData.is_active,
      is_default: formData.is_default,
      sort_order: parseInt(formData.sort_order, 10) || 0,
    };

    try {
      const result = editingPlan
        ? await updateJobReadyBootcampPricePlanAction(editingPlan.id, payload)
        : await createJobReadyBootcampPricePlanAction(product.id, payload);

      if (!result.ok) {
        toast.error(result.error ?? 'Failed to save plan');
        return;
      }

      toast.success(editingPlan ? 'Plan updated' : 'Plan created');
      setEditingPlan(null);
      setFormData(emptyForm);
      await refreshOverview();
    } catch {
      toast.error('Operation failed');
    } finally {
      loadingDispatch({ type: 'BUSY_END' });
    }
  }

  async function handleDeactivate(planId: string, currentlyActive: boolean) {
    const nextActive = !currentlyActive;
    const result = await updateJobReadyBootcampPricePlanAction(planId, {
      is_active: nextActive,
      ...(nextActive ? {} : { is_default: false })
    });
    if (result.ok) {
      toast.success(nextActive ? 'Plan activated' : 'Plan deactivated');
      await refreshOverview();
    } else {
      toast.error(result.error);
    }
  }

  async function handleSetDefault(planId: string) {
    const result = await setDefaultJobReadyBootcampPricePlanAction(planId);
    if (result.ok) {
      toast.success('Default plan updated');
      await refreshOverview();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm('Delete this price plan?')) return;
    const result = await deleteJobReadyBootcampPricePlanAction(planId);
    if (result.ok) {
      toast.success('Plan deleted');
      await refreshOverview();
    } else {
      toast.error(result.error);
    }
  }

  const handleIsActiveChange = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: value }));
  }, []);

  const handleIsDefaultChange = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, is_default: value }));
  }, []);

  const bootcampPlans = product
    ? plans.filter((plan) => plan.source_type === 'job_ready_bootcamp' && plan.source_id === product.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Job Ready Bootcamp Pricing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage price plans for the complete Job Ready Bootcamp checkout.
        </p>
      </div>

      {loading && !product ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="size-4 animate-spin" />
          Loading Job Ready Bootcamp product…
        </div>
      ) : !product ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <GraduationCap className="mx-auto size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Job Ready Bootcamp product is not configured yet.</p>
            <Button onClick={() => void handleCreateProduct()} disabled={creatingProduct}>
              {creatingProduct ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Job Ready Bootcamp Product'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{product.title}</h3>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {JOB_READY_BOOTCAMP_SLUG}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{product.slug}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {product.publish_status === 'published' ? (
                      <Badge>Published</Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {product.publish_status}
                      </Badge>
                    )}
                    <Badge
                      variant={activePlans.length > 0 ? 'outline' : 'secondary'}
                      className={
                        activePlans.length > 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20'
                          : ''
                      }
                    >
                      {activePlans.length} active plan{activePlans.length === 1 ? '' : 's'}
                    </Badge>
                    <Badge variant="outline">Program purchase</Badge>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Default price: </span>
                    {defaultPlan ? (
                      <span className="font-semibold inline-flex items-center gap-1">
                        <IndianRupee className="size-3.5" />
                        {formatPrice(defaultPlan.price_minor, defaultPlan.currency)}
                      </span>
                    ) : (
                      <span className="text-amber-700">No default plan</span>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setManageOpen(true);
                      setEditingPlan(null);
                      setFormData(emptyForm);
                    }}
                    className="gap-2"
                  >
                    <Settings2 className="size-4" />
                    Manage Plans
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {activePlans.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No active price plan configured yet. Add a default price plan to enable checkout.
            </div>
          ) : null}
        </>
      )}

      {product && (
        <BootcampPlanSheet
          product={product}
          manageOpen={manageOpen}
          onManageOpenChange={setManageOpen}
          editingPlan={editingPlan}
          onCancelEdit={() => { setEditingPlan(null); setFormData(emptyForm); }}
          formData={formData}
          onFormDataChange={(updater) => setFormData(updater)}
          onSubmit={handleSubmit}
          busy={busy}
          bootcampPlans={bootcampPlans}
          onSetDefault={handleSetDefault}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
          onStartEdit={startEdit}
          onIsActiveChange={handleIsActiveChange}
          onIsDefaultChange={handleIsDefaultChange}
        />
      )}
    </div>
  );
}
