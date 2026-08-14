'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCollegeAction } from '@/app/(app)/colleges/actions';
import { cn } from '@/lib/utils';

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

interface CreateCollegeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCollegeDialog({ open, onOpenChange }: CreateCollegeDialogProps) {
  const { refresh } = useRouter();
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createPending, setCreatePending] = useState(false);
  const createFormRef = useRef<HTMLFormElement | null>(null);
  const [collegeStatus, setCollegeStatus] = useState<string>('active');

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatePending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await createCollegeAction(formData);
    setCreatePending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`College created: ${result.slug}`);
    onOpenChange(false);
    setCreateStep(1);
    form.reset();
    refresh();
  };

  const handleNextCreateStep = () => {
    const form = createFormRef.current;
    if (!form) return;

    const nameInput = form.querySelector<HTMLInputElement>('input[name="name"]');
    const slugInput = form.querySelector<HTMLInputElement>('input[name="slug"]');
    if (!nameInput?.reportValidity()) return;
    if (!slugInput?.reportValidity()) return;
    setCreateStep(2);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setCreateStep(1);
      }}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>New College</DialogTitle>
        </DialogHeader>
        <form ref={createFormRef} onSubmit={handleCreateSubmit} className='space-y-4'>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span className={cn('rounded-full px-2 py-0.5 border', createStep === 1 ? 'border-primary text-foreground' : 'border-border')}>1. College</span>
            <span className={cn('rounded-full px-2 py-0.5 border', createStep === 2 ? 'border-primary text-foreground' : 'border-border')}>2. Admin (optional)</span>
          </div>

          <div className={createStep === 1 ? 'space-y-4' : 'hidden'}>
            <div>
              <label htmlFor='create-name' className='mb-1 block text-xs font-medium'>Name</label>
              <Input
                id='create-name'
                name='name'
                required
                placeholder='College name'
                className='h-9'
                onChange={(event) => {
                  const slugEl = event.currentTarget.form?.querySelector<HTMLInputElement>('input[name="slug"]');
                  if (slugEl && !slugEl.dataset.touched) slugEl.value = slugFromName(event.currentTarget.value);
                }}
              />
            </div>
            <div>
              <label htmlFor='create-slug' className='mb-1 block text-xs font-medium'>Slug (URL)</label>
              <Input
                id='create-slug'
                name='slug'
                required
                placeholder='college-slug'
                className='h-9 font-mono'
                onChange={(event) => {
                  event.currentTarget.dataset.touched = '1';
                }}
              />
            </div>
            <div>
              <label htmlFor='create-short_name' className='mb-1 block text-xs font-medium'>Short name (optional)</label>
              <Input id='create-short_name' name='short_name' placeholder='Short name' className='h-9' />
            </div>
            <div>
              <label htmlFor='create-status' className='mb-1 block text-xs font-medium'>Status</label>
              <Select value={collegeStatus} onValueChange={setCollegeStatus}>
                <SelectTrigger id="create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={collegeStatus} />
            </div>
            <div>
              <label htmlFor='create-support_email' className='mb-1 block text-xs font-medium'>Support email (optional)</label>
              <Input id='create-support_email' name='support_email' type='email' placeholder='support@college.edu' className='h-9' />
            </div>
            <div>
              <label htmlFor='create-support_phone' className='mb-1 block text-xs font-medium'>Support phone (optional)</label>
              <Input id='create-support_phone' name='support_phone' placeholder='+1 234 567 8900' className='h-9' />
            </div>
          </div>

          <div className={createStep === 2 ? 'rounded-lg border border-border bg-muted/20 p-3 space-y-3' : 'hidden'}>
            <p className='text-xs font-semibold'>Optional: Create first college admin now</p>
            <Input name='admin_email' type='email' placeholder='admin@college.edu' className='h-9' />
            <Input name='admin_full_name' placeholder='Admin full name' className='h-9' />
            <Input name='admin_password' type='password' minLength={8} placeholder='Leave blank to generate invite link' className='h-9' />
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {createStep === 1 ? (
              <Button type='button' onClick={handleNextCreateStep}>
                Next
              </Button>
            ) : (
              <>
                <Button type='button' variant='outline' onClick={() => setCreateStep(1)}>
                  Back
                </Button>
                <Button type='submit' disabled={createPending}>
                  {createPending ? 'Creating...' : 'Create'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
