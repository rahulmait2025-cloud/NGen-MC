'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { revokeOrderAccessAction } from '../actions';
import { ShieldAlert } from 'lucide-react';

export function RevokeAccessButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    setIsOpen(false);
    startTransition(async () => {
      try {
        const result = await revokeOrderAccessAction(orderId);
        if (result.success) {
          toast.success('Access revoked successfully');
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to revoke access');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <>
      <Button 
        variant="destructive" 
        size="sm" 
        className="font-semibold uppercase text-[10px] tracking-widest gap-2"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
      >
        <ShieldAlert className="size-3.5" />
        {isPending ? 'Revoking...' : 'Revoke Access'}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-semibold uppercase tracking-tight">Revoke Course Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove the student&apos;s access to all content purchased in this order. This action is logged and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-semibold uppercase text-[10px] tracking-widest">Go Back</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white border-none font-semibold uppercase text-[10px] tracking-widest"
              onClick={handleRevoke}
            >
              Confirm Revocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
