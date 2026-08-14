'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { repairCollegeCourseEntitlementsAction } from '@/app/(app)/master-courses/actions';

interface RepairEntitlementsButtonProps {
  collegeId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function RepairEntitlementsButton({ collegeId, variant = 'outline', size = 'sm' }: RepairEntitlementsButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleRepair() {
    startTransition(async () => {
      try {
        const result = await repairCollegeCourseEntitlementsAction(collegeId);
        if (result.ok && result.data) {
          const d = result.data;
          if (d.rpcUnavailable) {
             toast.error(d.rpcMessage || 'Entitlement repair RPC is missing.', {
               duration: 10000,
               description: 'Apply migration 00093 in the target database.'
             });
             return;
          }

          const msg = `Scanned ${d.assignmentsScanned} assignments. Created ${d.entitlementsCreated} new entitlements. ${d.entitlementsAlreadyExisting} already existed.`;
          toast.success('Repair process completed', {
            description: msg,
            duration: 5000
          });
        } else {
          toast.error(result.error || 'Failed to repair entitlements');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleRepair();
      }}
      className="gap-2"
    >
      <RefreshCw className={`size-3.5 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Repairing...' : 'Repair Entitlements'}
    </Button>
  );
}
