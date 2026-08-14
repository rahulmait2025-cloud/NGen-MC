'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  Loader2,
  Calendar,
  ArrowUpDown,
  Package,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { CourseBundlesRow, BundlePricePlansRow } from '@/types/database';
import {
  getAllBundlePricePlansAction,
  createBundlePricePlanAction,
  updateBundlePricePlanAction,
  setDefaultBundlePricePlanAction,
  deleteBundlePricePlanAction,
} from '../bundles/bundle-price-plan-actions';

interface Props {
  initialBundles: CourseBundlesRow[];
}

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
  plan_name: 'Standard Access',
  description: '',
  validity_days: '',
  price_minor: '',
  currency: 'INR',
  is_active: true,
  is_default: false,
  sort_order: '0',
};

type LoadingState = { loadingPlans: boolean; busy: boolean };
type LoadingAction =
  | { type: 'LOAD_PLANS_START' }
  | { type: 'LOAD_PLANS_END' }
  | { type: 'BUSY_START' }
  | { type: 'BUSY_END' };

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'LOAD_PLANS_START':
      return { ...state, loadingPlans: true };
    case 'LOAD_PLANS_END':
      return { ...state, loadingPlans: false };
    case 'BUSY_START':
      return { ...state, busy: true };
    case 'BUSY_END':
      return { ...state, busy: false };
  }
}

function formatPrice(minor: number, currency: string) {
  if (currency === 'INR') {
    return `Rs.${(minor / 100).toLocaleString('en-IN')}`;
  }
  return `${currency} ${(minor / 100).toLocaleString()}`;
}

function formatValidity(days: number | null) {
  if (days === null) return 'Lifetime';
  if (days === 365) return '1 year';
  return `${days} days`;
}

function BundlePlanManager({
  selectedBundle,
  formData,
  onFormDataChange,
  editingPlan,
  onCancelEdit,
  onSave,
  busy,
  loadingPlans,
  bundlePlans,
  onSetDefault,
  onEdit,
  onDelete,
}: {
  selectedBundle: CourseBundlesRow;
  formData: PlanFormData;
  onFormDataChange: (updater: (prev: PlanFormData) => PlanFormData) => void;
  editingPlan: BundlePricePlansRow | null;
  onCancelEdit: () => void;
  onSave: () => void;
  busy: boolean;
  loadingPlans: boolean;
  bundlePlans: BundlePricePlansRow[];
  onSetDefault: (planId: string) => void;
  onEdit: (plan: BundlePricePlansRow) => void;
  onDelete: (planId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="size-5" />
              {selectedBundle.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage bundle price plans for LMS checkout.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/bundles/${selectedBundle.slug}`}>Open Bundle</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              Close
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Plan name</Label>
            <Input
              value={formData.plan_name}
              onChange={(e) => onFormDataChange((f) => ({ ...f, plan_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Price (Rs.)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.price_minor}
              onChange={(e) => onFormDataChange((f) => ({ ...f, price_minor: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Validity days (optional)</Label>
            <Input
              type="number"
              min="1"
              value={formData.validity_days}
              onChange={(e) => onFormDataChange((f) => ({ ...f, validity_days: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-sort-order">Sort order</Label>
            <Input
              id="bp-sort-order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => onFormDataChange((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
          <label htmlFor="bp-is-default" className="flex items-center gap-2 text-sm">
            <Switch
              id="bp-is-default"
              checked={formData.is_default}
              onCheckedChange={(v) => onFormDataChange((f) => ({ ...f, is_default: v }))}
            />
            Default plan
          </label>
          <label htmlFor="bp-is-active" className="flex items-center gap-2 text-sm">
            <Switch
              id="bp-is-active"
              checked={formData.is_active}
              onCheckedChange={(v) => onFormDataChange((f) => ({ ...f, is_active: v }))}
            />
            Active
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
            {editingPlan ? 'Update Plan' : 'Add Plan'}
          </Button>
          {editingPlan ? (
            <Button variant="outline" onClick={onCancelEdit}>
              Cancel Edit
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Existing Plans</h4>
          {loadingPlans ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : bundlePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No plans yet.</p>
          ) : (
            bundlePlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg border p-3 ${!plan.is_active ? 'opacity-50 bg-muted/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{plan.plan_name}</span>
                      {plan.is_default ? (
                        <Badge className="text-[10px] gap-1">
                          <Star className="size-3" />
                          Default
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {plan.price_minor <= 0 ? 'Free' : formatPrice(plan.price_minor, plan.currency)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatValidity(plan.validity_days)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!plan.is_default ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onSetDefault(plan.id)}
                      >
                        <Star className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(plan)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onDelete(plan.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BundlePricingClient({ initialBundles }: Props) {
  const [{ loadingPlans, busy }, loadingDispatch] = useReducer(loadingReducer, {
    loadingPlans: false,
    busy: false,
  });
  const [plans, setPlans] = useState<BundlePricePlansRow[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<CourseBundlesRow | null>(null);
  const [editingPlan, setEditingPlan] = useState<BundlePricePlansRow | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const refreshPlans = useCallback(async () => {
    loadingDispatch({ type: 'LOAD_PLANS_START' });
    try {
      const result = await getAllBundlePricePlansAction();
      if (result.ok && result.data) {
        setPlans(result.data as BundlePricePlansRow[]);
      }
    } catch {
      toast.error('Failed to load bundle price plans');
    } finally {
      loadingDispatch({ type: 'LOAD_PLANS_END' });
    }
  }, []);

  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  const filteredBundles = useMemo(
    () =>
      initialBundles.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase())
          || b.slug.toLowerCase().includes(searchQuery.toLowerCase())
          || b.code.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [initialBundles, searchQuery],
  );

  const columns: ColumnDef<CourseBundlesRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Bundle
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.original.slug}</div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.publish_status === 'published' ? 'default' : 'secondary'}>
            {row.original.publish_status}
          </Badge>
        ),
      },
      {
        id: 'activePlans',
        header: 'Active Plans',
        cell: ({ row }) => {
          const count = plans.filter((p) => p.bundle_id === row.original.id && p.is_active).length;
          return <Badge variant={count > 0 ? 'default' : 'secondary'}>{count}</Badge>;
        },
      },
      {
        id: 'defaultPrice',
        header: 'Default Price',
        cell: ({ row }) => {
          const defaultPlan =
            plans.find((p) => p.bundle_id === row.original.id && p.is_default && p.is_active) ?? null;
          if (!defaultPlan) {
            const legacy = row.original.selling_price;
            return legacy != null ? (
              <span className="text-muted-foreground">Legacy Rs.{(legacy / 100).toLocaleString('en-IN')}</span>
            ) : (
              <span className="text-muted-foreground">No default</span>
            );
          }
          return (
            <div className="font-medium">
              {defaultPlan.price_minor <= 0 ? 'Free' : formatPrice(defaultPlan.price_minor, defaultPlan.currency)}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => setSelectedBundle(row.original)}>
            Manage Plans
          </Button>
        ),
      },
    ],
    [plans],
  );

  const table = useReactTable({
    data: filteredBundles,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  async function handleSavePlan() {
    if (!selectedBundle) return;
    const priceMinor = Math.round(parseFloat(formData.price_minor || '0') * 100);
    if (!formData.plan_name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!Number.isFinite(priceMinor) || priceMinor < 0) {
      toast.error('Enter a valid price');
      return;
    }

    loadingDispatch({ type: 'BUSY_START' });
    const payload = {
      plan_name: formData.plan_name.trim(),
      description: formData.description.trim() || undefined,
      validity_days: formData.validity_days ? parseInt(formData.validity_days, 10) : null,
      price_minor: priceMinor,
      currency: formData.currency,
      is_active: formData.is_active,
      is_default: formData.is_default,
      sort_order: parseInt(formData.sort_order || '0', 10),
    };

    const result = editingPlan
      ? await updateBundlePricePlanAction(editingPlan.id, payload)
      : await createBundlePricePlanAction(selectedBundle.id, payload);

    loadingDispatch({ type: 'BUSY_END' });

    if (!result.ok) {
      toast.error(result.error ?? 'Failed to save plan');
      return;
    }

    toast.success(editingPlan ? 'Plan updated' : 'Plan created');
    setEditingPlan(null);
    setFormData(emptyForm);
    await refreshPlans();
  }

  const bundlePlans = selectedBundle
    ? plans.filter((p) => p.bundle_id === selectedBundle.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bundles..."
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                    No bundles found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedBundle ? (
        <BundlePlanManager
          selectedBundle={selectedBundle}
          formData={formData}
          onFormDataChange={(updater) => setFormData(updater)}
          editingPlan={editingPlan}
          onCancelEdit={() => { setEditingPlan(null); setFormData(emptyForm); }}
          onSave={handleSavePlan}
          busy={busy}
          loadingPlans={loadingPlans}
          bundlePlans={bundlePlans}
          onSetDefault={async (planId) => {
            loadingDispatch({ type: 'BUSY_START' });
            const res = await setDefaultBundlePricePlanAction(planId);
            loadingDispatch({ type: 'BUSY_END' });
            if (!res.ok) toast.error(res.error ?? 'Failed');
            else {
              toast.success('Default updated');
              refreshPlans();
            }
          }}
          onEdit={(plan) => {
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
          }}
          onDelete={async (planId) => {
            loadingDispatch({ type: 'BUSY_START' });
            const res = await deleteBundlePricePlanAction(planId);
            loadingDispatch({ type: 'BUSY_END' });
            if (!res.ok) toast.error(res.error ?? 'Failed');
            else {
              toast.success('Plan deleted');
              refreshPlans();
            }
          }}
        />
      ) : null}
    </div>
  );
}
