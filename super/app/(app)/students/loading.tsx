import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function StudentsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
