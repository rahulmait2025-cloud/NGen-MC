import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

export function CollegeUpdatedBanner() {
  return (
    <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
      <CheckCircle2 className="size-4 text-emerald-600" />
      <AlertDescription className="text-sm">
        Your college was updated. You are now on the correct institution portal.
      </AlertDescription>
    </Alert>
  );
}
