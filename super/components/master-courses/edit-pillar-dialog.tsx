'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updatePillarAction } from '@/app/(app)/master-courses/actions';
import type { MasterCoursePillarsRow, MasterCoursePublishStatus } from '@/types/database';

interface EditPillarDialogProps {
  pillar: MasterCoursePillarsRow;
  trigger?: React.ReactNode;
}

interface PillarVisibilitySectionProps {
  values: { visible_to_college_admins: boolean; visible_to_college_students: boolean; visible_to_global_students: boolean };
  onVisibleChange: (key: string, value: boolean) => void;
}

function PillarVisibilitySection({ values, onVisibleChange }: PillarVisibilitySectionProps) {
  return (
    <div className="bg-muted/30 p-6 rounded-2xl space-y-5 border-2 border-border/40">
      <div className="space-y-1.5">
        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Visibility Context</h4>
        <p className="text-[11px] font-semibold text-muted-foreground/70 leading-normal">
          Determine which academic interfaces will list this pillar. Detailed content access is managed via assignments.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center justify-between rounded-xl border-2 border-border/40 p-3 bg-background hover:border-primary/40 transition-[border-color] cursor-pointer group">
          <Label htmlFor="vis-admins" className="text-[11px] font-black uppercase tracking-tight cursor-pointer group-hover:text-primary transition-colors">Admin Portal</Label>
          <Switch id="vis-admins" checked={values.visible_to_college_admins} onCheckedChange={(v) => onVisibleChange('visible_to_college_admins', v)} size="sm" />
        </div>
        <div className="flex items-center justify-between rounded-xl border-2 border-border/40 p-3 bg-background hover:border-primary/40 transition-[border-color] cursor-pointer group">
          <Label htmlFor="vis-students" className="text-[11px] font-black uppercase tracking-tight cursor-pointer group-hover:text-primary transition-colors">College Hub</Label>
          <Switch id="vis-students" checked={values.visible_to_college_students} onCheckedChange={(v) => onVisibleChange('visible_to_college_students', v)} size="sm" />
        </div>
        <div className="flex items-center justify-between rounded-xl border-2 border-border/40 p-3 bg-background hover:border-primary/40 transition-[border-color] cursor-pointer group">
          <Label htmlFor="vis-global" className="text-[11px] font-black uppercase tracking-tight cursor-pointer group-hover:text-primary transition-colors">Global Access</Label>
          <Switch id="vis-global" checked={values.visible_to_global_students} onCheckedChange={(v) => onVisibleChange('visible_to_global_students', v)} size="sm" />
        </div>
      </div>
    </div>
  );
}

export function EditPillarDialog({ pillar, trigger }: EditPillarDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [values, setValues] = useState(() => ({
    title: pillar.title,
    code: pillar.code,
    slug: pillar.slug,
    description: pillar.description || '',
    short_description: pillar.short_description || '',
    sort_order: pillar.sort_order,
    publish_status: pillar.publish_status,
    visible_to_college_admins: pillar.visible_to_college_admins,
    visible_to_college_students: pillar.visible_to_college_students,
    visible_to_global_students: pillar.visible_to_global_students,
  }));

  const [descriptionPoints, setDescriptionPoints] = useState<string[]>(() => {
    try {
      if (!pillar.description) return [''];
      const parsed = JSON.parse(pillar.description);
      if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : [''];
      return [pillar.description];
    } catch {
      return pillar.description ? [pillar.description] : [''];
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setValues(prev => ({
      ...prev,
      title,
    }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!values.title) newErrors.title = 'Title is required';
    if (!values.code) newErrors.code = 'Code is required';
    if (!values.slug) newErrors.slug = 'Slug is required';

    if (
      values.publish_status === 'published' &&
      !values.visible_to_college_students &&
      !values.visible_to_global_students
    ) {
      toast.error(
        'Published pillars must be visible to College Hub and/or Global Access so students can discover them in the LMS sidebar.',
      );
      return;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('pillar_id', pillar.id);
      Object.entries(values).forEach(([key, value]) => {
        if (key === 'description') return; // Handled below
        formData.append(key, String(value));
      });

      // Filter out empty points and stringify
      const validPoints = descriptionPoints.filter(p => p.trim() !== '');
      formData.append('description', JSON.stringify(validPoints));

      try {
        const result = await updatePillarAction(formData);
        if (result.ok) {
          toast.success('Pillar updated successfully');
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.error ?? 'Failed to update pillar');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5 h-8">
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-2 border-border/50 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Pencil className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                Edit Content Pillar
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground">
                Refine the metadata and access controls for this top-level category.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="col-span-2 space-y-2.5">
              <Label htmlFor="pillar-title" className="text-sm font-semibold text-foreground/80 ml-1">Pillar Title</Label>
              <Input
                id="pillar-title"
                placeholder="e.g. Technical Bootcamp"
                className="h-12 bg-background border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary/50 transition-[border-color,box-shadow] font-medium text-base"
                value={values.title}
                onChange={handleTitleChange}
                required
              />
              {errors.title && <p className="text-xs font-semibold text-destructive mt-1.5 ml-1 flex items-center gap-1.5 before:content-[''] before:size-1 before:bg-destructive before:rounded-full">{errors.title}</p>}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="pillar-code" className="text-sm font-semibold text-foreground/80 ml-1">Unique Code</Label>
              <Input
                id="pillar-code"
                placeholder="technical-bootcamp"
                className="h-11 bg-background border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary/50 font-mono text-xs font-semibold"
                value={values.code}
                onChange={(e) => setValues(prev => ({ ...prev, code: e.target.value }))}
                required
              />
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight ml-1">Internal unique identifier.</p>
              {errors.code && <p className="text-xs font-semibold text-destructive mt-1.5 ml-1 flex items-center gap-1.5 before:content-[''] before:size-1 before:bg-destructive before:rounded-full">{errors.code}</p>}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="pillar-slug" className="text-sm font-semibold text-foreground/80 ml-1">URL Slug</Label>
              <Input
                id="pillar-slug"
                placeholder="technical-bootcamp"
                className="h-11 bg-background border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary/50 font-mono text-xs font-semibold"
                value={values.slug}
                onChange={(e) => setValues(prev => ({ ...prev, slug: e.target.value }))}
                required
              />
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight ml-1">Used in public application routing.</p>
              {errors.slug && <p className="text-xs font-semibold text-destructive mt-1.5 ml-1 flex items-center gap-1.5 before:content-[''] before:size-1 before:bg-destructive before:rounded-full">{errors.slug}</p>}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="pillar-short-desc" className="text-sm font-semibold text-foreground/80 ml-1">Short Summary</Label>
            <Input
              id="pillar-short-desc"
              placeholder="Brief summary for display cards"
              className="h-11 bg-background border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary/50 font-medium"
              value={values.short_description}
              onChange={(e) => setValues(prev => ({ ...prev, short_description: e.target.value }))}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-sm font-semibold text-foreground/80">Pillar Objectives (Points)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDescriptionPoints(prev => [...prev, ''])}
                className="h-8 text-[10px] font-black uppercase tracking-widest border-2 hover:bg-primary hover:text-primary-foreground transition-[background-color,color,transform] duration-160 active:scale-95"
              >
                Add Point
              </Button>
            </div>
            
            <div className="space-y-3">
              {descriptionPoints.map((point, idx) => (
                <div key={point} className="flex gap-2">
                  <Input
                    placeholder={`Objective point ${idx + 1}...`}
                    className="h-11 bg-background border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary/50 font-medium"
                    value={point}
                    onChange={(e) => {
                      const newPoints = [...descriptionPoints];
                      newPoints[idx] = e.target.value;
                      setDescriptionPoints(newPoints);
                    }}
                  />
                  {descriptionPoints.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDescriptionPoints(prev => prev.filter((_, i) => i !== idx))}
                      className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Plus className="size-4 rotate-45 animate-in fade-in zoom-in duration-200" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight ml-1">
              Refine the list of objectives for this content pillar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground/80 ml-1">Publish Status</Label>
              <Select
                value={values.publish_status}
                onValueChange={(v) =>
                  setValues((prev) => ({ ...prev, publish_status: v as MasterCoursePublishStatus }))
                }
              >
                <SelectTrigger className="h-11 bg-background border-2 border-border/40 focus:ring-primary font-semibold">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-card border-2 border-border/50">
                  <SelectItem value="draft" className="font-semibold py-2.5">Draft</SelectItem>
                  <SelectItem value="published" className="font-semibold py-2.5 text-primary">Published</SelectItem>
                  <SelectItem value="unpublished" className="font-semibold py-2.5">Unpublished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="pillar-sort" className="text-sm font-semibold text-foreground/80 ml-1">Global Sort Priority</Label>
              <Input
                id="pillar-sort"
                type="number"
                className="h-11 bg-background border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary/50 font-semibold"
                value={values.sort_order}
                onChange={(e) => setValues(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <PillarVisibilitySection
            values={values}
            onVisibleChange={(key, val) => setValues(prev => ({ ...prev, [key]: val }))}
          />

          <DialogFooter className="gap-3 sm:gap-0 pt-4 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-semibold hover:bg-muted/50">
              Discard Changes
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-[background-color,transform] duration-160 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-px">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
