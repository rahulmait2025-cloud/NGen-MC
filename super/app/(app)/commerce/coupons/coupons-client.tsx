'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createCouponAction, updateCouponAction, toggleCouponStatusAction, deleteCouponAction } from './actions';
import type { SellableEntityType, PurchaseSource } from '@/types/database';

type CouponStatus = 'active' | 'expired' | 'exhausted' | 'disabled';

interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string | null;
  status: CouponStatus;
  applicable_entity_types: SellableEntityType[];
  applicable_entity_ids: string[] | null;
  min_order_amount_minor: number | null;
  applicable_sources: PurchaseSource[];
}

interface CouponFormData {
  code: string;
  description: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: string;
  max_uses: string;
  max_uses_per_user: string;
  valid_from: string;
  valid_until: string;
  applicable_entity_types: SellableEntityType[];
  min_order_amount_minor: string;
  applicable_sources: PurchaseSource[];
}

function defaultFormData(editing?: CouponRow | null): CouponFormData {
  if (editing) {
    return {
      code: editing.code,
      description: editing.description ?? '',
      discount_type: editing.discount_type,
      discount_value: String(editing.discount_value),
      max_uses: editing.max_uses ? String(editing.max_uses) : '',
      max_uses_per_user: String(editing.max_uses_per_user),
      valid_from: editing.valid_from.split('T')[0],
      valid_until: editing.valid_until ? editing.valid_until.split('T')[0] : '',
      applicable_entity_types: [...editing.applicable_entity_types],
      min_order_amount_minor: editing.min_order_amount_minor ? String(editing.min_order_amount_minor) : '',
      applicable_sources: [...editing.applicable_sources],
    };
  }
  return {
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: '',
    max_uses_per_user: '1',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    applicable_entity_types: ['master_course', 'course_variant'],
    min_order_amount_minor: '',
    applicable_sources: ['lms', 'college_admin'],
  };
}

function ApplicableEntitiesSection({
  applicableEntityTypes,
  applicableSources,
  onToggleEntityType,
  onToggleSource,
  onSetEntityTypes,
}: {
  applicableEntityTypes: SellableEntityType[];
  applicableSources: PurchaseSource[];
  onToggleEntityType: (type: SellableEntityType) => void;
  onToggleSource: (source: PurchaseSource) => void;
  onSetEntityTypes: (types: SellableEntityType[]) => void;
}) {
  return (
    <>
      {/* Applicable Entity Types */}
      <div className="space-y-3">
        <Label>Applicable To</Label>
        <p className="text-xs text-muted-foreground">
          Choose which product types this coupon can apply to at LMS checkout.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSetEntityTypes(['master_course', 'course_variant', 'course_bundle'])}
          >
            All courses
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSetEntityTypes(['master_course', 'course_variant'])}
          >
            Courses only
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSetEntityTypes(['course_bundle'])}
          >
            Bundles only
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSetEntityTypes(['note_collection'])}
          >
            Notes only
          </Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="entity_master_course"
              checked={applicableEntityTypes.includes('master_course')}
              onCheckedChange={() => onToggleEntityType('master_course')}
            />
            <Label htmlFor="entity_master_course" className="text-sm font-normal">
              Master Courses
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="entity_variant"
              checked={applicableEntityTypes.includes('course_variant')}
              onCheckedChange={() => onToggleEntityType('course_variant')}
            />
            <Label htmlFor="entity_variant" className="text-sm font-normal">
              Course Variants
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="entity_bundle"
              checked={applicableEntityTypes.includes('course_bundle')}
              onCheckedChange={() => onToggleEntityType('course_bundle')}
            />
            <Label htmlFor="entity_bundle" className="text-sm font-normal">
              Bundles
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="entity_note_collection"
              checked={applicableEntityTypes.includes('note_collection')}
              onCheckedChange={() => onToggleEntityType('note_collection')}
            />
            <Label htmlFor="entity_note_collection" className="text-sm font-normal">
              Note Collections
            </Label>
          </div>
        </div>
      </div>

      {/* Applicable Sources */}
      <div className="space-y-3">
        <Label>Applicable Sources</Label>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="source_lms"
              checked={applicableSources.includes('lms')}
              onCheckedChange={() => onToggleSource('lms')}
            />
            <Label htmlFor="source_lms" className="text-sm font-normal">
              LMS
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="source_college"
              checked={applicableSources.includes('college_admin')}
              onCheckedChange={() => onToggleSource('college_admin')}
            />
            <Label htmlFor="source_college" className="text-sm font-normal">
              CollegeAdmin
            </Label>
          </div>
        </div>
      </div>
    </>
  );
}

function CouponForm({
  editing,
  onSubmit,
  open: _open,
  onOpenChange,
}: {
  editing: CouponRow | null;
  onSubmit: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<CouponFormData>(() => defaultFormData(editing));

  const updateField = <K extends keyof CouponFormData>(
    field: K,
    value: CouponFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEntityType = (type: SellableEntityType) => {
    const exists = form.applicable_entity_types.includes(type);
    if (exists) {
      updateField(
        'applicable_entity_types',
        form.applicable_entity_types.filter((t) => t !== type),
      );
    } else {
      updateField('applicable_entity_types', [...form.applicable_entity_types, type]);
    }
  };

  const toggleSource = (source: PurchaseSource) => {
    const exists = form.applicable_sources.includes(source);
    if (exists) {
      updateField(
        'applicable_sources',
        form.applicable_sources.filter((s) => s !== source),
      );
    } else {
      updateField('applicable_sources', [...form.applicable_sources, source]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    if (!form.discount_value || Number(form.discount_value) <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) {
      toast.error('Percentage discount cannot exceed 100');
      return;
    }

    if (!form.valid_from) {
      toast.error('Valid from date is required');
      return;
    }

    if (form.applicable_entity_types.length === 0) {
      toast.error('Select at least one entity type');
      return;
    }

    if (form.applicable_sources.length === 0) {
      toast.error('Select at least one source');
      return;
    }

    startTransition(async () => {
      try {
        if (editing) {
          const result = await updateCouponAction({
            id: editing.id,
            code: form.code,
            description: form.description || undefined,
            discount_type: form.discount_type,
            discount_value: Number(form.discount_value),
            max_uses: form.max_uses ? Number(form.max_uses) : null,
            max_uses_per_user: Number(form.max_uses_per_user),
            valid_from: form.valid_from,
            valid_until: form.valid_until || null,
            applicable_entity_types: form.applicable_entity_types,
            min_order_amount_minor: form.min_order_amount_minor ? Number(form.min_order_amount_minor) : null,
            applicable_sources: form.applicable_sources,
          });

          if (result.success) {
            toast.success('Coupon updated successfully');
            onOpenChange(false);
            onSubmit();
          } else {
            toast.error(result.error || 'Failed to update coupon');
          }
        } else {
          const result = await createCouponAction({
            code: form.code,
            description: form.description || undefined,
            discount_type: form.discount_type,
            discount_value: Number(form.discount_value),
            max_uses: form.max_uses ? Number(form.max_uses) : null,
            max_uses_per_user: Number(form.max_uses_per_user),
            valid_from: form.valid_from,
            valid_until: form.valid_until || null,
            applicable_entity_types: form.applicable_entity_types,
            min_order_amount_minor: form.min_order_amount_minor ? Number(form.min_order_amount_minor) : null,
            applicable_sources: form.applicable_sources,
          });

          if (result.success) {
            toast.success('Coupon created successfully');
            onOpenChange(false);
            onSubmit();
          } else {
            toast.error(result.error || 'Failed to create coupon');
          }
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        {/* Code */}
        <div className="space-y-2">
          <Label htmlFor="code">Coupon Code</Label>
          <Input
            id="code"
            placeholder="SUMMER2024"
            value={form.code}
            onChange={(e) => updateField('code', e.target.value.toUpperCase())}
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Summer sale 2024"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>

        {/* Discount Type and Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discount_type">Discount Type</Label>
            <Select
              value={form.discount_type}
              onValueChange={(v) => updateField('discount_type', v as 'fixed' | 'percentage')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount_value">
              Discount Value ({form.discount_type === 'percentage' ? '%' : 'Rs.'})
            </Label>
            <Input
              id="discount_value"
              type="number"
              min="0"
              placeholder="10"
              value={form.discount_value}
              onChange={(e) => updateField('discount_value', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Usage Limits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max_uses">Max Total Uses (optional)</Label>
            <Input
              id="max_uses"
              type="number"
              min="0"
              placeholder="Unlimited"
              value={form.max_uses}
              onChange={(e) => updateField('max_uses', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_uses_per_user">Max Uses Per User</Label>
            <Input
              id="max_uses_per_user"
              type="number"
              min="1"
              value={form.max_uses_per_user}
              onChange={(e) => updateField('max_uses_per_user', e.target.value)}
            />
          </div>
        </div>

        {/* Validity Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valid_from">Valid From</Label>
            <DatePicker
              value={form.valid_from ? new Date(form.valid_from + 'T00:00:00') : undefined}
              onChange={(date) => updateField('valid_from', date ? date.toISOString().split('T')[0] : '')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid Until (optional)</Label>
            <DatePicker
              value={form.valid_until ? new Date(form.valid_until + 'T00:00:00') : undefined}
              onChange={(date) => updateField('valid_until', date ? date.toISOString().split('T')[0] : '')}
            />
          </div>
        </div>

        {/* Min Order Amount */}
        <div className="space-y-2">
          <Label htmlFor="min_order_amount">Min Order Amount (Rs., optional)</Label>
          <Input
            id="min_order_amount"
            type="number"
            min="0"
            placeholder="No minimum"
            value={form.min_order_amount_minor}
            onChange={(e) => updateField('min_order_amount_minor', e.target.value)}
          />
        </div>

        <ApplicableEntitiesSection
          applicableEntityTypes={form.applicable_entity_types}
          applicableSources={form.applicable_sources}
          onToggleEntityType={toggleEntityType}
          onToggleSource={toggleSource}
          onSetEntityTypes={(types) => updateField('applicable_entity_types', types)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <RefreshCw className="mr-2 size-4 animate-spin" />}
          {editing ? 'Update Coupon' : 'Create Coupon'}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface CouponsClientProps {
  coupons: CouponRow[];
  stats: { active: number; totalUses: number; totalDiscount: number };
  mode: 'header-button' | 'empty-state' | 'edit' | 'toggle';
  coupon?: CouponRow;
}

export function CouponsClient({ mode, coupon }: CouponsClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggleStatus = async (couponId: string, currentStatus: CouponStatus) => {
    const enabled = currentStatus !== 'active';
    setToggling(true);
    try {
      const result = await toggleCouponStatusAction(couponId, enabled);
      if (result.success) {
        toast.success(enabled ? 'Coupon enabled' : 'Coupon disabled');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to toggle coupon');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setToggling(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!coupon) return;
    setDeleting(true);
    try {
      const result = await deleteCouponAction(coupon.id);
      if (result.success) {
        toast.success('Coupon deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete coupon');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleSubmit = () => {
    router.refresh();
  };

  if (mode === 'header-button') {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 size-4" />
            New Coupon
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>
              Set up a new discount coupon for the platform.
            </DialogDescription>
          </DialogHeader>
          <CouponForm
            editing={null}
            onSubmit={handleSubmit}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === 'empty-state') {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 size-4" />
            Create First Coupon
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>
              Set up your first discount coupon for the platform.
            </DialogDescription>
          </DialogHeader>
          <CouponForm
            editing={null}
            onSubmit={handleSubmit}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === 'edit' && coupon) {
    const isActive = coupon.status === 'active';

    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => setDialogOpen(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Toggle
          size="sm"
          disabled={toggling}
          pressed={isActive}
          onPressedChange={() => handleToggleStatus(coupon.id, coupon.status)}
          className={cn(
            'h-8 px-2.5 text-xs gap-1 font-semibold border shrink-0 data-[state=on]:bg-primary data-[state=on]:hover:bg-primary/90 data-[state=on]:text-primary-foreground data-[state=on]:border-primary',
            !isActive && 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950'
          )}
        >
          {toggling ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : isActive ? (
            <>
              <ToggleRight className="size-4 text-white" />
              <span>On</span>
            </>
          ) : (
            <>
              <ToggleLeft className="size-4" />
              <span>Off</span>
            </>
          )}
        </Toggle>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 border-red-200/50 hover:border-red-200 dark:border-red-900/50"
              disabled={deleting}
            >
              {deleting ? (
                <RefreshCw className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Coupon: {coupon.code}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this coupon? This action cannot be undone, and students will no longer be able to use it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Coupon: {coupon.code}</DialogTitle>
              <DialogDescription>
                Update the coupon settings.
              </DialogDescription>
            </DialogHeader>
            <CouponForm
              editing={coupon}
              onSubmit={handleSubmit}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
