'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateNonPartneredStudentCollege } from '@/lib/actions/update-non-partnered-student-college';
import { School, Loader2 } from 'lucide-react';

export function B2cSelfReportedCollegeSection({
  collegeSlug,
  initialSelfReported,
}: {
  collegeSlug: string;
  initialSelfReported: string | null;
}) {
  const { refresh } = useRouter();
  const [collegeName, setCollegeName] = useState(initialSelfReported ?? '');
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    const v = collegeName.trim();
    if (!v) {
      toast.error('Enter your college or university name.');
      return;
    }
    startTransition(async () => {
      const result = await updateNonPartneredStudentCollege(collegeSlug, v);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Saved. Your learning account stays on the direct learner portal.');
      refresh();
    });
  };

  return (
    <div
      id='b2c-self-reported-college'
      className='rounded-xl border border-primary/10 bg-primary/[0.02] px-6 py-5 scroll-mt-24'
    >
      <h2 className='text-sm font-semibold text-primary flex items-center gap-2'>
        <School className='size-4 text-primary' />
        Tell us your college
      </h2>
      <p className='text-sm text-muted-foreground mt-1.5'>
        This helps us understand where you study. It is saved for our team and does{' '}
        <span className='font-medium text-foreground'>not</span> change your account type
        automatically, move you to a different login page, or enroll you at a partnered
        institution.
      </p>
      <div className='mt-4 space-y-3'>
        <div className='space-y-1.5 max-w-lg'>
          <Label htmlFor='b2c-college-name' className='text-xs text-muted-foreground'>College or university name</Label>
          <Input
            id='b2c-college-name'
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder='e.g. Indian Institute of Technology Delhi'
            className='w-full'
            disabled={pending}
            autoComplete='organization'
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
          <p className='text-xs text-muted-foreground'>
            You can update this anytime. Use the name you usually use for your school.
          </p>
        </div>
        <Button
          type='button'
          onClick={handleSubmit}
          disabled={pending || !collegeName.trim()}
          className='gap-2'
        >
          {pending ? (
            <>
              <div className='animate-spin'><Loader2 className='size-4' /></div>
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
}
