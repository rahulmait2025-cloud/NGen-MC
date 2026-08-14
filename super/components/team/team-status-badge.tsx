import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TeamStatusBadge({
  isPublished,
  className,
}: {
  isPublished: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800',
        className,
      )}
    >
      {isPublished ? 'Published' : 'Draft'}
    </Badge>
  );
}

export function TeamFounderBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('border-primary/30 text-primary', className)}>
      Founder
    </Badge>
  );
}

export function TeamFeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn('bg-orange-100 text-orange-800', className)}>
      Featured
    </Badge>
  );
}
