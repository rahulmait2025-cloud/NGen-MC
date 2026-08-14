'use client';

import { useState, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  IndianRupee,
  Search,
  Settings2,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  Loader2,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { CoursePricePlansRow } from '@/types/database';
import type { PricableProductRow } from '@/lib/services/pricable-products';
import { pricableProductKindLabel } from '@/lib/services/pricable-products';
import {
  getAllPricePlansAction,
  createPricePlanForSourceAction,
  updatePricePlanAction,
  setDefaultPricePlanAction,
  deletePricePlanAction,
} from './price-plan-actions';

interface Props {
  initialProducts: PricableProductRow[];
}

function getPlansForProduct(plans: CoursePricePlansRow[], product: PricableProductRow): CoursePricePlansRow[] {
  return plans.filter(
    (plan) =>
      plan.source_type === product.sourceType
      && plan.source_id === product.sourceId
      && plan.is_active,
  );
}

function getAllPlansForProduct(plans: CoursePricePlansRow[], product: PricableProductRow): CoursePricePlansRow[] {
  return plans.filter(
    (plan) => plan.source_type === product.sourceType && plan.source_id === product.sourceId,
  );
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
  plan_name: '',
  description: '',
  validity_days: '',
  price_minor: '',
  currency: 'INR',
  is_active: true,
  is_default: false,
  sort_order: '0',
};

const PAGE_SIZE = 20;

type LoadingState = { loadingPlans: boolean; busy: boolean };
type LoadingAction =
  | { type: 'LOAD_PLANS_START' }
  | { type: 'LOAD_PLANS_END' }
  | { type: 'BUSY_START' }
  | { type: 'BUSY_END' };

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'LOAD_PLANS_START': return { ...state, loadingPlans: true };
    case 'LOAD_PLANS_END': return { ...state, loadingPlans: false };
    case 'BUSY_START': return { ...state, busy: true };
    case 'BUSY_END': return { ...state, busy: false };
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
  if (days === 30) return '1 month';
  if (days === 90) return '3 months';
  if (days === 180) return '6 months';
  if (days === 365) return '1 year';
  if (days === 730) return '2 years';
  return `${days} days`;
}

interface PricingPopupProps {
  product: PricableProductRow;
  plans: CoursePricePlansRow[];
  loadingPlans: boolean;
  busy: boolean;
  editingPlan: CoursePricePlansRow | null;
  formData: PlanFormData;
  onSetEditingPlan: (plan: CoursePricePlansRow | null) => void;
  onSetFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onDeactivate: (planId: string, currentlyActive: boolean) => void;
  onSetDefault: (planId: string) => void;
  onDelete: (planId: string) => void;
  onStartEdit: (plan: CoursePricePlansRow) => void;
  onClose: () => void;
}

function PricingPopup({
  product,
  plans,
  loadingPlans,
  busy,
  editingPlan,
  formData,
  onSetEditingPlan,
  onSetFormData,
  onSubmit,
  onDeactivate,
  onSetDefault,
  onDelete,
  onStartEdit,
  onClose,
}: PricingPopupProps) {
  const productPlans = getAllPlansForProduct(plans, product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="presentation"
      />
      <div className="relative z-50 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border/50 bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pricing: {product.title}</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {pricableProductKindLabel(product.kind)} — manage checkout price plans
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
          <div className="rounded-xl border border-border/40 bg-background/50 p-5">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-foreground">
                  {editingPlan ? 'Edit Plan' : 'New Plan'}
                </h3>
                {editingPlan && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px]"
                    onClick={() => { onSetEditingPlan(null); onSetFormData(emptyForm); }}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium">Plan Name *</Label>
                  <Input
                    className="h-9 text-[13px]"
                    value={formData.plan_name}
                    onChange={(e) => onSetFormData((p) => ({ ...p, plan_name: e.target.value }))}
                    placeholder="e.g., 6 months access"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium">Price (Rs.) *</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    className="h-9 text-[13px]"
                    value={formData.price_minor}
                    onChange={(e) => onSetFormData((p) => ({ ...p, price_minor: e.target.value }))}
                    placeholder="e.g., 499"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium">Validity Days</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-9 text-[13px]"
                    value={formData.validity_days}
                    onChange={(e) => onSetFormData((p) => ({ ...p, validity_days: e.target.value }))}
                    placeholder="Empty = lifetime"
                  />
                  <p className="text-[11px] text-muted-foreground">180 = 6 months, 365 = 1 year</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => onSetFormData((p) => ({ ...p, currency: v }))}>
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (Rs.)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Description</Label>
                <Input
                  className="h-9 text-[13px]"
                  value={formData.description}
                  onChange={(e) => onSetFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description for students"
                />
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-[12px] font-medium">Active</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Inactive plans are hidden from students</p>
                  </div>
                  <Toggle
                    size="sm"
                    className="p-0 size-8 data-[state=on]:bg-transparent hover:bg-transparent"
                    pressed={formData.is_active}
                    onPressedChange={(v) => onSetFormData((p) => ({ ...p, is_active: v }))}
                  >
                    {formData.is_active ? (
                      <ToggleRight className="size-8 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="size-8 text-destructive dark:text-red-400" />
                    )}
                  </Toggle>
                </div>

                <div className="h-px bg-border/40" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-[12px] font-medium">Default Plan</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Shown as the primary option</p>
                  </div>
                  <Switch checked={formData.is_default} onCheckedChange={(v) => onSetFormData((p) => ({ ...p, is_default: v }))} />
                </div>
              </div>

              <Button type="submit" className="w-full h-9 text-[13px] font-medium" disabled={busy}>
                {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Plus className="mr-1.5 size-3.5" />}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </form>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-foreground mb-3">Existing Plans</h3>
            {loadingPlans ? (
              <div className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground py-8">
                <Loader2 className="size-4 animate-spin" /> Loading plans...
              </div>
            ) : productPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-border/40 border-dashed">
                <p className="text-[13px] text-muted-foreground">No plans yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Create your first pricing plan above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`group rounded-lg border border-border/40 p-3.5 transition-colors hover:bg-muted/20 ${
                      !plan.is_active ? 'bg-muted/20' : 'bg-background/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex-1 min-w-0 ${!plan.is_active ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-foreground truncate">{plan.plan_name}</span>
                          {plan.is_default && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              <Star className="size-3" /> Default
                            </span>
                          )}
                          {!plan.is_active && (
                            <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground text-[12px]">{formatPrice(plan.price_minor, plan.currency)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" /> {formatValidity(plan.validity_days)}
                          </span>
                          <span className="text-muted-foreground/70">Order: {plan.sort_order}</span>
                        </div>
                        {plan.description && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{plan.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 transition-opacity">
                        {plan.is_active && !plan.is_default && (
                          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => onSetDefault(plan.id)} title="Set as default">
                            <Star className="size-3.5" />
                          </Button>
                        )}
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
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => onStartEdit(plan)} title="Edit">
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(plan.id)} title="Delete">
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
      </div>
    </div>
  );
}

export function CoursePricingClient({ initialProducts }: Props) {
  const [{ loadingPlans, busy }, loadingDispatch] = useReducer(loadingReducer, { loadingPlans: false, busy: false });
  const [plans, setPlans] = useState<CoursePricePlansRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PricableProductRow | null>(null);
  const [editingPlan, setEditingPlan] = useState<CoursePricePlansRow | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);

  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId');
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sorting, setSorting] = useState<SortingState>([]);

  const refreshPlans = useCallback(async () => {
    loadingDispatch({ type: 'LOAD_PLANS_START' });
    try {
      const result = await getAllPricePlansAction();
      if (result.ok && result.data) {
        setPlans(result.data as CoursePricePlansRow[]);
      }
    } catch {
      toast.error('Failed to load price plans');
    } finally {
      loadingDispatch({ type: 'LOAD_PLANS_END' });
    }
  }, []);

  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  useEffect(() => {
    if (initialCourseId && initialProducts.length > 0) {
      const prod = initialProducts.find(
        (p) => p.sourceId === initialCourseId || p.masterCourseId === initialCourseId
      );
      if (prod) {
        setSelectedProduct(prod);
        setEditingPlan(null);
        setFormData(emptyForm);
      }
    }
  }, [initialCourseId, initialProducts]);

  const filteredProducts = useMemo(
    () => initialProducts.filter(
      (product) =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [initialProducts, searchQuery],
  );

  const columns: ColumnDef<PricableProductRow>[] = useMemo(() => [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <span>Product</span>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.code}</div>
        </div>
      ),
    },
    {
      id: 'productType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">{pricableProductKindLabel(row.original.kind)}</Badge>
      ),
    },
    {
      id: 'activePlans',
      header: 'Active Plans',
      cell: ({ row }) => {
        const count = getPlansForProduct(plans, row.original).length;
        return (
          <Badge
            variant={count > 0 ? 'outline' : 'secondary'}
            className={`font-mono ${
              count > 0
                ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20'
                : ''
            }`}
          >
            {count} plan{count !== 1 ? 's' : ''}
          </Badge>
        );
      },
    },
    {
      id: 'defaultPrice',
      header: 'Default Price',
      cell: ({ row }) => {
        const defaultPlan = getAllPlansForProduct(plans, row.original).find((p) => p.is_default && p.is_active) ?? null;
        if (!defaultPlan) {
          return <span className="text-muted-foreground">No default</span>;
        }
        return (
          <div className="flex items-center gap-1 font-medium">
            <IndianRupee className="size-3" />
            {(defaultPlan.price_minor / 100).toLocaleString('en-IN')}
            {defaultPlan.validity_days && (
              <span className="text-xs text-muted-foreground ml-1">
                / {formatValidity(defaultPlan.validity_days)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedProduct(row.original);
              setEditingPlan(null);
              setFormData(emptyForm);
              refreshPlans();
            }}
            className="gap-2"
          >
            <Settings2 className="size-4" />
            Manage Plans
          </Button>
        </div>
      ),
    },
  ], [plans, refreshPlans]);

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

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
    if (!selectedProduct) return;
    loadingDispatch({ type: 'BUSY_START' });

    const priceMinor = parseInt(formData.price_minor, 10);
    if (isNaN(priceMinor) || priceMinor < 0) {
      toast.error('Price must be a valid non-negative number');
      loadingDispatch({ type: 'BUSY_END' });
      return;
    }

    const validityDays = formData.validity_days ? parseInt(formData.validity_days, 10) : null;
    if (validityDays !== null && (isNaN(validityDays) || validityDays <= 0)) {
      toast.error('Validity days must be a positive number or empty for lifetime');
      loadingDispatch({ type: 'BUSY_END' });
      return;
    }

    try {
      if (editingPlan) {
        const result = await updatePricePlanAction(editingPlan.id, {
          plan_name: formData.plan_name,
          description: formData.description || undefined,
          validity_days: validityDays,
          price_minor: priceMinor * 100,
          currency: formData.currency,
          is_active: formData.is_active,
          is_default: formData.is_default,
          sort_order: parseInt(formData.sort_order, 10) || 0,
        });
        if (result.ok) {
          toast.success('Plan updated');
          await refreshPlans();
          setEditingPlan(null);
          setFormData(emptyForm);
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createPricePlanForSourceAction(
          selectedProduct.sourceType,
          selectedProduct.sourceId,
          selectedProduct.masterCourseId,
          {
            plan_name: formData.plan_name,
            description: formData.description || undefined,
            validity_days: validityDays,
            price_minor: priceMinor * 100,
            currency: formData.currency,
            is_active: formData.is_active,
            is_default: formData.is_default,
            sort_order: parseInt(formData.sort_order, 10) || 0,
          },
        );
        if (result.ok) {
          toast.success('Plan created');
          await refreshPlans();
          setFormData(emptyForm);
        } else {
          toast.error(result.error);
        }
      }
    } catch {
      toast.error('Operation failed');
    } finally {
      loadingDispatch({ type: 'BUSY_END' });
    }
  }

  async function handleDeactivate(planId: string, currentlyActive: boolean) {
    if (!selectedProduct) return;
    const nextActive = !currentlyActive;
    const result = await updatePricePlanAction(planId, {
      is_active: nextActive,
      ...(nextActive ? {} : { is_default: false })
    });
    if (result.ok) {
      toast.success(nextActive ? 'Plan activated' : 'Plan deactivated');
      await refreshPlans();
    } else {
      toast.error(result.error);
    }
  }

  async function handleSetDefault(planId: string) {
    if (!selectedProduct) return;
    const result = await setDefaultPricePlanAction(planId);
    if (result.ok) {
      toast.success('Default plan updated');
      await refreshPlans();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(planId: string) {
    if (!selectedProduct) return;
    if (!confirm('Delete this price plan?')) return;
    const result = await deletePricePlanAction(planId);
    if (result.ok) {
      toast.success('Plan deleted');
      await refreshPlans();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Course Pricing</h1>
          <p className="text-muted-foreground">
            Manage price plans for paid courses, paid master courses, and paid variants enabled in Super Admin.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={header.id === 'actions' ? 'text-right' : ''}>
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
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">
                    No sellable products found. Enable Paid Course on a master course or variant first.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} total product{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing Popup */}
      {selectedProduct && (
        <PricingPopup
          product={selectedProduct}
          plans={plans}
          loadingPlans={loadingPlans}
          busy={busy}
          editingPlan={editingPlan}
          formData={formData}
          onSetEditingPlan={setEditingPlan}
          onSetFormData={setFormData}
          onSubmit={handleSubmit}
          onDeactivate={handleDeactivate}
          onSetDefault={handleSetDefault}
          onDelete={handleDelete}
          onStartEdit={startEdit}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
