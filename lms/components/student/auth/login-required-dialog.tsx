'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface LoginRequiredDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function LoginRequiredDialog({
  isOpen,
  onOpenChange,
  title = 'Login to continue',
  description = 'Login to continue where you left off.',
}: LoginRequiredDialogProps) {
  const router = useRouter();

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[120]"
        className="z-[120] gap-5 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[0_4px_24px_oklch(0_0_0/0.06)] sm:max-w-md"
      >
        <DialogHeader className="gap-2 text-center sm:text-center">
          <DialogTitle className="text-balance text-xl font-semibold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-col-reverse items-stretch gap-2 sm:flex-row sm:!justify-center sm:items-center">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full px-6 sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full px-7 font-medium sm:w-auto"
            onClick={handleLoginRedirect}
          >
            Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
