import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-4 w-[400px]" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden border-border/40">
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-8 w-[100px] rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          <div className="hidden sm:grid sm:grid-cols-4 gap-4 p-4 bg-muted/10">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`h-${i}`} className="h-4 w-full" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={`row-${i}`} className="flex flex-col sm:grid sm:grid-cols-4 gap-4 p-4">
              <div className="space-y-2 sm:space-y-0">
                <Skeleton className="h-4 w-[120px] sm:hidden mb-2" />
                <Skeleton className="h-5 w-[140px]" />
              </div>
              <Skeleton className="h-4 w-[100px] hidden sm:block" />
              <Skeleton className="h-4 w-[80px] hidden sm:block" />
              <div className="flex justify-end items-center">
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
