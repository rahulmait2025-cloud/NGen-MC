'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { enrollFreeCourseAction } from '../actions';


interface FreeEnrollmentButtonProps {
  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
}

export function FreeEnrollmentButton({
  collegeSlug,
  pillarSlug,
  courseId,
}: FreeEnrollmentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { requireAuth } = useAuthGate();

  const handleEnroll = () => {
    if (!requireAuth({ intent: 'Enroll', returnTo: typeof window !== 'undefined' ? window.location.href : '' })) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await enrollFreeCourseAction(collegeSlug, pillarSlug, courseId);
        if (res.ok) {
          toast.success('Enrolled successfully.');
          router.push(`/c/${collegeSlug}/student/payment-success?courseId=${courseId}&enrollment=free`);
        } else {
          toast.error(res.error ?? 'Failed to enroll');
        }
      } catch {
        toast.error('Could not complete enrollment. Try again.');
      }
    });
  };


  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
          <Rocket className="size-3 text-emerald-500" />
          <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Free Access</span>
        </div>
      <div className="text-4xl font-bold tracking-tighter flex items-center justify-center gap-1 text-foreground">
          <span>FREE</span>
        </div>
      </div>

      <Button
        onClick={handleEnroll}
        disabled={isPending}
        className="rounded-full w-full font-bold px-8 h-12 text-lg shadow-lg hover:shadow-xl transition-[box-shadow,transform] duration-200 bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {isPending ? (
          <>
            <div className="animate-spin"><Loader2 className="h-5 w-5 mr-2" /></div>
            Enrolling...
          </>
        ) : (
          <>
            <PlayCircle className="h-5 w-5 mr-2" />
            Start Learning Free
          </>
        )}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-wider">
        No payment required. Instant access.
      </p>
    </div>
  );
}
