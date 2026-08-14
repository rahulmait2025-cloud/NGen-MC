'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { toast } from 'sonner';
import { RefreshCw, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createAnnouncementAction, updateAnnouncementAction, deleteAnnouncementAction, toggleAnnouncementActiveAction } from './actions';

type AnnouncementType = 'text' | 'coupon' | 'custom_html';

interface AnnouncementRow {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string | null;
  html_content: string | null;
  cta_label: string | null;
  cta_url: string | null;
  coupon_id: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  coupons?: { code: string; discount_type: string; discount_value: number; valid_until: string | null } | null;
}

interface CouponOption {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface AnnouncementFormData {
  type: AnnouncementType;
  title: string;
  message: string;
  html_content: string;
  cta_label: string;
  cta_url: string;
  coupon_id: string;
  is_active: boolean;
  starts_at: Date;
  expires_at: Date | undefined;
}

function defaultFormData(editing?: AnnouncementRow | null): AnnouncementFormData {
  if (editing) {
    return {
      type: editing.type,
      title: editing.title,
      message: editing.message ?? '',
      html_content: editing.html_content ?? '',
      cta_label: editing.cta_label ?? 'Learn More',
      cta_url: editing.cta_url ?? '',
      coupon_id: editing.coupon_id ?? '',
      is_active: editing.is_active,
      starts_at: editing.starts_at ? new Date(editing.starts_at) : new Date(),
      expires_at: editing.expires_at ? new Date(editing.expires_at) : undefined,
    };
  }
  return {
    type: 'text',
    title: '',
    message: '',
    html_content: '',
    cta_label: 'Learn More',
    cta_url: '',
    coupon_id: '',
    is_active: false,
    starts_at: new Date(),
    expires_at: undefined,
  };
}

interface AnnouncementsClientProps {
  coupons: CouponOption[];
  mode: 'header-button' | 'empty-state' | 'edit' | 'toggle' | 'delete';
  announcement?: AnnouncementRow;
}

export function AnnouncementsClient({ coupons, mode, announcement }: AnnouncementsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (mode === 'toggle' && announcement) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-foreground"
        title={announcement.is_active ? 'Deactivate' : 'Activate'}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await toggleAnnouncementActiveAction(announcement.id, !announcement.is_active);
            if (result.success) {
              toast.success(announcement.is_active ? 'Announcement deactivated' : 'Announcement activated');
              router.refresh();
            } else {
              toast.error(result.error || 'Failed to toggle');
            }
          });
        }}
      >
        <Power className={cn('size-3.5', announcement.is_active ? 'text-emerald-500' : 'text-zinc-400')} />
      </Button>
    );
  }

  if (mode === 'delete' && announcement) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-red-500"
          title="Delete"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 className="size-3.5" />
        </Button>
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Announcement</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{announcement.title}&quot;? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteAnnouncementAction(announcement.id);
                    if (result.success) {
                      toast.success('Announcement deleted');
                      setDeleteConfirmOpen(false);
                      router.refresh();
                    } else {
                      toast.error(result.error || 'Failed to delete');
                    }
                  });
                }}
              >
                {isPending && <RefreshCw className="mr-2 size-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const isEditMode = mode === 'edit' && announcement;
  const buttonLabel = isEditMode ? undefined : 'New Announcement';

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        className={cn(
          isEditMode
            ? 'h-8 text-xs px-2.5 gap-1.5 text-muted-foreground hover:text-foreground'
            : 'gap-2'
        )}
        variant={isEditMode ? 'ghost' : 'default'}
        size={isEditMode ? 'icon' : 'default'}
      >
        {isEditMode ? <Pencil className="size-3.5" /> : <Plus className="size-4" />}
        {buttonLabel}
      </Button>
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={announcement ?? null}
        coupons={coupons}
        isPending={isPending}
        startTransition={startTransition}
        router={router}
      />
    </>
  );
}

function AnnouncementDialog({
  open,
  onOpenChange,
  editing,
  coupons,
  isPending,
  startTransition,
  router,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AnnouncementRow | null;
  coupons: CouponOption[];
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  router: ReturnType<typeof useRouter>;
}) {
  const [form, setForm] = useState<AnnouncementFormData>(() => defaultFormData(editing));

  const updateField = useCallback(<K extends keyof AnnouncementFormData>(field: K, value: AnnouncementFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (form.type === 'coupon' && !form.coupon_id) {
      toast.error('Please select a coupon for coupon-type announcements');
      return;
    }
    if (form.type === 'custom_html' && !form.html_content.trim()) {
      toast.error('HTML content is required for custom HTML announcements');
      return;
    }

    startTransition(async () => {
      try {
        const input = {
          type: form.type,
          title: form.title.trim(),
          message: form.type !== 'custom_html' ? (form.message.trim() || null) : null,
          html_content: form.type === 'custom_html' ? (form.html_content.trim() || null) : null,
          cta_label: form.cta_label.trim() || 'Learn More',
          cta_url: form.cta_url.trim() || null,
          coupon_id: form.type === 'coupon' ? (form.coupon_id || null) : null,
          is_active: form.is_active,
          starts_at: form.starts_at.toISOString(),
          expires_at: form.expires_at ? form.expires_at.toISOString() : null,
        };

        const result = editing
          ? await updateAnnouncementAction({ id: editing.id, ...input })
          : await createAnnouncementAction(input);

        if (result.success) {
          toast.success(editing ? 'Announcement updated' : 'Announcement created');
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to save');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }, [form, editing, onOpenChange, router, startTransition]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the announcement details below.' : 'Create a new global announcement banner for students.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="ann-type">Announcement Type</Label>
            <Select value={form.type} onValueChange={(v) => updateField('type', v as AnnouncementType)}>
              <SelectTrigger id="ann-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text + CTA Button</SelectItem>
                <SelectItem value="coupon">Coupon Promotion</SelectItem>
                <SelectItem value="custom_html">Custom HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. New Course Launch"
            />
          </div>

          {/* Text / Coupon fields */}
          {form.type !== 'custom_html' ? (
            <div className="space-y-2">
              <Label htmlFor="ann-message">Message</Label>
              <Textarea
                id="ann-message"
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="e.g. New Career Journey is Live — Build skills, projects, resume, GitHub, LinkedIn, and interview confidence."
                rows={3}
              />
            </div>
          ) : null}

          {/* Coupon picker */}
          {form.type === 'coupon' ? (
            <div className="space-y-2">
              <Label htmlFor="ann-coupon">Linked Coupon</Label>
              <Select value={form.coupon_id} onValueChange={(v) => updateField('coupon_id', v)}>
                <SelectTrigger id="ann-coupon"><SelectValue placeholder="Select a coupon" /></SelectTrigger>
                <SelectContent>
                  {coupons.length === 0 ? (
                    <SelectItem value="none" disabled>No active coupons</SelectItem>
                  ) : (
                    coupons.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${(c.discount_value / 100).toFixed(0)} off`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* HTML content */}
          {form.type === 'custom_html' ? (
            <div className="space-y-2">
              <Label htmlFor="ann-html">HTML Content</Label>
              <Textarea
                id="ann-html"
                value={form.html_content}
                onChange={(e) => updateField('html_content', e.target.value)}
                placeholder="<div>Your custom announcement HTML...</div>"
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Custom HTML is rendered as-is. Use inline styles for best results.
              </p>
            </div>
          ) : null}

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ann-cta-label">CTA Button Label</Label>
              <Input
                id="ann-cta-label"
                value={form.cta_label}
                onChange={(e) => updateField('cta_label', e.target.value)}
                placeholder="Learn More"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-cta-url">CTA URL (optional)</Label>
              <Input
                id="ann-cta-url"
                value={form.cta_url}
                onChange={(e) => updateField('cta_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Starts At</Label>
              <DateTimePicker
                value={form.starts_at}
                onChange={(date) => updateField('starts_at', date ?? new Date())}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <DateTimePicker
                value={form.expires_at}
                onChange={(date) => updateField('expires_at', date)}
              />
              <p className="text-[11px] text-muted-foreground">
                The countdown timer shows time remaining until this date.
              </p>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="ann-active"
              checked={form.is_active}
              onCheckedChange={(checked) => updateField('is_active', !!checked)}
            />
            <Label htmlFor="ann-active" className="text-sm font-normal cursor-pointer">
              Set as active announcement
            </Label>
          </div>
          {form.is_active ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 -mt-2">
              Activating this will deactivate any currently active announcement.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <RefreshCw className="mr-2 size-4 animate-spin" />}
              {editing ? 'Update Announcement' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
