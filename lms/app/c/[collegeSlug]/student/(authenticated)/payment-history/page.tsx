import { Suspense } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { listStudentOrders } from '@/lib/services/payment-history';
import { PaymentHistoryContent } from './payment-history-content';
import { Receipt } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default async function PaymentHistoryPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;

  return (
    <div className="max-w-7xl mx-auto space-y-8">


      <Suspense fallback={<PaymentHistorySkeleton />}>
        <PaymentHistoryList collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}

async function PaymentHistoryList({ collegeSlug }: { collegeSlug: string }) {
  const studentCtx = await requireStudent(collegeSlug);
  const rows = await listStudentOrders(studentCtx.user.id);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Receipt />}
        title="No transactions yet"
        description="When you purchase a course or bundle, your payment history will appear here."
        action={
          <Button asChild>
            <Link href={`/c/${collegeSlug}/student/courses`}>
              Browse Courses
            </Link>
          </Button>
        }
      />
    );
  }

  return <PaymentHistoryContent rows={rows} />;
}

function PaymentHistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border border-border/60 rounded-xl p-6 bg-card/50 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
